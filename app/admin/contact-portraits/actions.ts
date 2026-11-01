"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 5 * 1024 * 1024;
const marker = (key: string, url: string) => `<!-- contact-portrait:${key} ${url} -->`;

export async function saveContactPortraitAction(formData: FormData) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const key = String(formData.get("person") || "");
  if (key !== "ayong" && key !== "amei") redirect("/admin/contact-portraits?error=person");

  const file = formData.get("portrait");
  if (!(file instanceof File) || !file.size) redirect("/admin/contact-portraits?error=missing");
  if (!allowedTypes.has(file.type) || file.size > maxBytes) redirect("/admin/contact-portraits?error=format");

  const supabase = await createSupabaseServerClient();
  const { data: page, error: pageError } = await supabase
    .from("site_pages")
    .select("id,markdown_content")
    .eq("page_type", "contact")
    .eq("status", "published")
    .is("archived_at", null)
    .eq("show_as_page", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (pageError || !page) redirect("/admin/contact-portraits?error=page");

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const storagePath = `${current.user.id}/contact-${key}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("company-assets").upload(storagePath, file, {
    contentType: file.type,
    upsert: false
  });
  if (uploadError) {
    console.error("contact_portrait_upload_failed", { code: uploadError.name });
    redirect("/admin/contact-portraits?error=upload");
  }
  const { data: publicFile } = supabase.storage.from("company-assets").getPublicUrl(storagePath);
  const url = publicFile.publicUrl;
  if (!url) redirect("/admin/contact-portraits?error=upload");

  const original = String(page.markdown_content || "");
  const cleaned = original.replace(/<!-- contact-portrait:(?:ayong|amei) https:\/\/[^\s<>]+ -->\s*/g, (match) =>
    match.startsWith(`<!-- contact-portrait:${key} `) ? "" : match
  );
  const next = `${cleaned.trimEnd()}\n${marker(key, url)}\n`;
  const { data: saved, error: saveError } = await supabase
    .from("site_pages")
    .update({ markdown_content: next, updated_by: current.user.id, updated_at: new Date().toISOString() })
    .eq("id", page.id)
    .eq("markdown_content", page.markdown_content)
    .select("id")
    .maybeSingle();
  if (saveError || !saved) {
    console.error("contact_portrait_save_failed", { code: saveError?.code || "concurrent_edit" });
    redirect("/admin/contact-portraits?error=save");
  }
  revalidatePath("/contact");
  revalidatePath("/admin/contact-portraits");
  redirect(`/admin/contact-portraits?saved=${key}`);
}
