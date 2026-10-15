const MAX_OPTIMAL_MEMBERS = 8;

function normalizeBalances(netBalances) {
  const members = [];

  if (netBalances instanceof Map) {
    for (const [userId, balance] of netBalances.entries()) {
      const parsed = Math.round(Number(balance));
      if (parsed !== 0) {
        members.push({ userId: String(userId), balance: parsed });
      }
    }
  } else if (Array.isArray(netBalances)) {
    for (const item of netBalances) {
      const userId = item.userId || item.user;
      const balance = Math.round(Number(item.balance !== undefined ? item.balance : item.netBalancePaise));
      if (userId && balance !== 0) {
        members.push({ userId: String(userId), balance });
      }
    }
  } else if (typeof netBalances === 'object' && netBalances !== null) {
    for (const [userId, balance] of Object.entries(netBalances)) {
      const parsed = Math.round(Number(balance));
      if (parsed !== 0) {
        members.push({ userId: String(userId), balance: parsed });
      }
    }
  }

  return members;
}

export function greedySolver(nonZeroMembers) {
  const creditors = [];
  const debtors = [];

  for (const m of nonZeroMembers) {
    if (m.balance > 0) {
      creditors.push({ userId: m.userId, amount: m.balance });
    } else if (m.balance < 0) {
      debtors.push({ userId: m.userId, amount: -m.balance });
    }
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions = [];

  while (creditors.length > 0 && debtors.length > 0) {
    const creditor = creditors[0];
    const debtor = debtors[0];

    const transfer = Math.min(creditor.amount, debtor.amount);
    if (transfer > 0) {
      transactions.push({
        payer: debtor.userId,
        payee: creditor.userId,
        amountPaise: transfer,
      });
    }

    creditor.amount -= transfer;
    debtor.amount -= transfer;

    if (creditor.amount === 0) {
      creditors.shift();
    } else {
      creditors.sort((a, b) => b.amount - a.amount);
    }

    if (debtor.amount === 0) {
      debtors.shift();
    } else {
      debtors.sort((a, b) => b.amount - a.amount);
    }
  }

  return transactions;
}

function settleZeroSumSubset(subsetMembers) {
  const creditors = [];
  const debtors = [];

  for (const m of subsetMembers) {
    if (m.balance > 0) {
      creditors.push({ userId: m.userId, amount: m.balance });
    } else if (m.balance < 0) {
      debtors.push({ userId: m.userId, amount: -m.balance });
    }
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions = [];

  while (creditors.length > 0 && debtors.length > 0) {
    const creditor = creditors[0];
    const debtor = debtors[0];

    const transfer = Math.min(creditor.amount, debtor.amount);
    if (transfer > 0) {
      transactions.push({
        payer: debtor.userId,
        payee: creditor.userId,
        amountPaise: transfer,
      });
    }

    creditor.amount -= transfer;
    debtor.amount -= transfer;

    if (creditor.amount === 0) {
      creditors.shift();
    } else {
      creditors.sort((a, b) => b.amount - a.amount);
    }

    if (debtor.amount === 0) {
      debtors.shift();
    } else {
      debtors.sort((a, b) => b.amount - a.amount);
    }
  }

  return transactions;
}

export function optimalSolver(nonZeroMembers) {
  const n = nonZeroMembers.length;
  if (n <= 1) return [];

  const subsetSum = new Int32Array(1 << n);
  for (let mask = 1; mask < (1 << n); mask += 1) {
    const lsb = mask & -mask;
    const lsbIdx = Math.log2(lsb);
    subsetSum[mask] = subsetSum[mask ^ lsb] + nonZeroMembers[lsbIdx].balance;
  }

  const memo = new Map();

  function findMaxPartition(mask) {
    if (mask === 0) return [];
    if (memo.has(mask)) return memo.get(mask);

    let best = null;

    const lsb = mask & -mask;

    let submask = mask;
    while (submask > 0) {
      if ((submask & lsb) !== 0 && subsetSum[submask] === 0) {
        const rest = findMaxPartition(mask ^ submask);
        if (rest !== null) {
          const candidate = [submask, ...rest];
          if (best === null || candidate.length > best.length) {
            best = candidate;
          }
        }
      }
      submask = (submask - 1) & mask;
    }

    memo.set(mask, best);
    return best;
  }

  const fullMask = (1 << n) - 1;
  const optimalSubmasks = findMaxPartition(fullMask);

  const transactions = [];

  if (optimalSubmasks && optimalSubmasks.length > 0) {
    for (const mask of optimalSubmasks) {
      const subsetMembers = [];
      for (let i = 0; i < n; i += 1) {
        if ((mask & (1 << i)) !== 0) {
          subsetMembers.push({ ...nonZeroMembers[i] });
        }
      }
      const subsetTxns = settleZeroSumSubset(subsetMembers);
      transactions.push(...subsetTxns);
    }
  } else {
    return greedySolver(nonZeroMembers);
  }

  return transactions;
}

export function simplifyDebts(netBalances) {
  const nonZeroMembers = normalizeBalances(netBalances);
  const memberCount = nonZeroMembers.length;

  if (memberCount === 0) {
    return {
      transactions: [],
      totalTransactions: 0,
      solverUsed: 'optimal',
      isOptimal: true,
      fallbackToGreedy: false,
      memberCount: 0,
      maxOptimalMembers: MAX_OPTIMAL_MEMBERS,
      note: 'All members are already settled. No transactions required.',
    };
  }

  if (memberCount === 1) {
    return {
      transactions: [],
      totalTransactions: 0,
      solverUsed: 'greedy',
      isOptimal: false,
      fallbackToGreedy: false,
      memberCount: 1,
      maxOptimalMembers: MAX_OPTIMAL_MEMBERS,
      note: 'Only one member has a non-zero balance; cannot settle single balance.',
    };
  }

  if (memberCount > MAX_OPTIMAL_MEMBERS) {
    const greedyTxns = greedySolver(nonZeroMembers);
    return {
      transactions: greedyTxns,
      totalTransactions: greedyTxns.length,
      solverUsed: 'greedy',
      isOptimal: false,
      fallbackToGreedy: true,
      memberCount,
      maxOptimalMembers: MAX_OPTIMAL_MEMBERS,
      note: `Optimal solver has a hard cap of ${MAX_OPTIMAL_MEMBERS} nonzero-balance members (NP-hard). Evaluated using near-optimal greedy solver (Splitwise-style).`,
    };
  }

  const greedyTxns = greedySolver(nonZeroMembers);
  const optimalTxns = optimalSolver(nonZeroMembers);
  const saved = greedyTxns.length - optimalTxns.length;

  let note = `Optimal solver computed global minimum (${optimalTxns.length} transactions).`;
  if (saved > 0) {
    note += ` Saved ${saved} transaction(s) compared to greedy heuristic.`;
  } else {
    note += ` Greedy heuristic also achieved ${greedyTxns.length} transactions.`;
  }

  return {
    transactions: optimalTxns,
    totalTransactions: optimalTxns.length,
    solverUsed: 'optimal',
    isOptimal: true,
    fallbackToGreedy: false,
    memberCount,
    maxOptimalMembers: MAX_OPTIMAL_MEMBERS,
    greedyTransactionCount: greedyTxns.length,
    transactionsSaved: Math.max(0, saved),
    note,
  };
}
