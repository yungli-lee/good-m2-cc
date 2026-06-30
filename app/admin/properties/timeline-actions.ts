"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  canCreatePropertyTimeline,
  canManagePropertyTimeline,
  insertPropertyTimelineEvent,
  propertyTimelineFormSchema,
  propertyTimelineValuesFromFormData
} from "@/lib/properties/timeline";

export async function createPropertyTimelineEventAction(propertyId: string, formData: FormData) {
  const current = await requireRole(["editor", "admin", "owner"]);
  if (!canCreatePropertyTimeline(current.profile.role)) redirect("/admin/login?error=forbidden");

  const parsed = propertyTimelineFormSchema.safeParse(propertyTimelineValuesFromFormData(formData));
  if (!parsed.success) {
    redirect(`/admin/properties/${propertyId}/edit?timeline_error=invalid_form`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: property } = await supabase.from("properties").select("id").eq("id", propertyId).is("deleted_at", null).maybeSingle();
  if (!property) redirect("/admin/properties?error=not_found");

  const { error } = await insertPropertyTimelineEvent(supabase, {
    property_id: propertyId,
    event_date: parsed.data.event_date,
    event_type: parsed.data.event_type,
    title: parsed.data.title,
    content: parsed.data.content || null,
    created_by: current.user.id,
    created_by_email: current.user.email || current.profile.email || null
  });

  if (error) redirect(`/admin/properties/${propertyId}/edit?timeline_error=create_failed`);

  revalidatePath(`/admin/properties/${propertyId}/edit`);
  redirect(`/admin/properties/${propertyId}/edit?timeline_saved=1`);
}

export async function deletePropertyTimelineEventAction(propertyId: string, eventId: string) {
  const current = await requireRole(["admin", "owner"]);
  if (!canManagePropertyTimeline(current.profile.role)) redirect("/admin/login?error=forbidden");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("property_timeline_events")
    .delete()
    .eq("id", eventId)
    .eq("property_id", propertyId);

  if (error) redirect(`/admin/properties/${propertyId}/edit?timeline_error=delete_failed`);

  revalidatePath(`/admin/properties/${propertyId}/edit`);
  redirect(`/admin/properties/${propertyId}/edit?timeline_deleted=1`);
}
