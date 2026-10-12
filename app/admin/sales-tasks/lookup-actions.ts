"use server";

import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function searchSalesTaskOptions(kind: "person" | "property", keyword: string) {
  await requireRole(["editor", "admin", "owner"]);
  if ((kind !== "person" && kind !== "property") || typeof keyword !== "string" || keyword.length > 80) {
    return { options: [], error: "搜尋條件不正確。" };
  }
  const db = await createSupabaseServerClient();
  const pattern = `%${keyword.trim().replace(/[\\%_]/g, "\\$&")}%`;
  // Use the operator's session and RLS; never fetch private records with a service key.
  const result = kind === "person"
    ? await db.from("people").select("id,display_name").eq("status", "active").is("deleted_at", null)
      .ilike("display_name", pattern).order("display_name").limit(31)
    : await db.from("properties").select("id,title").eq("status", "published").is("deleted_at", null)
      .ilike("title", pattern).order("title").limit(31);
  if (result.error) return { options: [], error: "搜尋失敗，請稍後重試。" };
  const options = (result.data || []).map(row => ({
    id: row.id,
    label: "display_name" in row ? row.display_name : row.title
  }));
  return { options: options.slice(0, 30), hasMore: options.length > 30 };
}
