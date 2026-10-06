import { assertPercentRange, calculateBrokerageFeeWan } from "./brokerage.ts";
import { calculateManualTaxWan, totalWan } from "./tax.ts";

export type SellerCarryCostsInput = {
  targetNetWan: number;
  purchaseDate: string;
  saleDate: string;
  originalCostWan: number;
  purchaseBrokerFeeWan: number;
  improvementCostsWan: number;
  saleBrokerFeeRatePercent: number;
  landValueIncrementTaxWan: number;
  notaryAndMiscWan: number;
  settlementFeeWan: number;
  otherFeesWan: number;
  houseLandTaxRatePercent: number;
  propertyTransactionTaxWan?: number;
};

export type SellerCarryCostsMode = "allFeesAdded" | "brokerageExtra";
export type StandardHouseLandTaxRate = { rate: 45 | 35 | 20 | 15; holdingDays: number; holdingCategory: "within_2_years" | "over_2_to_5_years" | "over_5_to_10_years" | "over_10_years" };
export type HouseLandTaxRegime = { regime: "house_land_new_system" | "property_transaction_old_system"; houseLandTaxRate: number; holdingDays: number; holdingCategory: string | null; reason: string };

export type SellerCarryCostsResult = {
  suggestedSalePriceWan: number;
  saleBrokerFeeWan: number;
  buyerTotalPaymentWan: number;
  houseLandTaxWan: number;
  landValueIncrementTaxWan: number;
  totalFeesWan: number;
  ownerNetWan: number;
  verificationDifferenceWan: number;
  holdingPeriodDays: number;
  houseLandTaxRatePercent: number;
  notaryAndMiscWan: number;
  settlementFeeWan: number;
  otherFeesWan: number;
  propertyTransactionTaxWan: number;
};

export type SellerFixedPriceBrokerageExtraInput = Omit<SellerCarryCostsInput, "targetNetWan"> & {
  sellerPriceWan: number;
};

export type SellerFixedPriceBrokerageExtraResult = {
  salePriceWan: number;
  saleBrokerFeeWan: number;
  buyerTotalPaymentWan: number;
  houseLandTaxWan: number;
  landValueIncrementTaxWan: number;
  ownerBurdenFeesWan: number;
  ownerEstimatedNetWan: number;
};

type SellerCostBasisInput = Pick<
  SellerCarryCostsInput,
  "originalCostWan" | "purchaseBrokerFeeWan" | "improvementCostsWan" | "landValueIncrementTaxWan" | "notaryAndMiscWan" | "settlementFeeWan" | "otherFeesWan" | "propertyTransactionTaxWan"
>;

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

function addCalendarYears(date: Date, years: number) {
  const result = new Date(date.getFullYear() + years, date.getMonth(), date.getDate());
  return date.getMonth() === 1 && date.getDate() === 29 && result.getMonth() !== 1 ? new Date(date.getFullYear() + years, 1, 28) : result;
}

export function getStandardIndividualHouseLandTaxRate(acquisitionDate: string, saleDate: string): StandardHouseLandTaxRate | { error: string } {
  const acquisition = parseLocalDate(acquisitionDate);
  const sale = parseLocalDate(saleDate);
  if (!acquisition || !sale) return { error: "請輸入有效的取得日期與預計出售日期。" };
  if (sale < acquisition) return { error: "預計出售日期不可早於取得日期。" };
  const holdingDays = Math.round((sale.getTime() - acquisition.getTime()) / 86400000);
  if (sale <= addCalendarYears(acquisition, 2)) return { rate: 45, holdingDays, holdingCategory: "within_2_years" };
  if (sale <= addCalendarYears(acquisition, 5)) return { rate: 35, holdingDays, holdingCategory: "over_2_to_5_years" };
  if (sale <= addCalendarYears(acquisition, 10)) return { rate: 20, holdingDays, holdingCategory: "over_5_to_10_years" };
  return { rate: 15, holdingDays, holdingCategory: "over_10_years" };
}

