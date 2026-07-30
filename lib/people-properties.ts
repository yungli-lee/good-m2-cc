import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const relationshipTypes = ["owner","buyer","viewer","negotiator","tenant","landlord","referrer","contact","other"] as const;
export const relationshipLabels: Record<(typeof relationshipTypes)[number], string> = { owner:"屋主", buyer:"買方", viewer:"帶看客戶", negotiator:"議價客戶", tenant:"承租人", landlord:"出租人", referrer:"介紹人", contact:"一般聯絡人", other:"其他" };
export const relationInputSchema = z.object({ person_id:z.string().uuid(), property_id:z.string().uuid(), relationship_type:z.enum(relationshipTypes), relationship_label:z.string().trim().max(120).optional().or(z.literal("")), note:z.string().trim().max(2000).optional().or(z.literal("")), started_at:z.string().optional().or(z.literal("")), ended_at:z.string().optional().or(z.literal("")) }).superRefine((value, ctx) => { if (value.started_at && value.ended_at && value.ended_at < value.started_at) ctx.addIssue({ code:"custom", path:["ended_at"], message:"結束日期不得早於開始日期" }); });
export type RelationInput = z.infer<typeof relationInputSchema>;
export type PersonPropertyRelation = RelationInput & { id:string; status:"active"|"archived"; ended_at:string|null; archived_at:string|null; created_at:string; updated_at:string; property?: { id:string; title:string; slug:string; address_public:string|null; listing_no:string|null } | null; person?: { id:string; display_name:string; legal_name:string|null; phone:string|null; email:string|null } | null };

export async function listPersonProperties(supabase: SupabaseClient, personId: string, includeArchived = false) {
  let query = supabase.from("people_properties").select("*, property:properties(id,title,slug,address_public,listing_no)").eq("person_id", personId).order("created_at", { ascending:false });
  if (!includeArchived) query = query.eq("status", "active");
  return query;
}
export async function listPropertyPeople(supabase: SupabaseClient, propertyId: string, includeArchived = false) {
  let query = supabase.from("people_properties").select("*, person:people(id,display_name,legal_name,phone,email)").eq("property_id", propertyId).order("created_at", { ascending:false });
  if (!includeArchived) query = query.eq("status", "active");
  return query;
}
