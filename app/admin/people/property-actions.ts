"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { relationInputSchema } from "@/lib/people-properties";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createPeoplePropertyAction(formData: FormData) {
  const current = await requireRole(["editor","admin","owner"]);
  const parsed = relationInputSchema.safeParse(Object.fromEntries(formData.entries()));
  const personId = String(formData.get("person_id") || "");
  if (!parsed.success) redirect(`/admin/people/${personId}?relation_error=invalid`);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("people_properties").insert({ ...parsed.data, relationship_label: parsed.data.relationship_label || null, note: parsed.data.note || null, started_at: parsed.data.started_at || null, created_by: current.user.id });
  if (error) redirect(`/admin/people/${personId}?relation_error=${error.code === "23505" ? "duplicate" : "save"}`);
  revalidatePath(`/admin/people/${personId}`); revalidatePath(`/admin/properties/${parsed.data.property_id}/edit`); redirect(`/admin/people/${personId}?relation_saved=1`);
}
export async function archivePeoplePropertyAction(id: string, personId: string, propertyId: string) {
  await requireRole(["editor","admin","owner"]); const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("people_properties").update({ status:"archived", archived_at:new Date().toISOString(), ended_at:new Date().toISOString() }).eq("id", id);
  if (error) redirect(`/admin/people/${personId}?relation_error=archive`);
  revalidatePath(`/admin/people/${personId}`); revalidatePath(`/admin/properties/${propertyId}/edit`); redirect(`/admin/people/${personId}?relation_saved=archived`);
}
export async function updatePeoplePropertyAction(formData: FormData) {
  await requireRole(["editor","admin","owner"]);
  const id = String(formData.get("relation_id") || ""); const personId = String(formData.get("person_id") || ""); const propertyId = String(formData.get("property_id") || "");
  const parsed = relationInputSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect(`/admin/people/${personId}?relation_error=invalid`);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("people_properties").update({ relationship_type: parsed.data.relationship_type, relationship_label: parsed.data.relationship_label || null, note: parsed.data.note || null, started_at: parsed.data.started_at || null, ended_at: parsed.data.ended_at || null }).eq("id", id).eq("person_id", personId).eq("property_id", propertyId);
  if (error) redirect(`/admin/people/${personId}?relation_error=${error.code === "23505" ? "duplicate" : "update"}`);
  revalidatePath(`/admin/people/${personId}`); revalidatePath(`/admin/properties/${propertyId}/edit`); redirect(`/admin/people/${personId}?relation_saved=updated`);
}
