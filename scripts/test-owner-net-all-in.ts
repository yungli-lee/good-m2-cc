import assert from "node:assert/strict";
import { calculateSellerCarryCosts, validateSellerCarryCostsInput } from "../lib/calculators/seller.ts";

const sample = {
  targetNetWan: 1000, purchaseDate: "2023-05-03", saleDate: "2026-06-22",
  originalCostWan: 800, purchaseBrokerFeeWan: 16, improvementCostsWan: 20,
  saleBrokerFeeRatePercent: 4, landValueIncrementTaxWan: 30,
  notaryAndMiscWan: 3, settlementFeeWan: 2, otherFeesWan: 0,
  houseLandTaxRatePercent: 35
};
const expected = calculateSellerCarryCosts(sample, "allFeesAdded");
assert.equal(expected.suggestedSalePriceWan.toFixed(2), "1189.74");
assert.equal(expected.ownerNetWan.toFixed(2), "1000.00");
assert.equal(expected.holdingPeriodDays, 1146);
assert.equal(validateSellerCarryCostsInput({ ...sample, saleDate: "2023-05-02" }), "預計出售日期不可早於取得日期。");
assert.equal(validateSellerCarryCostsInput({ ...sample, purchaseDate: "bad" }), "日期格式不正確。");
assert.equal(validateSellerCarryCostsInput({ ...sample, targetNetWan: 0 }), "屋主目標實拿金額需大於 0。");
assert.equal(validateSellerCarryCostsInput({ ...sample, saleBrokerFeeRatePercent: 100 }), "出售仲介服務費率需介於 0% 到 100% 之間。");
console.log("owner net all-in calculation tests passed", expected);
