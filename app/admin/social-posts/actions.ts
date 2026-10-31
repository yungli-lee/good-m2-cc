"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function validLink(raw:string) {
  const value=raw.trim();
  if(!value)return null;
  if(value.length>2048)throw new Error("連結過長");
  try {const url=new URL(value);if(!["http:","https:"].includes(url.protocol))throw new Error();
    return url.toString();} catch {throw new Error("連結必須是有效的 http/https URL");}
}
const permitted = ["property", "knowledge", "daily", "general"];
const states = ["draft", "ready", "posted", "archived"];

export async function createSocialPost(formData: FormData) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const title = String(formData.get("title") || "").trim().slice(0, 200);
  const body = String(formData.get("body") || "").trim().slice(0, 20000);
  const category = String(formData.get("category") || "general");
  const destination_notes = String(formData.get("destination_notes") || "").trim().slice(0, 4000);
  const link_url=validLink(String(formData.get("link_url")||""));
  if (!title || !permitted.includes(category)) return;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("social_posts").insert({
    author_id: current.user.id, title, body, category, destination_notes, link_url, status: "draft"
  });
  if (error) throw new Error("貼文草稿儲存失敗");
  revalidatePath("/admin/social-posts");
}

export async function updateSocialPost(id: string, formData: FormData) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const status = String(formData.get("status") || "");
  if (!states.includes(status)) return;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("social_posts").update({
    status,
    posted_at: status === "posted" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  }).eq("id", id).eq("author_id", current.user.id);
  if (error) throw new Error("貼文狀態更新失敗");
  revalidatePath("/admin/social-posts");
}

export async function deleteSocialPost(id: string) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("social_posts").delete().eq("id", id).eq("author_id", current.user.id).is("facebook_post_id",null);
  if (error) throw new Error("刪除貼文失敗");
  revalidatePath("/admin/social-posts");
}

export async function editSocialPost(id: string, formData: FormData) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const title = String(formData.get("title") || "").trim().slice(0, 200);
  const body = String(formData.get("body") || "").trim().slice(0, 20000);
  const category = String(formData.get("category") || "general");
  const destination_notes = String(formData.get("destination_notes") || "").trim().slice(0, 4000);
  const link_url=validLink(String(formData.get("link_url")||""));
  if (!title || !permitted.includes(category)) throw new Error("請填寫標題與有效分類");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("social_posts").update({
    title, body, category, destination_notes, link_url, updated_at: new Date().toISOString()
  }).eq("id", id).eq("author_id", current.user.id).in("status", ["draft", "ready"]);
  if (error) throw new Error("編輯草稿失敗");
  revalidatePath("/admin/social-posts");
}
