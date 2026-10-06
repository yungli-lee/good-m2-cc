import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const relationshipTypes = ["owner","buyer","viewer","negotiator","tenant","landlord","referrer","contact","other"] as const;
export const relationshipLabels: Record<(typeof relationshipTypes)[number], string> = { owner:"屋主", buyer:"買方", viewer:"帶看客戶", negotiator:"議價客戶", tenant:"承租人", landlord:"出租人", referrer:"介紹人", contact:"一般聯絡人", other:"其他" };
export const relationInputSchema = z.object({ person_id:z.string().uuid(), property_id:z.string().uuid(), relationship_type:z.enum(relationshipTypes), relationship_label:z.string().trim().max(120).optional().or(z.literal("")), note:z.string().trim().max(2000).optional().or(z.literal("")), started_at:z.string().optional().or(z.literal("")), ended_at:z.string().optional().or(z.literal("")) }).superRefine((value, ctx) => { if (value.relationship_type === "other" && !value.relationship_label?.trim()) ctx.addIssue({ code:"custom", path:["relationship_label"], message:"請輸入其他關係名稱" }); if (value.relationship_type !== "other" && value.relationship_label?.trim()) ctx.addIssue({ code:"custom", path:["relationship_label"], message:"非其他關係不得填寫自訂名稱" }); if (value.started_at && value.ended_at && value.ended_at < value.started_at) ctx.addIssue({ code:"custom", path:["ended_at"], message:"結束日期不得早於開始日期" }); });
export type RelationInput = z.infer<typeof relationInputSchema>;
export type PersonPropertyRelation = RelationInput & { id:string; status:"active"|"archived"; ended_at:string|null; archived_at:string|null; created_at:string; updated_at:string; property?: { id:string; title:string; slug:string; address_public:string|null; listing_no:string|null } | null; person?: { id:string; display_name:string; legal_name:string|null; phone:string|null; email:string|null } | null };
export const activityTypes = ["visit", "phone", "line", "sms", "email", "initial_contact", "requirement_discussion", "other", "requirement_created", "requirement_updated", "requirement_paused", "requirement_resumed", "requirement_closed", "requirement_archived", "requirement_deleted", "requirement_duplicated"] as const;
export const activityLabels: Record<(typeof activityTypes)[number], string> = { visit: "拜訪", phone: "電話", line: "LINE", sms: "簡訊", email: "Email", initial_contact: "初次接觸", requirement_discussion: "需求了解", other: "其他", requirement_created: "新增客需", requirement_updated: "修改客需", requirement_paused: "暫停客需", requirement_resumed: "恢復客需", requirement_closed: "完成客需", requirement_archived: "封存客需", requirement_deleted: "刪除客需", requirement_duplicated: "複製客需" };
export type PersonActivity = { id: string; person_id: string; activity_type: (typeof activityTypes)[number]; activity_date: string; note: string | null; created_by: string | null; created_at: string; };

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
export async function listPersonActivities(supabase: SupabaseClient, personId: string) {
  return supabase.from("people_activities").select("id,person_id,activity_type,activity_date,note,created_by,created_at").eq("person_id", personId).is("archived_at", null).order("activity_date", { ascending: false }).order("created_at", { ascending: false });
}
