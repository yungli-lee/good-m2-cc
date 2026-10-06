"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { siteDisplaySettingsFromFormData, siteDisplaySettingsSchema } from "@/lib/site-display-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mediaBucketName } from "@/lib/media";

export async function updateSiteDisplaySettingsAction(_state: { error?: string }, formData: FormData) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const parsed = siteDisplaySettingsSchema.safeParse(siteDisplaySettingsFromFormData(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "請確認設定值。" };
  const supabase = await createSupabaseServerClient();
  const values = { ...parsed.data };
  if (values.home_social_image_path) {
    values.home_social_image_url = supabase.storage.from(mediaBucketName).getPublicUrl(values.home_social_image_path).data.publicUrl;
  }
  const { error } = await supabase.from("site_display_settings").update({ ...values, updated_by: current.user.id }).eq("id", "default");
  if (error) return { error: `儲存失敗：${error.message.slice(0, 120)}` };
  revalidatePath("/");
  revalidatePath("/knowledge");
  revalidatePath("/admin/settings/display");
  revalidateTag("home-social-image");
  redirect("/admin/settings/display?saved=1");
}