export function determineHouseLandTaxRegime(acquisitionDate: string, saleDate: string): HouseLandTaxRegime | { error: string } {
  const acquisition = parseLocalDate(acquisitionDate);
  const sale = parseLocalDate(saleDate);
  if (!acquisition || !sale) return { error: "請輸入有效的取得日期與預計出售日期。" };
  if (sale < acquisition) return { error: "預計出售日期不可早於取得日期。" };
  const holdingDays = Math.round((sale.getTime() - acquisition.getTime()) / 86400000);
  const cutoff = new Date(2016, 0, 1);
  const daybreakStart = new Date(2014, 0, 2);
  const daybreakEnd = new Date(2015, 11, 31);
  const daybreakEligible = acquisition >= daybreakStart && acquisition <= daybreakEnd && sale >= cutoff && sale <= addCalendarYears(acquisition, 2);
  if (acquisition >= cutoff || daybreakEligible) {
    const rate = getStandardIndividualHouseLandTaxRate(acquisitionDate, saleDate);
    if ("error" in rate) return rate;
    return { regime: "house_land_new_system", houseLandTaxRate: daybreakEligible ? 20 : rate.rate, holdingDays, holdingCategory: rate.holdingCategory, reason: daybreakEligible ? "符合日出條款範圍" : "取得日為 2016/01/01 以後" };
  }
  return { regime: "property_transaction_old_system", houseLandTaxRate: 0, holdingDays, holdingCategory: null, reason: "取得日為 2015/12/31 以前，適用財產交易所得舊制" };
}

export function validateSellerCarryCostsInput(input: SellerCarryCostsInput) {
  if (!input.purchaseDate || !input.saleDate) return "請輸入取得日期與預計出售日期。";
  const purchase = new Date(`${input.purchaseDate}T00:00:00`);
  const sale = new Date(`${input.saleDate}T00:00:00`);
  if (!Number.isFinite(purchase.getTime()) || !Number.isFinite(sale.getTime())) return "日期格式不正確。";
  if (sale < purchase) return "預計出售日期不可早於取得日期。";
  if (input.targetNetWan <= 0) return "屋主目標實拿金額需大於 0。";
  if (input.originalCostWan < 0) return "原始取得成本不可為負數。";
  if (input.purchaseBrokerFeeWan < 0) return "買入仲介費不可為負數。";
  if (input.improvementCostsWan < 0) return "裝修及其他必要支出不可為負數。";
  if (input.landValueIncrementTaxWan < 0) return "土地增值稅不可為負數。";
  if (input.notaryAndMiscWan < 0) return "代書與雜支不可為負數。";
  if (input.settlementFeeWan < 0) return "清償相關費用不可為負數。";
  if (input.otherFeesWan < 0) return "其他費用不可為負數。";
  return assertPercentRange(input.saleBrokerFeeRatePercent, "出售仲介服務費率") || assertPercentRange(input.houseLandTaxRatePercent, "房地合一稅率");
}

export function validateSellerFixedPriceBrokerageExtraInput(input: SellerFixedPriceBrokerageExtraInput) {
  if (!input.purchaseDate || !input.saleDate) return "請輸入取得日期與預計出售日期。";
  if (new Date(`${input.saleDate}T00:00:00`) < new Date(`${input.purchaseDate}T00:00:00`)) return "預計出售日期不可早於取得日期。";
  if (input.sellerPriceWan <= 0) return "屋主售價金額需大於 0。";
  if (input.originalCostWan < 0) return "原始取得成本不可為負數。";
  if (input.purchaseBrokerFeeWan < 0) return "買入仲介費不可為負數。";
  if (input.improvementCostsWan < 0) return "裝修及其他必要支出不可為負數。";
  if (input.landValueIncrementTaxWan < 0) return "土地增值稅不可為負數。";
  if (input.notaryAndMiscWan < 0) return "代書與雜支不可為負數。";
  if (input.settlementFeeWan < 0) return "清償相關費用不可為負數。";
  if (input.otherFeesWan < 0) return "其他費用不可為負數。";
  return assertPercentRange(input.saleBrokerFeeRatePercent, "出售仲介服務費率") || assertPercentRange(input.houseLandTaxRatePercent, "房地合一稅率");
}

function baseCostWan(input: SellerCostBasisInput) {
  return input.originalCostWan + input.purchaseBrokerFeeWan + input.improvementCostsWan;
}

