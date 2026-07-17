"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  personActivityEditSchema,
  personActivityFormSchema,
  taipeiDateTimeToIso
} from "@/lib/people/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function activityValues(formData: FormData) {
  return {
    activity_type: String(formData.get("activity_type") || ""),
    channel: String(formData.get("channel") || ""),
    summary: String(formData.get("summary") || ""),
    details: String(formData.get("details") || ""),
    occurred_at: String(formData.get("occurred_at") || ""),
    follow_up_mode: String(formData.get("follow_up_mode") || "keep"),
    next_follow_up_at: String(formData.get("next_follow_up_at") || "")
  };
}

function activityRedirect(personId: string, code: string, type: "error" | "saved"): never {
  redirect(`/admin/people/${personId}?${type}=${code}#activity-timeline`);
}

export async function createPersonActivityAction(personId: string, formData: FormData) {
  await requireRole(["editor", "admin", "owner"]);
  const parsed = personActivityFormSchema.safeParse(activityValues(formData));
  if (!parsed.success) activityRedirect(personId, "activity_invalid", "error");

  const input = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("create_person_activity", {
    p_person_id: personId,
    p_activity_type: input.activity_type,
    p_channel: input.channel || null,
    p_summary: input.summary,
    p_details: input.details || null,
    p_occurred_at: taipeiDateTimeToIso(input.occurred_at),
    p_follow_up_mode: input.follow_up_mode,
    p_next_follow_up_at: input.next_follow_up_at ? taipeiDateTimeToIso(input.next_follow_up_at) : null
  });

  if (error) {
    console.error("person_activity_create_failed", { code: error.code, message: error.message });
    activityRedirect(personId, error.code === "42501" ? "forbidden" : "activity_create_failed", "error");
  }

  revalidatePath("/admin/people");
  revalidatePath(`/admin/people/${personId}`);
  activityRedirect(personId, "activity_created", "saved");
}

export async function updatePersonActivityAction(personId: string, activityId: string, formData: FormData) {
  await requireRole(["editor", "admin", "owner"]);
  const parsed = personActivityEditSchema.safeParse(activityValues(formData));
  if (!parsed.success) activityRedirect(personId, "activity_invalid", "error");

  const input = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("update_person_activity", {
    p_person_id: personId,
    p_activity_id: activityId,
    p_activity_type: input.activity_type,
    p_channel: input.channel || null,
    p_summary: input.summary,
    p_details: input.details || null,
    p_occurred_at: taipeiDateTimeToIso(input.occurred_at)
  });

  if (error) activityRedirect(personId, error.code === "42501" ? "forbidden" : "activity_update_failed", "error");

  revalidatePath(`/admin/people/${personId}`);
  activityRedirect(personId, "activity_updated", "saved");
}

export async function softDeletePersonActivityAction(personId: string, activityId: string) {
  await requireRole(["editor", "admin", "owner"]);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("soft_delete_person_activity", {
    p_person_id: personId,
    p_activity_id: activityId
  });

  if (error) activityRedirect(personId, error.code === "42501" ? "forbidden" : "activity_delete_failed", "error");

  revalidatePath(`/admin/people/${personId}`);
  activityRedirect(personId, "activity_deleted", "saved");
}

export async function updatePersonFollowUpAction(personId: string, formData: FormData) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const value = String(formData.get("next_follow_up_at") || "");
  const parsed = value ? personActivityEditSchema.shape.occurred_at.safeParse(value) : { success: true as const, data: "" };
  if (!parsed.success) activityRedirect(personId, "follow_up_invalid", "error");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("people")
    .update({
      next_follow_up_at: value ? taipeiDateTimeToIso(value) : null,
      updated_by: current.user.id
    })
    .eq("id", personId)
    .select("id")
    .single();

  if (error) activityRedirect(personId, error.code === "42501" ? "forbidden" : "follow_up_update_failed", "error");

  revalidatePath("/admin/people");
  revalidatePath(`/admin/people/${personId}`);
  activityRedirect(personId, value ? "follow_up_updated" : "follow_up_cleared", "saved");
}
