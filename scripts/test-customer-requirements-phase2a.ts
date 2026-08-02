import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { requirementListQuerySchema } from "../lib/customer-requirements/schema.ts";
import { sanitizeRequirementSearch } from "../lib/customer-requirements/queries.ts";

const defaults = requirementListQuerySchema.parse({});
assert.equal(defaults.page, 1);
assert.equal(defaults.pageSize, 20);
assert.equal(defaults.sort, "updated");

const filters = requirementListQuerySchema.parse({
  search: "王先生",
  transactionType: "buy",
  budgetMin: "500",
  budgetMax: "1200",
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
assert.equal(filters.budgetMin, 500);
assert.equal(filters.bedroomsMin, 3);
assert.equal(filters.elevator, "required");
assert.equal(filters.pageSize, 50);
assert.equal(sanitizeRequirementSearch("CRM B4.1A"), "CRM B4.1A");
assert.equal(sanitizeRequirementSearch("王先生,()_%"), "王先生");
assert.equal(requirementListQuerySchema.safeParse({ budgetMin: 900, budgetMax: 800 }).success, false);
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
  budgetMin: "",
  budgetMax: "",
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

const querySource = readFileSync("lib/customer-requirements/queries.ts", "utf8");
assert.match(querySource, /display_name\.ilike/);
assert.match(querySource, /legal_name\.ilike/);
assert.match(querySource, /phone\.ilike/);
assert.match(querySource, /person_id\.in/);
assert.match(querySource, /sale_budget_min\.gte/);
assert.match(querySource, /rent_budget_max\.lte/);
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
assert.match(pageSource, /預算下限至少/);
assert.match(pageSource, /更多條件/);
assert.match(pageSource, /搜尋客需/);
assert.match(pageSource, /找不到符合條件的客需/);

const migrationFiles = readFileSync("supabase/migrations/202608020201_crm_customer_requirements_phase_1.sql", "utf8");
assert.match(migrationFiles, /crm_customer_requirements/);
console.log("CRM Customer Requirements Phase 2A tests: PASS (no schema migration required)");
