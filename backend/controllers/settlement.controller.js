import mongoose from 'mongoose';
import Expense from '../models/Expense.js';
import Settlement from '../models/Settlement.js';
import User from '../models/User.js';
import { computeNetBalances, computeMemberBreakdown } from '../services/balanceEngine.js';
import { simplifyDebts } from '../services/debtSimplifier.js';
import { paiseToRupees, rupeesToPaise } from '../utils/paise.js';

function formatSettlementResponse(st) {
  const obj = st.toObject ? st.toObject() : { ...st };
  obj.amountRupees = paiseToRupees(obj.amountPaise);
  return obj;
}

export async function getBalances(req, res) {
  try {
    const groupId = req.params.groupId;
    const group = req.group;

    const [expenses, settlements, users] = await Promise.all([
      Expense.find({ group: groupId, deletedAt: null }),
      Settlement.find({ group: groupId, status: 'paid' }),
      User.find({ _id: { $in: group.members } }).select('name email upiId'),
    ]);

    const breakdown = computeMemberBreakdown(expenses, settlements, group.members);
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    let groupTotalPaise = 0;
    for (const exp of expenses) {
      groupTotalPaise += exp.amountPaise;
    }

    const memberBalances = breakdown.map((item) => {
      const userDoc = userMap.get(item.userId) || { _id: item.userId, name: 'Unknown', email: '' };
      return {
        user: userDoc,
        netBalancePaise: item.netBalancePaise,
        netBalanceRupees: paiseToRupees(item.netBalancePaise),
        totalPaidPaise: item.totalPaidPaise,
        totalPaidRupees: paiseToRupees(item.totalPaidPaise),
        totalOwedPaise: item.totalOwedPaise,
        totalOwedRupees: paiseToRupees(item.totalOwedPaise),
        status: item.status,
      };
    });

    return res.status(200).json({
      success: true,
      groupTotalPaise,
      groupTotalRupees: paiseToRupees(groupTotalPaise),
      balances: memberBalances,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to compute balances',
      error: error.message,
    });
  }
}

export async function suggestSettlements(req, res) {
  try {
    const groupId = req.params.groupId;
    const group = req.group;

    const [expenses, settlements, users] = await Promise.all([
      Expense.find({ group: groupId, deletedAt: null }),
      Settlement.find({ group: groupId, status: 'paid' }),
      User.find({ _id: { $in: group.members } }).select('name email upiId'),
    ]);

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const netBalances = computeNetBalances(expenses, settlements, group.members);

    const simplificationResult = simplifyDebts(netBalances);

    await Settlement.updateMany(
      { group: groupId, status: 'pending' },
      { status: 'stale', isStale: true }
    );

    const now = new Date();
    const createdPendingSettlements = [];

    for (const txn of simplificationResult.transactions) {
      const doc = await Settlement.create({
        group: groupId,
        payer: txn.payer,
        payee: txn.payee,
        amountPaise: txn.amountPaise,
        status: 'pending',
        method: 'upi',
        computedAt: now,
        isStale: false,
      });

      const populated = await Settlement.findById(doc._id)
        .populate('payer', 'name email upiId')
        .populate('payee', 'name email upiId');

      createdPendingSettlements.push(formatSettlementResponse(populated));
    }

    return res.status(200).json({
      success: true,
      solverMethod: simplificationResult.solverUsed,
      solverUsed: simplificationResult.solverUsed,
      transactions: createdPendingSettlements,
      settlements: createdPendingSettlements,
      summary: {
        totalTransactions: simplificationResult.totalTransactions,
        solverUsed: simplificationResult.solverUsed,
        isOptimal: simplificationResult.isOptimal,
        fallbackToGreedy: simplificationResult.fallbackToGreedy,
        memberCount: simplificationResult.memberCount,
        maxOptimalMembers: simplificationResult.maxOptimalMembers,
        transactionsSaved: simplificationResult.transactionsSaved || 0,
        note: simplificationResult.note,
        computedAt: now,
      },
    });
  } catch (error) {
    console.error('[suggestSettlements error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate settlement suggestions',
      error: error.message,
    });
  }
}

export async function confirmSettlement(req, res) {
  try {
    const groupId = req.params.groupId;
    const {
      settlementId,
      payer,
      payee,
      amountPaise: inputPaise,
      amountRupees: inputRupees,
      method = 'upi',
    } = req.body;

    let confirmedDoc;

    if (settlementId) {
      if (!mongoose.Types.ObjectId.isValid(settlementId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid settlement ID format',
        });
      }

      const settlement = await Settlement.findOne({
        _id: settlementId,
        group: groupId,
      });

      if (!settlement) {
        return res.status(404).json({
          success: false,
          message: 'Settlement record not found in this group',
        });
      }

      const payerId = settlement.payer ? settlement.payer.toString() : '';
      if (payerId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Only the payer who owes this amount can confirm payment',
        });
      }

      if (settlement.status === 'paid') {
        return res.status(400).json({
          success: false,
          message: 'Settlement is already confirmed as paid and is immutable',
        });
      }

      if (settlement.isStale || settlement.status === 'stale') {
        return res.status(400).json({
          success: false,
          message:
            'This settlement suggestion is stale because new expenses were added or modified. Please generate fresh suggestions.',
        });
      }

      settlement.status = 'paid';
      settlement.settledAt = new Date();
      settlement.method = method;
      await settlement.save();

      confirmedDoc = await Settlement.findById(settlement._id)
        .populate('payer', 'name email upiId')
        .populate('payee', 'name email upiId');
    } else {
      if (!payer || !payee) {
        return res.status(400).json({
          success: false,
          message: 'Payer and payee are required for direct settlement creation',
        });
      }

      const directPayerId = (payer._id || payer).toString();
      if (directPayerId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Only the payer who owes this amount can confirm payment',
        });
      }

      let amountPaise = inputPaise;
      if (amountPaise === undefined && inputRupees !== undefined) {
        amountPaise = rupeesToPaise(inputRupees);
      }

      if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Settlement amount must be a positive integer in paise',
        });
      }

      const now = new Date();
      const settlement = await Settlement.create({
        group: groupId,
        payer,
        payee,
        amountPaise,
        status: 'paid',
        method,
        settledAt: now,
        computedAt: now,
        isStale: false,
      });

      confirmedDoc = await Settlement.findById(settlement._id)
        .populate('payer', 'name email upiId')
        .populate('payee', 'name email upiId');
    }

    return res.status(200).json({
      success: true,
      message: 'Settlement confirmed and marked as paid (record is now immutable)',
      settlement: formatSettlementResponse(confirmedDoc),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to confirm settlement',
      error: error.message,
    });
  }
}

export async function listSettlements(req, res) {
  try {
    const { status } = req.query;
    const query = { group: req.params.groupId };

    if (status) {
      query.status = status;
    }

    const settlements = await Settlement.find(query)
      .populate('payer', 'name email upiId')
      .populate('payee', 'name email upiId')
      .sort({ createdAt: -1 });

    const formatted = settlements.map(formatSettlementResponse);

    return res.status(200).json({
      success: true,
      count: formatted.length,
      settlements: formatted,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to list settlements',
      error: error.message,
    });
  }
}
