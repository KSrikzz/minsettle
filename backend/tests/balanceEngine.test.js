import { computeNetBalances, computeMemberBreakdown } from '../services/balanceEngine.js';

describe('Balance Engine Unit Tests', () => {
  test('Computes net balances from active expenses correctly', () => {
    const expenses = [
      {
        paidBy: 'Alice',
        amountPaise: 3000,
        splits: [
          { user: 'Alice', amountPaise: 1000 },
          { user: 'Bob', amountPaise: 1000 },
          { user: 'Charlie', amountPaise: 1000 },
        ],
        deletedAt: null,
      },
      {
        paidBy: 'Bob',
        amountPaise: 1500,
        splits: [
          { user: 'Alice', amountPaise: 500 },
          { user: 'Bob', amountPaise: 500 },
          { user: 'Charlie', amountPaise: 500 },
        ],
        deletedAt: null,
      },
    ];

    const balances = computeNetBalances(expenses, [], ['Alice', 'Bob', 'Charlie']);

    expect(balances.get('Alice')).toBe(1500);
    expect(balances.get('Bob')).toBe(0);
    expect(balances.get('Charlie')).toBe(-1500);
  });

  test('Ignores soft-deleted expenses', () => {
    const expenses = [
      {
        paidBy: 'Alice',
        amountPaise: 2000,
        splits: [
          { user: 'Alice', amountPaise: 1000 },
          { user: 'Bob', amountPaise: 1000 },
        ],
        deletedAt: null,
      },
      {
        paidBy: 'Bob',
        amountPaise: 4000,
        splits: [
          { user: 'Alice', amountPaise: 2000 },
          { user: 'Bob', amountPaise: 2000 },
        ],
        deletedAt: new Date(),
      },
    ];

    const balances = computeNetBalances(expenses, [], ['Alice', 'Bob']);

    expect(balances.get('Alice')).toBe(1000);
    expect(balances.get('Bob')).toBe(-1000);
  });

  test('Incorporates confirmed (paid) settlements and ignores pending/stale settlements', () => {
    const expenses = [
      {
        paidBy: 'Alice',
        amountPaise: 2000,
        splits: [
          { user: 'Alice', amountPaise: 1000 },
          { user: 'Bob', amountPaise: 1000 },
        ],
        deletedAt: null,
      },
    ];

    const settlements = [
      {
        payer: 'Bob',
        payee: 'Alice',
        amountPaise: 600,
        status: 'paid',
      },
      {
        payer: 'Bob',
        payee: 'Alice',
        amountPaise: 400,
        status: 'pending',
      },
      {
        payer: 'Bob',
        payee: 'Alice',
        amountPaise: 400,
        status: 'stale',
      },
    ];

    const balances = computeNetBalances(expenses, settlements, ['Alice', 'Bob']);

    expect(balances.get('Alice')).toBe(400);
    expect(balances.get('Bob')).toBe(-400);
  });

  test('computeMemberBreakdown calculates total spent, total owed, and status accurately', () => {
    const expenses = [
      {
        paidBy: 'Alice',
        amountPaise: 3000,
        splits: [
          { user: 'Alice', amountPaise: 1500 },
          { user: 'Bob', amountPaise: 1500 },
        ],
      },
    ];

    const breakdown = computeMemberBreakdown(expenses, [], ['Alice', 'Bob']);
    const aliceStats = breakdown.find((b) => b.userId === 'Alice');
    const bobStats = breakdown.find((b) => b.userId === 'Bob');

    expect(aliceStats.totalPaidPaise).toBe(3000);
    expect(aliceStats.totalOwedPaise).toBe(1500);
    expect(aliceStats.netBalancePaise).toBe(1500);
    expect(aliceStats.status).toBe('creditor');

    expect(bobStats.totalPaidPaise).toBe(0);
    expect(bobStats.totalOwedPaise).toBe(1500);
    expect(bobStats.netBalancePaise).toBe(-1500);
    expect(bobStats.status).toBe('debtor');
  });
});
