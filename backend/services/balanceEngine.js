export function computeNetBalances(expenses = [], settlements = [], members = []) {
  const balanceMap = new Map();

  const getUserId = (user) => {
    if (!user) return null;
    if (typeof user === 'string') return user;
    if (user._id) return user._id.toString();
    return user.toString();
  };

  for (const m of members) {
    const id = getUserId(m);
    if (id) {
      balanceMap.set(id, 0);
    }
  }

  for (const exp of expenses) {
    if (exp.deletedAt) {
      continue;
    }

    const payerId = getUserId(exp.paidBy);
    const amount = Number(exp.amountPaise) || 0;

    if (payerId) {
      balanceMap.set(payerId, (balanceMap.get(payerId) || 0) + amount);
    }

    if (Array.isArray(exp.splits)) {
      for (const split of exp.splits) {
        const splitUserId = getUserId(split.user);
        const splitAmount = Number(split.amountPaise) || 0;
        if (splitUserId) {
          balanceMap.set(splitUserId, (balanceMap.get(splitUserId) || 0) - splitAmount);
        }
      }
    }
  }

  for (const st of settlements) {
    if (st.status === 'paid') {
      const payerId = getUserId(st.payer);
      const payeeId = getUserId(st.payee);
      const amount = Number(st.amountPaise) || 0;

      if (payerId) {
        balanceMap.set(payerId, (balanceMap.get(payerId) || 0) + amount);
      }
      if (payeeId) {
        balanceMap.set(payeeId, (balanceMap.get(payeeId) || 0) - amount);
      }
    }
  }

  return balanceMap;
}

export function computeMemberBreakdown(expenses = [], settlements = [], members = []) {
  const getUserId = (user) => {
    if (!user) return null;
    if (typeof user === 'string') return user;
    if (user._id) return user._id.toString();
    return user.toString();
  };

  const memberStats = new Map();

  for (const m of members) {
    const id = getUserId(m);
    if (id) {
      memberStats.set(id, { totalPaid: 0, totalOwed: 0 });
    }
  }

  for (const exp of expenses) {
    if (exp.deletedAt) continue;

    const payerId = getUserId(exp.paidBy);
    const amount = Number(exp.amountPaise) || 0;

    if (payerId) {
      if (!memberStats.has(payerId)) memberStats.set(payerId, { totalPaid: 0, totalOwed: 0 });
      memberStats.get(payerId).totalPaid += amount;
    }

    if (Array.isArray(exp.splits)) {
      for (const split of exp.splits) {
        const splitUserId = getUserId(split.user);
        const splitAmount = Number(split.amountPaise) || 0;
        if (splitUserId) {
          if (!memberStats.has(splitUserId)) memberStats.set(splitUserId, { totalPaid: 0, totalOwed: 0 });
          memberStats.get(splitUserId).totalOwed += splitAmount;
        }
      }
    }
  }

  const netMap = computeNetBalances(expenses, settlements, members);

  const result = [];
  for (const [userId, netBalancePaise] of netMap.entries()) {
    const stats = memberStats.get(userId) || { totalPaid: 0, totalOwed: 0 };
    let status = 'settled';
    if (netBalancePaise > 0) status = 'creditor';
    else if (netBalancePaise < 0) status = 'debtor';

    result.push({
      userId,
      netBalancePaise,
      totalPaidPaise: stats.totalPaid,
      totalOwedPaise: stats.totalOwed,
      status,
    });
  }

  return result;
}
