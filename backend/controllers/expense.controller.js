import mongoose from 'mongoose';
import Expense from '../models/Expense.js';
import Settlement from '../models/Settlement.js';
import {
  rupeesToPaise,
  paiseToRupees,
  calculateEqualSplits,
  calculatePercentageSplits,
} from '../utils/paise.js';

function formatExpenseResponse(exp) {
  const obj = exp.toObject ? exp.toObject() : { ...exp };
  obj.amountRupees = paiseToRupees(obj.amountPaise);
  if (Array.isArray(obj.splits)) {
    obj.splits = obj.splits.map((s) => ({
      ...s,
      amountRupees: paiseToRupees(s.amountPaise),
    }));
  }
  return obj;
}

export async function addExpense(req, res) {
  try {
    const group = req.group;
    const {
      description,
      category,
      expenseType = 'one-off',
      splitType = 'equal',
      paidBy: inputPaidBy,
      amountPaise: inputAmountPaise,
      amountRupees: inputAmountRupees,
      splits: inputSplits,
      splitWith: inputSplitWith,
      date,
    } = req.body;

    if (!description || !category) {
      return res.status(400).json({
        success: false,
        message: 'Description and category are required',
      });
    }

    let amountPaise = inputAmountPaise;
    if (amountPaise === undefined && inputAmountRupees !== undefined) {
      amountPaise = rupeesToPaise(inputAmountRupees);
    }

    if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive integer in paise (or valid rupees)',
      });
    }

    const paidBy = inputPaidBy || req.user._id.toString();
    const isPayerMember = group.members.some((m) => m.toString() === paidBy.toString());
    if (!isPayerMember) {
      return res.status(400).json({
        success: false,
        message: 'Payer must be a member of this group',
      });
    }

    let computedSplits = [];

    if (splitType === 'equal') {
      const participantIds = inputSplitWith && inputSplitWith.length > 0
        ? inputSplitWith.map(String)
        : group.members.map((m) => m.toString());

      const allMembers = participantIds.every((id) =>
        group.members.some((m) => m.toString() === id)
      );
      if (!allMembers) {
        return res.status(400).json({
          success: false,
          message: 'All split participants must be group members',
        });
      }

      computedSplits = calculateEqualSplits(amountPaise, participantIds);
    } else if (splitType === 'percentage') {
      if (!Array.isArray(inputSplits) || inputSplits.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Percentage splits array is required for percentage splitType',
        });
      }

      const allMembers = inputSplits.every((s) =>
        group.members.some((m) => m.toString() === (s.user._id || s.user).toString())
      );
      if (!allMembers) {
        return res.status(400).json({
          success: false,
          message: 'All split participants must be group members',
        });
      }

      const percentageSum = inputSplits.reduce((acc, s) => acc + (s.percentage || 0), 0);
      if (Math.abs(percentageSum - 100) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `Split percentages must sum to 100 (got ${percentageSum})`,
        });
      }

      computedSplits = calculatePercentageSplits(amountPaise, inputSplits);
    } else if (splitType === 'custom') {
      if (!Array.isArray(inputSplits) || inputSplits.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Custom splits array is required for custom splitType',
        });
      }

      let totalCustomPaise = 0;
      for (const s of inputSplits) {
        let sAmount = s.amountPaise;
        if (sAmount === undefined && s.amountRupees !== undefined) {
          sAmount = rupeesToPaise(s.amountRupees);
        }
        if (!Number.isInteger(sAmount) || sAmount < 0) {
          return res.status(400).json({
            success: false,
            message: `Invalid split amount for user ${s.user}`,
          });
        }
        totalCustomPaise += sAmount;
        computedSplits.push({
          user: s.user._id || s.user,
          amountPaise: sAmount,
        });
      }

      if (totalCustomPaise !== amountPaise) {
        return res.status(400).json({
          success: false,
          message: `Sum of custom splits (${totalCustomPaise} paise) does not match total expense amount (${amountPaise} paise)`,
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid splitType. Expected equal, percentage, or custom',
      });
    }

    const expense = await Expense.create({
      group: group._id,
      createdBy: req.user._id,
      paidBy,
      amountPaise,
      description: description.trim(),
      category,
      expenseType,
      splitType,
      splits: computedSplits,
      date: date ? new Date(date) : new Date(),
    });

    await Settlement.updateMany(
      { group: group._id, status: 'pending' },
      { status: 'stale', isStale: true }
    );

    const populatedExpense = await Expense.findById(expense._id)
      .populate('createdBy', 'name email upiId')
      .populate('paidBy', 'name email upiId')
      .populate('splits.user', 'name email upiId');

    return res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      expense: formatExpenseResponse(populatedExpense),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create expense',
      error: error.message,
    });
  }
}

