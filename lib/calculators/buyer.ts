import { assertPercentRange, calculateBrokerageFeeWan } from "@/lib/calculators/brokerage";
import { totalWan } from "@/lib/calculators/tax";

export type BuyerBudgetInput = {
  availableCashWan: number;
  loanLimitWan: number | null;
  loanToValuePercent: number;
  buyerBrokerFeeRatePercent: number;
  deedTaxWan: number;
  notaryAndRegistrationWan: number;
  escrowFeeWan: number;
  renovationBudgetWan: number;
  furnitureBudgetWan: number;
  cashReserveWan: number;
  otherFeesWan: number;
};

export type BuyerBudgetResult = {
  maxOfferWan: number;
  estimatedLoanWan: number;
  requiredCashWan: number;
  buyerBrokerFeeWan: number;
  purchaseExtraCostsWan: number;
  totalFundingNeedWan: number;
  cashUsedWan: number;
  suggestedOfferReductionWan: number;
};

export function validateBuyerBudgetInput(input: BuyerBudgetInput) {
  if (input.availableCashWan < 0) return "可用自備款不可為負數。";
  if (input.loanLimitWan !== null && input.loanLimitWan < 0) return "貸款上限金額不可為負數。";
  if (input.loanToValuePercent <= 0 || input.loanToValuePercent > 100) return "預估貸款成數需介於 0% 到 100% 之間。";
  const brokerMessage = assertPercentRange(input.buyerBrokerFeeRatePercent, "買方仲介服務費率");
  if (brokerMessage) return brokerMessage;
  if (input.deedTaxWan < 0) return "契稅不可為負數。";
  if (input.notaryAndRegistrationWan < 0) return "代書與規費不可為負數。";
  if (input.escrowFeeWan < 0) return "履保費不可為負數。";
  if (input.renovationBudgetWan < 0) return "裝潢預算不可為負數。";
  if (input.furnitureBudgetWan < 0) return "家具家電預算不可為負數。";
  if (input.cashReserveWan < 0) return "預留現金不可為負數。";
  if (input.otherFeesWan < 0) return "其他費用不可為負數。";
  return null;
}

function fixedBuyerCostsWan(input: BuyerBudgetInput) {
  return totalWan([
    input.deedTaxWan,
    input.notaryAndRegistrationWan,
    input.escrowFeeWan,
    input.renovationBudgetWan,
    input.furnitureBudgetWan,
    input.cashReserveWan,
    input.otherFeesWan
  ]);
}

export function calculateBuyerBudget(input: BuyerBudgetInput): BuyerBudgetResult {
  const loanRate = input.loanToValuePercent / 100;
  const brokerRate = input.buyerBrokerFeeRatePercent / 100;
  const fixedCostsWan = fixedBuyerCostsWan(input);
  const maxByCashWan = (input.availableCashWan - fixedCostsWan) / (1 - loanRate + brokerRate);
  const maxByLoanWan = input.loanLimitWan === null ? Number.POSITIVE_INFINITY : input.loanLimitWan / loanRate;
  const maxOfferWan = Math.max(0, Math.min(maxByCashWan, maxByLoanWan));
  const estimatedLoanWan = maxOfferWan * loanRate;
  const buyerBrokerFeeWan = calculateBrokerageFeeWan(maxOfferWan, input.buyerBrokerFeeRatePercent);
  const requiredCashWan = maxOfferWan - estimatedLoanWan;
  const totalFundingNeedWan = maxOfferWan + buyerBrokerFeeWan + fixedCostsWan;
  const cashUsedWan = requiredCashWan + buyerBrokerFeeWan + fixedCostsWan;
  const cashRemainingWan = input.availableCashWan - cashUsedWan;

  return {
    maxOfferWan,
    estimatedLoanWan,
    requiredCashWan,
    buyerBrokerFeeWan,
    purchaseExtraCostsWan: fixedCostsWan + buyerBrokerFeeWan,
    totalFundingNeedWan,
    cashUsedWan,
    suggestedOfferReductionWan: Math.max(0, -cashRemainingWan)
  };
}
