export function rupeesToPaise(rupees) {
  const parsed = Number(rupees);
  if (Number.isNaN(parsed)) {
    throw new TypeError(`Cannot convert invalid number to paise: ${rupees}`);
  }
  return Math.round(parsed * 100);
}

export function paiseToRupees(paise) {
  const parsed = Number(paise);
  if (Number.isNaN(parsed)) {
    throw new TypeError(`Cannot convert invalid number to rupees: ${paise}`);
  }
  return Number((parsed / 100).toFixed(2));
}

export function formatRupees(paise) {
  return `₹${paiseToRupees(paise).toFixed(2)}`;
}

export function calculateEqualSplits(totalPaise, userIds) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new Error('User IDs array must not be empty');
  }

  const count = userIds.length;
  const baseShare = Math.floor(totalPaise / count);
  const remainder = totalPaise % count;

  return userIds.map((userId, index) => ({
    user: userId,
    amountPaise: baseShare + (index < remainder ? 1 : 0),
  }));
}

export function calculatePercentageSplits(totalPaise, percentageSplits) {
  if (!Array.isArray(percentageSplits) || percentageSplits.length === 0) {
    throw new Error('Percentage splits must not be empty');
  }

  const totalPercent = percentageSplits.reduce((acc, s) => acc + Number(s.percentage), 0);
  if (Math.abs(totalPercent - 100) > 0.01) {
    throw new Error(`Percentages must sum to 100, got ${totalPercent}%`);
  }

  let allocated = 0;
  const splits = percentageSplits.map((s) => {
    const share = Math.round((totalPaise * Number(s.percentage)) / 100);
    allocated += share;
    return {
      user: s.user,
      amountPaise: share,
    };
  });

  const diff = totalPaise - allocated;
  if (diff !== 0 && splits.length > 0) {
    let maxIdx = 0;
    for (let i = 1; i < splits.length; i += 1) {
      if (splits[i].amountPaise > splits[maxIdx].amountPaise) {
        maxIdx = i;
      }
    }
    splits[maxIdx].amountPaise += diff;
  }

  return splits;
}