function fixedSellerFeesWan(input: SellerCostBasisInput) {
  return totalWan([
    input.landValueIncrementTaxWan,
    input.notaryAndMiscWan,
    input.settlementFeeWan,
    input.otherFeesWan,
    input.propertyTransactionTaxWan ?? 0
  ]);
}

function solvePriceForTarget(input: SellerCarryCostsInput, mode: SellerCarryCostsMode) {
  let low = 0;
  let high = Math.max(input.targetNetWan + baseCostWan(input) + fixedSellerFeesWan(input), 1);

  while (ownerNetForPrice(input, high, mode).ownerNetWan < input.targetNetWan) {
    high *= 2;
  }

  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2;
    if (ownerNetForPrice(input, mid, mode).ownerNetWan >= input.targetNetWan) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return high;
}

function ownerNetForPrice(input: SellerCarryCostsInput, priceWan: number, mode: SellerCarryCostsMode) {
  const saleBrokerFeeWan = calculateBrokerageFeeWan(priceWan, input.saleBrokerFeeRatePercent);
  const brokerFeePaidBySellerWan = mode === "allFeesAdded" ? saleBrokerFeeWan : 0;
  const taxableIncomeWan = priceWan - baseCostWan(input) - brokerFeePaidBySellerWan;
  const houseLandTaxWan = calculateManualTaxWan(taxableIncomeWan, input.houseLandTaxRatePercent);
  const fixedFeesWan = fixedSellerFeesWan(input);
  const ownerNetWan = priceWan - brokerFeePaidBySellerWan - houseLandTaxWan - fixedFeesWan;

  return {
    buyerTotalPaymentWan: mode === "brokerageExtra" ? priceWan + saleBrokerFeeWan : priceWan,
    houseLandTaxWan,
    ownerNetWan,
    saleBrokerFeeWan,
    totalFeesWan: fixedFeesWan + houseLandTaxWan + brokerFeePaidBySellerWan
  };
}

export function calculateSellerCarryCosts(input: SellerCarryCostsInput, mode: SellerCarryCostsMode): SellerCarryCostsResult {
  const suggestedSalePriceWan = solvePriceForTarget(input, mode);
  const result = ownerNetForPrice(input, suggestedSalePriceWan, mode);

  return {
    suggestedSalePriceWan,
    saleBrokerFeeWan: result.saleBrokerFeeWan,
    buyerTotalPaymentWan: result.buyerTotalPaymentWan,
    houseLandTaxWan: result.houseLandTaxWan,
    landValueIncrementTaxWan: input.landValueIncrementTaxWan,
    totalFeesWan: result.totalFeesWan,
    ownerNetWan: result.ownerNetWan,
    verificationDifferenceWan: result.ownerNetWan - input.targetNetWan,
    holdingPeriodDays: Math.round((new Date(`${input.saleDate}T00:00:00`).getTime() - new Date(`${input.purchaseDate}T00:00:00`).getTime()) / 86400000),
    houseLandTaxRatePercent: input.houseLandTaxRatePercent,
    notaryAndMiscWan: input.notaryAndMiscWan,
    settlementFeeWan: input.settlementFeeWan,
    otherFeesWan: input.otherFeesWan,
    propertyTransactionTaxWan: input.propertyTransactionTaxWan ?? 0
  };
}

export function calculateSellerFixedPriceBrokerageExtra(input: SellerFixedPriceBrokerageExtraInput): SellerFixedPriceBrokerageExtraResult {
  const salePriceWan = input.sellerPriceWan;
  const saleBrokerFeeWan = calculateBrokerageFeeWan(salePriceWan, input.saleBrokerFeeRatePercent);
  const taxableIncomeWan = salePriceWan - baseCostWan(input);
  const houseLandTaxWan = calculateManualTaxWan(taxableIncomeWan, input.houseLandTaxRatePercent);
  const fixedFeesWan = fixedSellerFeesWan(input);
  const ownerBurdenFeesWan = houseLandTaxWan + fixedFeesWan;

  return {
    salePriceWan,
    saleBrokerFeeWan,
    buyerTotalPaymentWan: salePriceWan + saleBrokerFeeWan,
    houseLandTaxWan,
    landValueIncrementTaxWan: input.landValueIncrementTaxWan,
    ownerBurdenFeesWan,
    ownerEstimatedNetWan: salePriceWan - ownerBurdenFeesWan
  };
}
