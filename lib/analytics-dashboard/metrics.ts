import type { SummaryMetric } from "./contracts.ts";

export function safeRate(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : null;
}

export function safeChange(current: number, previous: number) {
  if (previous === 0) return null;
  return (current - previous) / previous;
}

export function comparison(current: number, previous: number): SummaryMetric {
  return { current, previous, changePercent: safeChange(current, previous) };
}

export function rateComparison(
  currentNumerator: number,
  currentDenominator: number,
  previousNumerator: number,
  previousDenominator: number
): SummaryMetric {
  const current = safeRate(currentNumerator, currentDenominator);
  const previous = safeRate(previousNumerator, previousDenominator);
  return {
    current: current ?? 0,
    previous: previous ?? 0,
    changePercent: current === null || previous === null ? null : safeChange(current, previous),
    numerator: currentNumerator,
    denominator: currentDenominator
  };
}
