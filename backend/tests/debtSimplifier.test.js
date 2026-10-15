import {
  simplifyDebts,
  greedySolver,
  optimalSolver,
} from '../services/debtSimplifier.js';
import {
  rupeesToPaise,
  paiseToRupees,
  calculateEqualSplits,
  calculatePercentageSplits,
} from '../utils/paise.js';

describe('Debt Simplifier Unit Tests', () => {
  function verifySettlement(initialBalances, transactions) {
    const balanceCopy = { ...initialBalances };

    for (const txn of transactions) {
      expect(Number.isInteger(txn.amountPaise)).toBe(true);
      expect(txn.amountPaise).toBeGreaterThan(0);

      balanceCopy[txn.payer] = (balanceCopy[txn.payer] || 0) + txn.amountPaise;
      balanceCopy[txn.payee] = (balanceCopy[txn.payee] || 0) - txn.amountPaise;
    }

    for (const [user, bal] of Object.entries(balanceCopy)) {
      expect(bal).toBe(0);
    }
  }

  test('3-person hand-computed example: Alice (+20000), Bob (-10000), Charlie (-10000)', () => {
    const balances = {
      Alice: 20000,
      Bob: -10000,
      Charlie: -10000,
    };

    const result = simplifyDebts(balances);

    expect(result.solverUsed).toBe('optimal');
    expect(result.isOptimal).toBe(true);
    expect(result.fallbackToGreedy).toBe(false);
    expect(result.totalTransactions).toBe(2);

    verifySettlement(balances, result.transactions);

    const payers = result.transactions.map((t) => t.payer).sort();
    expect(payers).toEqual(['Bob', 'Charlie']);
    result.transactions.forEach((t) => {
      expect(t.payee).toBe('Alice');
      expect(t.amountPaise).toBe(10000);
    });
  });

  test('4-person hand-computed example: A (+3000), B (+1000), C (-2000), D (-2000)', () => {
    const balances = {
      A: 3000,
      B: 1000,
      C: -2000,
      D: -2000,
    };

    const result = simplifyDebts(balances);

    expect(result.solverUsed).toBe('optimal');
    expect(result.isOptimal).toBe(true);
    expect(result.memberCount).toBe(4);
    expect(result.totalTransactions).toBe(3);

    verifySettlement(balances, result.transactions);
  });

  test('Case where greedy and optimal give the same result: 2 disjoint pairs', () => {
    const balances = {
      A: -5000,
      B: -3000,
      C: 5000,
      D: 3000,
    };

    const greedy = greedySolver([
      { userId: 'A', balance: -5000 },
      { userId: 'B', balance: -3000 },
      { userId: 'C', balance: 5000 },
      { userId: 'D', balance: 3000 },
    ]);

    const result = simplifyDebts(balances);

    expect(greedy.length).toBe(2);
    expect(result.totalTransactions).toBe(2);
    expect(result.greedyTransactionCount).toBe(2);
    expect(result.transactionsSaved).toBe(0);

    verifySettlement(balances, result.transactions);
    verifySettlement(balances, greedy);
  });

  test('Case where greedy is suboptimal and optimal solver wins: 5 members with partition {A,E} and {B,C,D}', () => {
    const balances = {
      A: -4000,
      B: -3000,
      C: -2000,
      D: 5000,
      E: 4000,
    };

    const memberList = [
      { userId: 'A', balance: -4000 },
      { userId: 'B', balance: -3000 },
      { userId: 'C', balance: -2000 },
      { userId: 'D', balance: 5000 },
      { userId: 'E', balance: 4000 },
    ];

    const greedyTxns = greedySolver(memberList);
    const optimalTxns = optimalSolver(memberList);
    const result = simplifyDebts(balances);

    expect(greedyTxns.length).toBe(4);
    expect(optimalTxns.length).toBe(3);
    expect(result.totalTransactions).toBe(3);
    expect(result.solverUsed).toBe('optimal');
    expect(result.transactionsSaved).toBe(1);

    verifySettlement(balances, result.transactions);
    verifySettlement(balances, greedyTxns);
  });

  test('Case with >8 nonzero balances (verify greedy fallback triggers)', () => {
    const balances = {
      user1: -1000,
      user2: -2000,
      user3: -3000,
      user4: -4000,
      user5: 1000,
      user6: 1500,
      user7: 2000,
      user8: 2500,
      user9: 3000,
    };

    const result = simplifyDebts(balances);

    expect(result.memberCount).toBe(9);
    expect(result.fallbackToGreedy).toBe(true);
    expect(result.solverUsed).toBe('greedy');
    expect(result.isOptimal).toBe(false);
    expect(result.note).toContain('hard cap of 8');

    verifySettlement(balances, result.transactions);
  });

  test('Edge case: all balances already zero', () => {
    const balances = {
      Alice: 0,
      Bob: 0,
      Charlie: 0,
    };

    const result = simplifyDebts(balances);

    expect(result.totalTransactions).toBe(0);
    expect(result.transactions).toEqual([]);
    expect(result.memberCount).toBe(0);
    expect(result.isOptimal).toBe(true);
  });

  test('Edge case: single creditor, single debtor', () => {
    const balances = {
      Alice: -7500,
      Bob: 7500,
    };

    const result = simplifyDebts(balances);

    expect(result.totalTransactions).toBe(1);
    expect(result.transactions).toEqual([
      {
        payer: 'Alice',
        payee: 'Bob',
        amountPaise: 7500,
      },
    ]);

    verifySettlement(balances, result.transactions);
  });

  test('Edge case: floating-point-free integer paise math (no rounding drift)', () => {
    const totalPaise = rupeesToPaise(100.0);
    expect(totalPaise).toBe(10000);

    const splits = calculateEqualSplits(totalPaise, ['user1', 'user2', 'user3']);
    expect(splits).toEqual([
      { user: 'user1', amountPaise: 3334 },
      { user: 'user2', amountPaise: 3333 },
      { user: 'user3', amountPaise: 3333 },
    ]);

    const sum = splits.reduce((acc, s) => acc + s.amountPaise, 0);
    expect(sum).toBe(10000);

    const balances = {
      user1: 6666,
      user2: -3333,
      user3: -3333,
    };

    const result = simplifyDebts(balances);
    expect(result.totalTransactions).toBe(2);
    verifySettlement(balances, result.transactions);

    expect(paiseToRupees(3334)).toBe(33.34);
    expect(paiseToRupees(3333)).toBe(33.33);
    expect(paiseToRupees(10000)).toBe(100.0);
  });

  test('calculatePercentageSplits allocates exact sum with no drift', () => {
    const totalPaise = 10000;
    const splits = calculatePercentageSplits(totalPaise, [
      { user: 'u1', percentage: 33.33 },
      { user: 'u2', percentage: 33.33 },
      { user: 'u3', percentage: 33.34 },
    ]);

    const sum = splits.reduce((acc, s) => acc + s.amountPaise, 0);
    expect(sum).toBe(10000);
  });
});
