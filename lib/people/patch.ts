import { z } from "zod";
import { buildPersonPayload } from "./queries.ts";
import { personFieldErrors, personFormSchema } from "./schema.ts";
import type { PersonFormValues } from "./schema.ts";
import type { PersonRoleName } from "./types.ts";

const personIdSchema = z.string().uuid();
const writeRoles = new Set(["editor", "admin", "owner"]);

type CurrentPersonEditor = {
  user: { id: string; email?: string | null };
  profile: { role: string; email?: string | null };
};

type DatabaseResult<T> = {
  data: T | null;
  error: { code?: string } | null;
};

export type PersonPatchDependencies = {
  getCurrentProfile: () => Promise<CurrentPersonEditor | null>;
  getPerson: (id: string) => Promise<DatabaseResult<Record<string, unknown>>>;
  getRoles: (id: string) => Promise<DatabaseResult<Array<{ role: PersonRoleName }>>>;
  updatePerson: (
    id: string,
    payload: Record<string, unknown>
  ) => Promise<DatabaseResult<Record<string, unknown>>>;
  removeRoles: (id: string, roles: PersonRoleName[]) => Promise<{ error: { code?: string } | null }>;
  addRoles: (
    id: string,
    roles: PersonRoleName[],
    userId: string
  ) => Promise<DatabaseResult<Array<Record<string, unknown>>>>;
  recordAudit: (input: {
    action: "people_updated" | "people_role_added" | "people_role_removed";
    resourceType: string;
    resourceId: string;
    beforeData?: unknown;
    afterData?: unknown;
    userId: string;
    userEmail: string | null;
  }) => Promise<void>;
};

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status });
}

function safeDatabaseError(code = "PERSON_UPDATE_FAILED") {
  return json(500, {
    ok: false,
    code,
    message: "客戶資料儲存失敗，請稍後再試。"
  });
}

function requestValues(body: unknown): PersonFormValues | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const input = body as Record<string, unknown>;
  return {
    display_name: typeof input.display_name === "string" ? input.display_name : "",
    legal_name: typeof input.legal_name === "string" ? input.legal_name : "",
    phone: typeof input.phone === "string" ? input.phone : "",
    line_id: typeof input.line_id === "string" ? input.line_id : "",
    email: typeof input.email === "string" ? input.email : "",
    address: typeof input.address === "string" ? input.address : "",
    source: typeof input.source === "string" ? input.source as PersonFormValues["source"] : "manual",
    status: typeof input.status === "string" ? input.status as PersonFormValues["status"] : "active",
    assigned_to: typeof input.owner_id === "string" ? input.owner_id : "",
    notes: typeof input.note === "string" ? input.note : "",
    roles: Array.isArray(input.roles)
      ? input.roles.filter((role): role is PersonRoleName => typeof role === "string") as PersonRoleName[]
      : []
  };
}

async function bestEffortAudit(
  dependencies: PersonPatchDependencies,
  input: Parameters<PersonPatchDependencies["recordAudit"]>[0]
) {
  try {
    await dependencies.recordAudit(input);
  } catch {
    // Audit failure must not change the API result after a successful CRM write.
  }
}

export async function handlePersonPatch(
  request: Request,
  id: string,
  dependencies: PersonPatchDependencies
): Promise<Response> {
  const current = await dependencies.getCurrentProfile();
  if (!current) {
    return json(401, { ok: false, code: "UNAUTHENTICATED", message: "請先登入。" });
  }
  if (!writeRoles.has(current.profile.role)) {
    return json(403, { ok: false, code: "PERSON_FORBIDDEN", message: "你沒有修改客戶資料的權限。" });
  }
  if (!personIdSchema.safeParse(id).success) {
    return json(400, { ok: false, code: "INVALID_PERSON_ID", message: "客戶識別碼格式有誤。" });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, code: "INVALID_JSON", message: "請提供有效的 JSON 資料。" });
  }

  const values = requestValues(body);
  const parsed = personFormSchema.safeParse(values);
  if (!parsed.success) {
    return json(400, {
      ok: false,
      code: "PERSON_VALIDATION",
      message: "請確認欄位內容後再送出。",
      fieldErrors: personFieldErrors(parsed.error)
    });
  }

  const [personResult, rolesResult] = await Promise.all([
    dependencies.getPerson(id),
    dependencies.getRoles(id)
  ]);
  if (personResult.error || rolesResult.error) return safeDatabaseError("PERSON_LOOKUP_FAILED");
  if (!personResult.data) {
    return json(404, { ok: false, code: "PERSON_NOT_FOUND", message: "找不到指定的客戶。" });
  }

  const payload = buildPersonPayload(parsed.data);
  const updated = await dependencies.updatePerson(id, {
    ...payload,
    updated_by: current.user.id,
    updated_at: new Date().toISOString()
  });
  if (updated.error || !updated.data) return safeDatabaseError();

  const previousRoles = (rolesResult.data || []).map((row) => row.role);
  const previous = new Set(previousRoles);
  const next = new Set(parsed.data.roles);
  const toRemove = previousRoles.filter((role) => !next.has(role));
  const toAdd = parsed.data.roles.filter((role) => !previous.has(role));

  if (toRemove.length) {
    const removed = await dependencies.removeRoles(id, toRemove);
    if (removed.error) return safeDatabaseError("PERSON_ROLES_UPDATE_FAILED");
  }
  if (toAdd.length) {
    const added = await dependencies.addRoles(id, toAdd, current.user.id);
    if (added.error) return safeDatabaseError("PERSON_ROLES_UPDATE_FAILED");
  }

  const email = current.user.email || current.profile.email || null;
  await Promise.all([
    ...toRemove.map((role) => bestEffortAudit(dependencies, {
      action: "people_role_removed",
      resourceType: "person_role",
      resourceId: id,
      beforeData: { person_id: id, role },
      userId: current.user.id,
      userEmail: email
    })),
    ...toAdd.map((role) => bestEffortAudit(dependencies, {
      action: "people_role_added",
      resourceType: "person_role",
      resourceId: id,
      afterData: { person_id: id, role },
      userId: current.user.id,
      userEmail: email
    })),
    bestEffortAudit(dependencies, {
      action: "people_updated",
      resourceType: "person",
      resourceId: id,
      beforeData: personResult.data,
      afterData: updated.data,
      userId: current.user.id,
      userEmail: email
    })
  ]);

  return json(200, {
    ok: true,
    message: "客戶資料已更新。",
    person_id: id
  });
}
