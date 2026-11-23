import assert from "node:assert/strict";
import { calculateMortgage, validateMortgageInput, type MortgageInput } from "../lib/calculators/mortgage.ts";

const youthRates = [
  { rate: 1.775, startMonth: 1 },
  { rate: 1.900, startMonth: 37 },
  { rate: 2.025, startMonth: 49 },
  { rate: 2.150, startMonth: 61 },
  { rate: 2.275, startMonth: 73 }
];

function youth(overrides: Partial<MortgageInput> = {}): MortgageInput {
  return { amountWan: 1000, years: 40, graceMonths: 36, rates: youthRates, ...overrides };
}

const standard = calculateMortgage(youth());
assert.equal(standard.principal, 10_000_000);
assert.equal(standard.totalMonths, 480);
assert.deepEqual(standard.rows.filter((row) => row.startMonth !== 1 && row.startMonth !== 37).map((r) => r.startMonth), [49, 61, 73]);
assert.equal(standard.rows[0].firstPayment.toFixed(2), (10_000_000 * 0.01775 / 12).toFixed(2));
assert.ok(standard.rows.every((row) => Number.isFinite(row.firstPayment) && row.firstPayment > 0));
assert.ok(standard.totalInterest > 0 && standard.maxPayment > 0);
assert.ok(standard.rows.some((row) => row.startMonth === 37 && row.label.includes("本息攤還")));

const noGrace = calculateMortgage(youth({ graceMonths: 0 }));
assert.equal(noGrace.rows.length, 5);
assert.ok(noGrace.rows[0].firstPrincipal > 0);
assert.ok(noGrace.totalInterest < standard.totalInterest);

const longGrace = calculateMortgage(youth({ graceMonths: 60 }));
assert.ok(longGrace.rows.some((row) => row.startMonth === 61 && row.label.includes("本息攤還")));
assert.ok(longGrace.totalInterest > standard.totalInterest);

const shortTerm = calculateMortgage(youth({ years: 5, graceMonths: 0 }));
assert.equal(shortTerm.totalMonths, 60);
assert.deepEqual(shortTerm.rows.map((row) => row.startMonth), [1, 37, 49]);

const custom = calculateMortgage({
  amountWan: 800, years: 20, graceMonths: 0,
  rates: [{ rate: 2, startMonth: 1 }, { rate: 2.3, startMonth: 37 }, { rate: 2.5, startMonth: 85 }]
});
assert.equal(custom.rows.length, 3);
assert.ok(custom.totalInterest > 0);

assert.ok(validateMortgageInput(youth({ graceMonths: 480 })).length > 0);
assert.ok(validateMortgageInput(youth({ years: 0 })).length > 0);
assert.ok(validateMortgageInput(youth({ rates: [{ rate: 1.775, startMonth: 1 }, { rate: 2, startMonth: 1 }] })).length > 0);
console.log("Mortgage Youth Loan 3.0 and custom rate regression tests passed.");
