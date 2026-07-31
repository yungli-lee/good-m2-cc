import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPersonPayload } from "../lib/people/queries.ts";
import {
  defaultPersonFormValues,
  normalizePersonFormValues,
  personFormSchema
} from "../lib/people/schema.ts";

const defaults = defaultPersonFormValues();
assert.equal(defaults.address, "");
assert.equal(personFormSchema.safeParse(defaults).success, false, "display name remains required");

const values = {
  ...defaults,
  display_name: "新增客戶",
  email: "",
  address: " 彰化縣測試路 2 號 ",
  notes: "建立備註"
};
const normalized = normalizePersonFormValues(values);
assert.equal(normalized.address, "彰化縣測試路 2 號");

const payload = buildPersonPayload(normalized);
assert.equal(payload.address, "彰化縣測試路 2 號");
assert.equal(payload.email, null);

const createPage = readFileSync("app/admin/people/new/page.tsx", "utf8");
const editPage = readFileSync("app/admin/people/[id]/edit/page.tsx", "utf8");
const detailPage = readFileSync("app/admin/people/[id]/page.tsx", "utf8");
const form = readFileSync("components/admin/people-form.tsx", "utf8");
const actions = readFileSync("app/admin/people/actions.ts", "utf8");

assert.match(createPage, /action=\{createPersonAction\}/);
assert.match(actions, /export async function createPersonAction/);
assert.match(actions, /buildPersonPayload\(parsed\.data\)/);
assert.match(editPage, /address: person\.address \|\| ""/);
assert.match(detailPage, /Field label="地址" value=\{person\.address\}/);
assert.match(form, /name="address"/);

console.log("people create and detail validation: PASS");
