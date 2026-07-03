export function calculateBrokerageFeeWan(amountWan: number, ratePercent: number) {
  return amountWan * (ratePercent / 100);
}

export function assertPercentRange(value: number, label: string, maxExclusive = 100) {
  if (value < 0 || value >= maxExclusive) {
    return `${label}需介於 0% 到 ${maxExclusive}% 之間。`;
  }
  return null;
}