export async function listExpenses(req, res) {
  try {
    const expenses = await Expense.find({
      group: req.params.groupId,
      deletedAt: null,
    })
      .populate('createdBy', 'name email upiId')
      .populate('paidBy', 'name email upiId')
      .populate('splits.user', 'name email upiId')
      .sort({ date: -1, createdAt: -1 });

    const formattedExpenses = expenses.map(formatExpenseResponse);

    return res.status(200).json({
      success: true,
      count: formattedExpenses.length,
      expenses: formattedExpenses,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to list expenses',
      error: error.message,
    });
  }
}

export async function updateExpense(req, res) {
  try {
    const { groupId, expenseId } = req.params;
    const group = req.group;

    if (!mongoose.Types.ObjectId.isValid(expenseId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid expense ID',
      });
    }

    const expense = await Expense.findOne({
      _id: expenseId,
      group: groupId,
      deletedAt: null,
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found in this group',
      });
    }

    const creatorId = expense.createdBy ? expense.createdBy.toString() : expense.paidBy.toString();
    if (creatorId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the member who added this expense can edit it',
      });
    }

    const {
      description,
      category,
      expenseType,
      splitType,
      paidBy: inputPaidBy,
      amountPaise: inputAmountPaise,
      amountRupees: inputAmountRupees,
      splits: inputSplits,
      splitWith: inputSplitWith,
      date,
    } = req.body;

    if (description !== undefined) {
      if (!description.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Description cannot be empty',
        });
      }
      expense.description = description.trim();
    }

    if (category !== undefined) {
      expense.category = category;
    }

    if (expenseType !== undefined) {
      expense.expenseType = expenseType;
    }

    if (date !== undefined) {
      expense.date = new Date(date);
    }

    let finalAmountPaise = expense.amountPaise;
    if (inputAmountPaise !== undefined) {
      finalAmountPaise = inputAmountPaise;
    } else if (inputAmountRupees !== undefined) {
      finalAmountPaise = rupeesToPaise(inputAmountRupees);
    }

    if (!Number.isInteger(finalAmountPaise) || finalAmountPaise <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive integer in paise (or valid rupees)',
      });
    }

    if (inputPaidBy !== undefined) {
      const isPayerMember = group.members.some((m) => m.toString() === inputPaidBy.toString());
      if (!isPayerMember) {
        return res.status(400).json({
          success: false,
          message: 'Payer must be a member of this group',
        });
      }
      expense.paidBy = inputPaidBy;
    }

    const currentSplitType = splitType || expense.splitType;
    expense.splitType = currentSplitType;
    expense.amountPaise = finalAmountPaise;

    let computedSplits = [];
    if (currentSplitType === 'equal') {
      const participantIds = inputSplitWith && inputSplitWith.length > 0
        ? inputSplitWith.map(String)
        : group.members.map((m) => m.toString());

      computedSplits = calculateEqualSplits(finalAmountPaise, participantIds);
    } else if (currentSplitType === 'percentage') {
      const splitsSource = inputSplits || expense.splits;
      if (!Array.isArray(splitsSource) || splitsSource.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Percentage splits array is required',
        });
      }
      computedSplits = calculatePercentageSplits(finalAmountPaise, splitsSource);
    } else if (currentSplitType === 'custom') {
      const splitsSource = inputSplits || expense.splits;
      if (!Array.isArray(splitsSource) || splitsSource.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Custom splits array is required',
        });
      }

      let totalCustomPaise = 0;
      for (const s of splitsSource) {
        let sAmount = s.amountPaise;
        if (sAmount === undefined && s.amountRupees !== undefined) {
          sAmount = rupeesToPaise(s.amountRupees);
        }
        totalCustomPaise += sAmount;
        computedSplits.push({
          user: s.user._id || s.user,
          amountPaise: sAmount,
        });
      }

      if (totalCustomPaise !== finalAmountPaise) {
        return res.status(400).json({
          success: false,
          message: `Sum of custom splits (${totalCustomPaise} paise) does not match total expense amount (${finalAmountPaise} paise)`,
        });
      }
    }

    expense.splits = computedSplits;
    await expense.save();

    await Settlement.updateMany(
      { group: group._id, status: 'pending' },
      { status: 'stale', isStale: true }
    );

    const populatedExpense = await Expense.findById(expense._id)
      .populate('createdBy', 'name email upiId')
      .populate('paidBy', 'name email upiId')
      .populate('splits.user', 'name email upiId');

    return res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      expense: formatExpenseResponse(populatedExpense),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update expense',
      error: error.message,
    });
  }
}

export async function deleteExpense(req, res) {
  try {
    const { groupId, expenseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(expenseId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid expense ID',
      });
    }

    const expense = await Expense.findOne({
      _id: expenseId,
      group: groupId,
      deletedAt: null,
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found or already deleted',
      });
    }

    const creatorId = expense.createdBy ? expense.createdBy.toString() : expense.paidBy.toString();
    if (creatorId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the member who added this expense can delete it',
      });
    }

    expense.deletedAt = new Date();
    await expense.save();

    await Settlement.updateMany(
      { group: groupId, status: 'pending' },
      { status: 'stale', isStale: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Expense soft-deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete expense',
      error: error.message,
    });
  }
}
