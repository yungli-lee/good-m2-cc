import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeEmail, normalizeLineId, normalizePhone } from "./normalize.ts";
import type { PeopleSort } from "./schema.ts";
import type { Person, PersonAssignee, PersonRoleName, PersonSource, PersonStatus } from "./types.ts";

export type AdminPeopleListItem = Person & {
  roles: PersonRoleName[];
  assigned_to_label: string | null;
};

export type PeopleFilters = {
  q?: string;
  role?: PersonRoleName | "all";
  status?: PersonStatus | "all";
  source?: PersonSource | "all";
  assigned_to?: string;
  sort?: PeopleSort;
};

export type PeopleSummary = {
  active: number;
  today: number;
  week: number;
  archived: number;
};

function escapeSearchTerm(value: string) {
  return value.replace(/[%_]/g, "\\$&").replace(/,/g, " ");
}

function taipeiStartOfToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return new Date(Date.UTC(year, month - 1, day) - 8 * 60 * 60 * 1000);
}

function profileLabel(profile: PersonAssignee) {
  return profile.display_name || profile.email || profile.id;
}

async function mapAssigneeLabels(supabase: SupabaseClient, people: Person[]) {
  const ids = Array.from(new Set(people.map((person) => person.assigned_to).filter(Boolean))) as string[];
  if (!ids.length) return new Map<string, string>();

  const { data } = await supabase
    .from("profiles")
    .select("id,email,display_name")
    .in("id", ids);

  return new Map(((data || []) as PersonAssignee[]).map((profile) => [profile.id, profileLabel(profile)]));
}

export async function listPeopleAssignees(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name")
    .is("deleted_at", null)
    .in("role", ["editor", "admin", "owner"])
    .order("display_name", { ascending: true, nullsFirst: false });

  return {
    data: (data || []) as PersonAssignee[],
    error
  };
}

export async function getPeopleSummary(supabase: SupabaseClient): Promise<PeopleSummary> {
  const today = taipeiStartOfToday();
  const week = new Date(today);
  week.setUTCDate(week.getUTCDate() - 6);

  const [active, todayCreated, weekCreated, archived] = await Promise.all([
    supabase.from("people").select("id", { count: "exact", head: true }).eq("status", "active").is("deleted_at", null),
    supabase.from("people").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString()),
    supabase.from("people").select("id", { count: "exact", head: true }).gte("created_at", week.toISOString()),
    supabase.from("people").select("id", { count: "exact", head: true }).eq("status", "archived")
  ]);

  return {
    active: active.count || 0,
    today: todayCreated.count || 0,
    week: weekCreated.count || 0,
    archived: archived.count || 0
  };
}

export async function listAdminPeople(supabase: SupabaseClient, filters: PeopleFilters) {
  const roleFiltered = Boolean(filters.role && filters.role !== "all");
  let query = supabase
    .from("people")
    .select(roleFiltered ? "*, person_roles!inner(role)" : "*, person_roles(role)");

  const q = filters.q?.trim();
  if (q) {
    const term = `%${escapeSearchTerm(q)}%`;
    query = query.or([
      `display_name.ilike.${term}`,
      `legal_name.ilike.${term}`,
      `phone.ilike.${term}`,
      `line_id.ilike.${term}`,
      `email.ilike.${term}`,
      `normalized_phone.ilike.${term}`,
      `normalized_line_id.ilike.${term}`,
      `normalized_email.ilike.${term}`
    ].join(","));
  }

  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.source && filters.source !== "all") query = query.eq("source", filters.source);
  if (filters.assigned_to) query = query.eq("assigned_to", filters.assigned_to);
  if (roleFiltered) query = query.eq("person_roles.role", filters.role);

  if (filters.sort === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else if (filters.sort === "last_contacted_at") {
    query = query.order("last_contacted_at", { ascending: false, nullsFirst: false });
  } else if (filters.sort === "display_name") {
    query = query.order("display_name", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query.limit(150);
  if (error) return { data: [] as AdminPeopleListItem[], error };

  const rows = (data || []) as Array<Person & { person_roles?: Array<{ role: PersonRoleName }> }>;
  const labels = await mapAssigneeLabels(supabase, rows);

  return {
    data: rows.map((person) => ({
      ...person,
      roles: (person.person_roles || []).map((role) => role.role),
      assigned_to_label: person.assigned_to ? labels.get(person.assigned_to) || person.assigned_to : null
    })),
    error: null
  };
}

export async function getAdminPerson(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("people")
    .select("*, person_roles(id,role,created_at,created_by)")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return { data: null, error };

  const person = data as Person & { person_roles?: Array<{ id: string; role: PersonRoleName; created_at: string; created_by: string | null }> };
  const labels = await mapAssigneeLabels(supabase, [person]);

  return {
    data: {
      ...person,
      roles: (person.person_roles || []).map((role) => role.role),
      assigned_to_label: person.assigned_to ? labels.get(person.assigned_to) || person.assigned_to : null
    } as AdminPeopleListItem,
    error: null
  };
}

export function buildPersonPayload(input: {
  display_name: string;
  legal_name?: string | null;
  phone?: string | null;
  line_id?: string | null;
  email?: string | null;
  address?: string | null;
  source: PersonSource;
  status: PersonStatus;
  assigned_to?: string | null;
  notes?: string | null;
}) {
  const phone = input.phone?.trim() || null;
  const lineId = input.line_id?.trim() || null;
  const email = input.email?.trim() || null;

  return {
    name: input.display_name.trim(),
    display_name: input.display_name.trim(),
    legal_name: input.legal_name?.trim() || null,
    phone,
    normalized_phone: normalizePhone(phone),
    line_id: lineId,
    normalized_line_id: normalizeLineId(lineId),
    email,
    address: input.address?.trim() || null,
    normalized_email: normalizeEmail(email),
    source: input.source,
    status: input.status,
    assigned_to: input.assigned_to || null,
    notes: input.notes?.trim() || null
  };
}
