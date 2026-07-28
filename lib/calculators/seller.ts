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
};

export type SellerCarryCostsMode = "allFeesAdded" | "brokerageExtra";

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
  "originalCostWan" | "purchaseBrokerFeeWan" | "improvementCostsWan" | "landValueIncrementTaxWan" | "notaryAndMiscWan" | "settlementFeeWan" | "otherFeesWan"
>;

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
    input.otherFeesWan
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
    otherFeesWan: input.otherFeesWan
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
