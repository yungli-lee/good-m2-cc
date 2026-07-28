import assert from "node:assert/strict";
import { calculateSellerCarryCosts, getStandardIndividualHouseLandTaxRate, validateSellerCarryCostsInput } from "../lib/calculators/seller.ts";

const rate = (a: string, s: string) => {
  const result = getStandardIndividualHouseLandTaxRate(a, s);
  assert.ok("rate" in result);
  return result.rate;
};
assert.equal(rate("2024-06-22", "2026-06-21"), 45);
assert.equal(rate("2024-06-22", "2026-06-22"), 45);
assert.equal(rate("2024-06-22", "2026-06-23"), 35);
assert.equal(rate("2021-06-22", "2026-06-22"), 35);
assert.equal(rate("2021-06-22", "2026-06-23"), 20);
assert.equal(rate("2016-06-22", "2026-06-22"), 20);
assert.equal(rate("2016-06-22", "2026-06-23"), 15);
assert.equal(rate("2024-02-29", "2026-02-28"), 45);
assert.equal(rate("2024-02-29", "2026-03-01"), 35);
assert.equal(rate("2020-02-29", "2025-02-28"), 35);
assert.equal(rate("2020-02-29", "2025-03-01"), 20);
assert.deepEqual(getStandardIndividualHouseLandTaxRate("2026-01-01", "2025-01-01"), { error: "預計出售日期不可早於取得日期。" });

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
