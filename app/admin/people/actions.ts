"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { buildPersonPayload } from "@/lib/people/queries";
import type { PersonFormState } from "@/lib/people/schema";
import {
  personFieldErrors,
  personFormSchema,
  personValuesFromFormData
} from "@/lib/people/schema";
import type { PersonRoleName } from "@/lib/people/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function userEmail(current: Awaited<ReturnType<typeof requireRole>>) {
  return current.user.email || current.profile.email || null;
}

async function tryRecordAuditLog(input: Parameters<typeof recordAuditLog>[0]) {
  try {
    await recordAuditLog(input);
  } catch {
    // Audit should not block CRM writes.
  }
}

function personWriteErrorMessage(error: { code?: string; message?: string }) {
  if (error.code === "42501") return "資料庫權限不足，請確認 people RLS policy。";
  if (error.code === "23514") return "欄位內容不符合允許值，請重新確認。";
  return "客戶資料儲存失敗，請稍後再試。";
}

async function syncPersonRoles({
  personId,
  nextRoles,
  previousRoles,
  userId,
  email
}: {
  personId: string;
  nextRoles: PersonRoleName[];
  previousRoles: PersonRoleName[];
  userId: string;
  email: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const next = new Set(nextRoles);
  const previous = new Set(previousRoles);
  const toAdd = nextRoles.filter((role) => !previous.has(role));
  const toRemove = previousRoles.filter((role) => !next.has(role));

  if (toRemove.length) {
    const { error } = await supabase
      .from("person_roles")
      .delete()
      .eq("person_id", personId)
      .in("role", toRemove);
    if (error) throw error;

    await Promise.all(toRemove.map((role) => tryRecordAuditLog({
      action: "people_role_removed",
      resourceType: "person_role",
      resourceId: personId,
      beforeData: { person_id: personId, role },
      userId,
      userEmail: email
    })));
  }

  if (toAdd.length) {
    const { data, error } = await supabase
      .from("person_roles")
      .insert(toAdd.map((role) => ({
        person_id: personId,
        role,
        created_by: userId
      })))
      .select();
    if (error) throw error;

    await Promise.all((data || []).map((role) => tryRecordAuditLog({
      action: "people_role_added",
      resourceType: "person_role",
      resourceId: role.id,
      afterData: role,
      userId,
      userEmail: email
    })));
  }
}

export async function createPersonAction(
  _previousState: PersonFormState,
  formData: FormData
): Promise<PersonFormState> {
  const current = await requireRole(["editor", "admin", "owner"]);
  const values = personValuesFromFormData(formData);
  const parsed = personFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      values,
      fieldErrors: personFieldErrors(parsed.error),
      formError: "請確認欄位內容後再送出。"
    };
  }

  const supabase = await createSupabaseServerClient();
  const payload = buildPersonPayload(parsed.data);
  const { data, error } = await supabase
    .from("people")
    .insert({
      ...payload,
      created_by: current.user.id,
      updated_by: current.user.id
    })
    .select()
    .single();

  if (error) {
    return {
      values,
      fieldErrors: {},
      formError: personWriteErrorMessage(error)
    };
  }

  try {
    await syncPersonRoles({
      personId: data.id,
      nextRoles: parsed.data.roles,
      previousRoles: [],
      userId: current.user.id,
      email: userEmail(current)
    });
  } catch {
    return {
      values,
      fieldErrors: {},
      formError: "客戶已建立，但角色儲存失敗，請進入編輯頁重新設定。"
    };
  }

  await tryRecordAuditLog({
    action: "people_created",
    resourceType: "person",
    resourceId: data.id,
    afterData: data,
    userId: current.user.id,
    userEmail: userEmail(current)
  });

  revalidatePath("/admin/people");
  redirect(`/admin/people/${data.id}?saved=created`);
}

export async function updatePersonAction(
  id: string,
  _previousState: PersonFormState,
  formData: FormData
): Promise<PersonFormState> {
  const current = await requireRole(["editor", "admin", "owner"]);
  const values = personValuesFromFormData(formData);
  const parsed = personFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      values,
      fieldErrors: personFieldErrors(parsed.error),
      formError: "請確認欄位內容後再送出。"
    };
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: before }, { data: roleRows }] = await Promise.all([
    supabase.from("people").select("*").eq("id", id).maybeSingle(),
    supabase.from("person_roles").select("role").eq("person_id", id)
  ]);
  if (!before) redirect("/admin/people?error=not_found");

  const previousRoles = ((roleRows || []) as Array<{ role: PersonRoleName }>).map((role) => role.role);
  const payload = buildPersonPayload(parsed.data);
  const { data, error } = await supabase
    .from("people")
    .update({
      ...payload,
      updated_by: current.user.id,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return {
      values,
      fieldErrors: {},
      formError: personWriteErrorMessage(error)
    };
  }

  try {
    await syncPersonRoles({
      personId: id,
      nextRoles: parsed.data.roles,
      previousRoles,
      userId: current.user.id,
      email: userEmail(current)
    });
  } catch {
    return {
      values,
      fieldErrors: {},
      formError: "客戶資料已儲存，但角色更新失敗，請再試一次。"
    };
  }

  await tryRecordAuditLog({
    action: "people_updated",
    resourceType: "person",
    resourceId: id,
    beforeData: before,
    afterData: data,
    userId: current.user.id,
    userEmail: userEmail(current)
  });

  revalidatePath("/admin/people");
  revalidatePath(`/admin/people/${id}`);
  redirect(`/admin/people/${id}?saved=updated`);
}

export async function archivePersonAction(id: string) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase
    .from("people")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!before) redirect("/admin/people?error=not_found");

  const { data, error } = await supabase
    .from("people")
    .update({
      status: "archived",
      deleted_at: new Date().toISOString(),
      updated_by: current.user.id,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select()
    .single();
  if (error) redirect(`/admin/people/${id}?error=archive_failed`);

  await tryRecordAuditLog({
    action: "people_deleted",
    resourceType: "person",
    resourceId: id,
    beforeData: before,
    afterData: data,
    userId: current.user.id,
    userEmail: userEmail(current)
  });

  revalidatePath("/admin/people");
  redirect(`/admin/people/${id}?saved=archived`);
}
