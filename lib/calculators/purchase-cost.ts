export const BUYER_ESCROW_RATE = 3 / 10000;

export type PurchaseCostInput = {
  transactionPriceWan: number;
  loanRatioPercent: number;
  brokerageFeePercent: number;
  assessedBuildingValueWan: number;
  deedTaxPercent: number;
  stampTaxPercent: number;
  scrivenerFeeWan: number;
  registrationMiscFeeWan: number;
};

export type PurchaseCostResult = {
  loanAmountWan: number;
  downPaymentWan: number;
  brokerageFeeWan: number;
  deedTaxWan: number;
  stampTaxWan: number;
  scrivenerFeeWan: number;
  registrationMiscFeeWan: number;
  escrowFeeWan: number;
  otherFeesWan: number;
  totalCashNeededWan: number;
};

export const defaultPurchaseCostInput: PurchaseCostInput = {
  transactionPriceWan: 1000,
  loanRatioPercent: 70,
  brokerageFeePercent: 2,
  assessedBuildingValueWan: 120,
  deedTaxPercent: 6,
  stampTaxPercent: 0.1,
  scrivenerFeeWan: 2,
  registrationMiscFeeWan: 1
};

export function validatePurchaseCostInput(input: PurchaseCostInput) {
  if (input.transactionPriceWan <= 0) return "請輸入正確的成交價。";
  if (input.loanRatioPercent < 0 || input.loanRatioPercent > 100) return "貸款成數請輸入 0 到 100。";
  if (input.brokerageFeePercent < 0 || input.brokerageFeePercent > 10) return "仲介服務費率請輸入 0 到 10%。";
  if (input.assessedBuildingValueWan < 0) return "房屋評定現值不可小於 0。";
  if (input.deedTaxPercent < 0 || input.deedTaxPercent > 100) return "契稅率請輸入 0 到 100%。";
  if (input.stampTaxPercent < 0 || input.stampTaxPercent > 10) return "印花稅率請輸入 0 到 10%。";
  if (input.scrivenerFeeWan < 0) return "代書費不可小於 0。";
  if (input.registrationMiscFeeWan < 0) return "規費與雜支不可小於 0。";
  return "";
}

export function calculatePurchaseCost(input: PurchaseCostInput): PurchaseCostResult {
  const validationMessage = validatePurchaseCostInput(input);
  if (validationMessage) throw new Error(validationMessage);

  const loanAmountWan = input.transactionPriceWan * (input.loanRatioPercent / 100);
  const downPaymentWan = input.transactionPriceWan - loanAmountWan;
  const brokerageFeeWan = input.transactionPriceWan * (input.brokerageFeePercent / 100);
  const deedTaxWan = input.assessedBuildingValueWan * (input.deedTaxPercent / 100);
  const stampTaxWan = input.transactionPriceWan * (input.stampTaxPercent / 100);
  const escrowFeeWan = input.transactionPriceWan * BUYER_ESCROW_RATE;
  const otherFeesWan = input.scrivenerFeeWan + input.registrationMiscFeeWan + escrowFeeWan;

  return {
    loanAmountWan,
    downPaymentWan,
    brokerageFeeWan,
    deedTaxWan,
    stampTaxWan,
    scrivenerFeeWan: input.scrivenerFeeWan,
    registrationMiscFeeWan: input.registrationMiscFeeWan,
    escrowFeeWan,
    otherFeesWan,
    totalCashNeededWan: downPaymentWan + brokerageFeeWan + deedTaxWan + stampTaxWan + otherFeesWan
  };
}
