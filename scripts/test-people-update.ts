import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  handlePersonPatch,
  type PersonPatchDependencies
} from "../lib/people/patch.ts";
import type { PersonRoleName } from "../lib/people/types.ts";

const personId = "00000000-0000-4000-8000-000000000001";
const validBody = {
  display_name: "測試客戶",
  legal_name: "",
  phone: " 0912345678 ",
  line_id: "",
  email: "",
  address: " 台北市測試路 1 號 ",
  source: "manual",
  status: "active",
  owner_id: "",
  roles: ["seller"],
  note: "第一行\n第二行"
};

type Captures = {
  updatedPayloads: Array<Record<string, unknown>>;
  addedRoles: PersonRoleName[];
  removedRoles: PersonRoleName[];
};

function makeDependencies(
  overrides: Partial<PersonPatchDependencies> = {}
): { dependencies: PersonPatchDependencies; captures: Captures } {
  const captures: Captures = {
    updatedPayloads: [],
    addedRoles: [],
    removedRoles: []
  };
  const dependencies: PersonPatchDependencies = {
    async getCurrentProfile() {
      return {
        user: { id: "00000000-0000-4000-8000-000000000099", email: "editor@example.com" },
        profile: { role: "editor", email: "editor@example.com" }
      };
    },
    async getPerson() {
      return { data: { id: personId, display_name: "原客戶" }, error: null };
    },
    async getRoles() {
      return { data: [{ role: "buyer" }], error: null };
    },
    async updatePerson(_id, payload) {
      captures.updatedPayloads.push(payload);
      return { data: { id: personId, ...payload }, error: null };
    },
    async removeRoles(_id, roles) {
      captures.removedRoles.push(...roles);
      return { error: null };
    },
    async addRoles(_id, roles) {
      captures.addedRoles.push(...roles);
      return { data: roles.map((role) => ({ role })), error: null };
    },
    async recordAudit() {},
    ...overrides
  };
  return { dependencies, captures };
}

function patchRequest(body: unknown) {
  return new Request(`https://preview.example.com/api/admin/people/${personId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function responseJson(response: Response) {
  return await response.json() as Record<string, unknown>;
}

{
  const { dependencies, captures } = makeDependencies();
  const response = await handlePersonPatch(patchRequest(validBody), personId, dependencies);
  assert.equal(response.status, 200, "PATCH update success");
  const result = await responseJson(response);
  assert.equal(result.ok, true);
  assert.equal(captures.updatedPayloads.length, 1);
  assert.equal(captures.updatedPayloads[0].address, "台北市測試路 1 號", "address create");
  assert.equal(captures.updatedPayloads[0].email, null, "empty email to null");
  assert.equal(captures.updatedPayloads[0].notes, "第一行\n第二行", "note multiline");
  assert.deepEqual(captures.addedRoles, ["seller"], "roles update");
  assert.deepEqual(captures.removedRoles, ["buyer"]);
}

{
  const { dependencies, captures } = makeDependencies();
  const response = await handlePersonPatch(
    patchRequest({ ...validBody, address: "新地址" }),
    personId,
    dependencies
  );
  assert.equal(response.status, 200);
  assert.equal(captures.updatedPayloads[0].address, "新地址", "address update");
}

{
  const { dependencies, captures } = makeDependencies();
  const response = await handlePersonPatch(
    patchRequest({ ...validBody, address: "   " }),
    personId,
    dependencies
  );
  assert.equal(response.status, 200);
  assert.equal(captures.updatedPayloads[0].address, null, "address clear to null");
}

{
  const { dependencies } = makeDependencies();
  const response = await handlePersonPatch(patchRequest(validBody), "not-a-uuid", dependencies);
  assert.equal(response.status, 400, "invalid UUID");
}

{
  const { dependencies } = makeDependencies();
  const response = await handlePersonPatch(
    patchRequest({ ...validBody, display_name: "" }),
    personId,
    dependencies
  );
  assert.equal(response.status, 400, "invalid payload");
  assert.equal((await responseJson(response)).code, "PERSON_VALIDATION");
}

{
  const { dependencies } = makeDependencies({
    async getCurrentProfile() {
      return null;
    }
  });
  const response = await handlePersonPatch(patchRequest(validBody), personId, dependencies);
  assert.equal(response.status, 401, "unauthenticated");
}

{
  const { dependencies } = makeDependencies({
    async getCurrentProfile() {
      return {
        user: { id: "viewer" },
        profile: { role: "viewer" }
      };
    }
  });
  const response = await handlePersonPatch(patchRequest(validBody), personId, dependencies);
  assert.equal(response.status, 403, "forbidden");
}

{
  const { dependencies } = makeDependencies({
    async getPerson() {
      return { data: null, error: null };
    }
  });
  const response = await handlePersonPatch(patchRequest(validBody), personId, dependencies);
  assert.equal(response.status, 404, "not found");
}

{
  const { dependencies } = makeDependencies({
    async updatePerson() {
      return {
        data: null,
        error: { code: "SECRET_DB_CODE" }
      };
    }
  });
  const response = await handlePersonPatch(patchRequest(validBody), personId, dependencies);
  assert.equal(response.status, 500, "DB failure");
  const serialized = JSON.stringify(await responseJson(response));
  assert.doesNotMatch(serialized, /SECRET_DB_CODE|token|cookie/i, "safe 500");
}

const routeSource = readFileSync("app/api/admin/people/[id]/route.ts", "utf8");
const formSource = readFileSync("components/admin/people-form.tsx", "utf8");
const editSource = readFileSync("app/admin/people/[id]/edit/page.tsx", "utf8");
const detailSource = readFileSync("app/admin/people/[id]/page.tsx", "utf8");
const createSource = readFileSync("app/admin/people/new/page.tsx", "utf8");
const activitySource = readFileSync("app/api/admin/people-activities/route.ts", "utf8");
const relationSource = readFileSync("app/api/admin/people-properties/route.ts", "utf8");

assert.match(routeSource, /export const runtime = "edge"/);
assert.match(routeSource, /export async function PATCH/);
assert.match(routeSource, /\.from\("people"\)[\s\S]*\.update\(payload\)[\s\S]*\.eq\("id", personId\)[\s\S]*\.select\(\)[\s\S]*\.single\(\)/);
assert.doesNotMatch(editSource, /updatePersonAction/, "edit no longer imports the Server Action");
assert.match(editSource, /personId=\{person\.id\}/);
assert.match(formSource, /method: "PATCH"/, "UI calls PATCH route");
assert.match(formSource, /fetch\(`\/api\/admin\/people\/\$\{personId\}`/);
assert.match(formSource, /action=\{personId \? undefined : formAction\}/, "edit form has no action");
assert.doesNotMatch(formSource, /next-action/i, "UI submit has no next-action wiring");
assert.match(formSource, /router\.push\(`\/admin\/people\/\$\{personId\}`\)/, "success redirects detail");
assert.match(formSource, /setApiError/, "failure displays error");
assert.doesNotMatch(formSource, /\.reset\(\)/, "failure preserves values");
assert.match(detailSource, /Field label="地址" value=\{person\.address\}/, "People detail");
assert.match(createSource, /action=\{createPersonAction\}/, "People create retained");
assert.match(activitySource, /export async function POST/, "People activities regression");
assert.match(relationSource, /export async function POST/, "People–Property regression");

console.log("people update route and UI validation: PASS");
