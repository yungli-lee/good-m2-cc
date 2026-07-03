export function calculateManualTaxWan(taxableIncomeWan: number, taxRatePercent: number) {
  return Math.max(0, taxableIncomeWan) * (taxRatePercent / 100);
}

export function totalWan(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0);
}
