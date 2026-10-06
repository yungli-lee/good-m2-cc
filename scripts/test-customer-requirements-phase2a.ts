import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { requirementListQuerySchema } from "../lib/customer-requirements/schema.ts";
import { budgetIncludesPrice, listRequirements, priceWithinBudgetFilter, sanitizeRequirementSearch } from "../lib/customer-requirements/queries.ts";

const defaults = requirementListQuerySchema.parse({});
assert.equal(defaults.page, 1);
assert.equal(defaults.pageSize, 20);
assert.equal(defaults.sort, "updated");

const filters = requirementListQuerySchema.parse({
  search: "王先生",
  transactionType: "buy",
  propertyPrice: "2000",
  landAreaMin: "30",
  buildingAreaMin: "40",
  bedroomsMin: "3",
  elevator: "required",
  parking: "not_required",
  purchaseTimeline: "within_3_months",
  createdFrom: "2026-08-01",
  updatedTo: "2026-08-31",
  pageSize: "50",
});
assert.equal(filters.propertyPrice, 2000);
assert.equal(filters.bedroomsMin, 3);
assert.equal(filters.elevator, "required");
assert.equal(filters.pageSize, 50);
assert.equal(sanitizeRequirementSearch("CRM B4.1A"), "CRM B4.1A");
assert.equal(sanitizeRequirementSearch("王先生,()_%"), "王先生");
assert.equal(requirementListQuerySchema.safeParse({ propertyPrice: "not-a-number" }).success, false);
assert.equal(requirementListQuerySchema.safeParse({ createdFrom: "2026/08/01" }).success, false);
assert.equal(requirementListQuerySchema.safeParse({ elevator: "yes" }).success, false);
assert.equal(requirementListQuerySchema.safeParse({ pageSize: 5 }).success, false);

const browserFormQuery = requirementListQuerySchema.parse({
  page: "1",
  search: "",
  personId: "",
  transactionType: "",
  requirementType: "",
  propertyCategory: "",
  city: "彰化縣",
  district: "",
  propertyPrice: "",
  status: "",
  urgency: "",
  assignedUserId: "",
  sort: "updated",
  elevator: "",
  parking: "",
  purchaseTimeline: "",
  createdFrom: "",
  createdTo: "",
  updatedFrom: "",
  updatedTo: "",
  pageSize: "20",
});
assert.equal(browserFormQuery.city, "彰化縣");
assert.equal(browserFormQuery.personId, undefined);
assert.equal(browserFormQuery.transactionType, undefined);
assert.equal(browserFormQuery.district, undefined);
assert.equal(browserFormQuery.elevator, undefined);
assert.equal(browserFormQuery.createdFrom, undefined);

assert.equal(budgetIncludesPrice(0, 12_000_000, 20_000_000), false);
assert.equal(budgetIncludesPrice(0, 20_000_000, 20_000_000), true);
assert.equal(budgetIncludesPrice(0, 22_000_000, 20_000_000), true);
assert.equal(budgetIncludesPrice(21_000_000, 25_000_000, 20_000_000), false);
assert.equal(budgetIncludesPrice(null, 22_000_000, 20_000_000), true);
assert.equal(budgetIncludesPrice(15_000_000, null, 20_000_000), true);
assert.equal(
  priceWithinBudgetFilter("buy", 20_000_000),
  "and(or(sale_budget_min.lte.20000000,sale_budget_min.is.null),or(sale_budget_max.gte.20000000,sale_budget_max.is.null))",
);
assert.equal(
  priceWithinBudgetFilter("rent", 20_000),
  "and(or(rent_budget_min.lte.20000,rent_budget_min.is.null),or(rent_budget_max.gte.20000,rent_budget_max.is.null))",
);
assert.equal(
  priceWithinBudgetFilter(undefined, 20_000_000),
  "and(transaction_type.eq.buy,or(sale_budget_min.lte.20000000,sale_budget_min.is.null),or(sale_budget_max.gte.20000000,sale_budget_max.is.null)),and(transaction_type.eq.rent,or(rent_budget_min.lte.20000000,rent_budget_min.is.null),or(rent_budget_max.gte.20000000,rent_budget_max.is.null))",
);

const queryCalls: Array<[string, unknown]> = [];
const queryBuilder = new Proxy({}, {
  get: (_target, property) => {
    if (property === "then") return undefined;
    return (...args: unknown[]) => {
      queryCalls.push([String(property), args]);
      return property === "range" ? { data: [], count: 0, error: null } : queryBuilder;
    };
  },
});
const fakeSupabase = { from: (table: string) => { queryCalls.push(["from", table]); return queryBuilder; } };
await listRequirements(fakeSupabase as never, { ...defaults, page: 2, pageSize: 20, transactionType: "buy", propertyPrice: 2000 });
const selectCall = queryCalls.find(([name]) => name === "select");
const priceFilterCall = queryCalls.find(([name, args]) => name === "or" && String((args as unknown[])[0]).includes("sale_budget_max.gte.20000000"));
const rangeCall = queryCalls.find(([name]) => name === "range");
assert.deepEqual((selectCall?.[1] as unknown[])[1], { count: "exact" });
assert.ok(priceFilterCall);
assert.deepEqual(rangeCall?.[1], [20, 39]);
assert.ok(queryCalls.indexOf(priceFilterCall!) < queryCalls.indexOf(rangeCall!));

const querySource = readFileSync("lib/customer-requirements/queries.ts", "utf8");
assert.match(querySource, /display_name\.ilike/);
assert.match(querySource, /legal_name\.ilike/);
assert.match(querySource, /phone\.ilike/);
assert.match(querySource, /person_id\.in/);
assert.match(querySource, /tenThousandsToTwd\(f\.propertyPrice\)/);
assert.match(querySource, /priceWithinBudgetFilter/);
assert.match(querySource, /count:"exact"/);
assert.ok(querySource.indexOf("priceWithinBudgetFilter") < querySource.indexOf("q.range"));
assert.match(querySource, /land_area_min/);
assert.match(querySource, /building_area_min/);
assert.match(querySource, /bedrooms_min/);
assert.match(querySource, /elevator_required/);
assert.match(querySource, /parking_required/);
assert.match(querySource, /purchase_timeline/);
assert.match(querySource, /created_at/);
assert.match(querySource, /updated_at/);

const pageSource = readFileSync("app/admin/crm/requirements/page.tsx", "utf8");
assert.match(pageSource, /客需中心/);
assert.match(pageSource, /客戶姓名、電話/);
assert.match(pageSource, /物件價格（萬元）/);
assert.match(pageSource, /更多條件/);
assert.match(pageSource, /搜尋客需/);
assert.match(pageSource, /找不到符合條件的客需/);

const migrationFiles = readFileSync("supabase/migrations/202608020201_crm_customer_requirements_phase_1.sql", "utf8");
assert.match(migrationFiles, /crm_customer_requirements/);
console.log("CRM Customer Requirements Phase 2A tests: PASS (no schema migration required)");
