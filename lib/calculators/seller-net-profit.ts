export type SellerNetProfitInput = {
  improvementCostsWan: number;
  purchaseDate: string;
  saleDate: string;
  purchaseBrokerFeeWan: number;
  purchasePriceWan: number;
  saleBrokerFeeRatePercent: number;
  targetNetProfitWan: number;
  taxRatePercent: number;
};

export type SellerNetProfitResult = {
  autoTaxRatePercent: number;
  holdingPeriod: string;
  improvementCostsWan: number;
  minimumSalePriceWan: number;
  saleBrokerFeeWan: number;
  taxAmountWan: number;
  taxableIncomeWan: number;
  taxRatePercent: number;
  targetNetProfitWan: number;
};

const dayMs = 24 * 60 * 60 * 1000;

function parseDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addYears(date: Date, years: number) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function getSellerTaxRatePercent(purchaseDate: string, saleDate: string) {
  const purchase = parseDate(purchaseDate);
  const sale = parseDate(saleDate);
  if (!purchase || !sale || sale < purchase) return 45;

  if (sale <= addYears(purchase, 2)) return 45;
  if (sale <= addYears(purchase, 5)) return 35;
  if (sale <= addYears(purchase, 10)) return 20;
  return 15;
}

export function getHoldingPeriodLabel(purchaseDate: string, saleDate: string) {
  const purchase = parseDate(purchaseDate);
  const sale = parseDate(saleDate);
  if (!purchase || !sale) return "日期未完整";
  if (sale < purchase) return "出售日期早於買入日期";

  let years = sale.getFullYear() - purchase.getFullYear();
  if (addYears(purchase, years) > sale) years -= 1;

  const yearBase = addYears(purchase, years);
  let months = 0;
  while (addMonths(yearBase, months + 1) <= sale) {
    months += 1;
  }

  const monthBase = addMonths(yearBase, months);
  const days = Math.max(0, Math.floor((sale.getTime() - monthBase.getTime()) / dayMs));

  return `${years} 年 ${months} 個月 ${days} 天`;
}

export function validateSellerNetProfitInput(input: SellerNetProfitInput) {
  const purchase = parseDate(input.purchaseDate);
  const sale = parseDate(input.saleDate);
  if (!purchase || !sale) return "請輸入買入日期與預計出售日期。";
  if (sale < purchase) return "預計出售日期不可早於買入日期。";
  if (input.purchasePriceWan <= 0) return "買入價格需大於 0。";
  if (input.purchaseBrokerFeeWan < 0) return "買入仲介費不可為負數。";
  if (input.improvementCostsWan < 0) return "裝修及其他必要支出不可為負數。";
  if (input.saleBrokerFeeRatePercent < 0 || input.saleBrokerFeeRatePercent >= 100) return "出售仲介費率需介於 0% 到 100% 之間。";
  if (input.targetNetProfitWan < 0) return "目標稅後淨利不可為負數。";
  if (input.taxRatePercent < 0 || input.taxRatePercent >= 100) return "房地合一稅率需介於 0% 到 100% 之間。";
  return null;
}

export function calculateSellerNetProfit(input: SellerNetProfitInput): SellerNetProfitResult {
  const taxRate = input.taxRatePercent / 100;
  const brokerRate = input.saleBrokerFeeRatePercent / 100;
  const requiredTaxableIncome = input.targetNetProfitWan / (1 - taxRate);
  const minimumSalePriceWan = (
    input.purchasePriceWan +
    input.purchaseBrokerFeeWan +
    input.improvementCostsWan +
    requiredTaxableIncome
  ) / (1 - brokerRate);
  const saleBrokerFeeWan = minimumSalePriceWan * brokerRate;
  const taxableIncomeWan = minimumSalePriceWan - input.purchasePriceWan - input.purchaseBrokerFeeWan - input.improvementCostsWan - saleBrokerFeeWan;
  const taxAmountWan = taxableIncomeWan * taxRate;

  return {
    autoTaxRatePercent: getSellerTaxRatePercent(input.purchaseDate, input.saleDate),
    holdingPeriod: getHoldingPeriodLabel(input.purchaseDate, input.saleDate),
    improvementCostsWan: input.improvementCostsWan,
    minimumSalePriceWan,
    saleBrokerFeeWan,
    taxAmountWan,
    taxableIncomeWan,
    taxRatePercent: input.taxRatePercent,
    targetNetProfitWan: taxableIncomeWan - taxAmountWan
  };
}
