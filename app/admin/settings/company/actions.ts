"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  companySettingsSchema,
  companySettingsValuesFromFormData,
  defaultCompanySettings
} from "@/lib/company-settings";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function fieldErrors(error: z.ZodError) {
  return Object.fromEntries(error.issues.map((issue) => [issue.path[0], issue.message]));
}

export async function updateCompanySettingsAction(_previousState: { error?: string; fieldErrors?: Record<string, string> }, formData: FormData) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const values = companySettingsValuesFromFormData(formData);
  const parsed = companySettingsSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: "請確認欄位內容後再儲存。",
      fieldErrors: fieldErrors(parsed.error)
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("company_settings")
    .upsert({
      id: "default",
      ...defaultCompanySettings,
      ...parsed.data,
      updated_by: current.user.id,
      updated_at: new Date().toISOString()
    }, { onConflict: "id" });

  if (error) {
    console.error("company_settings_update_failed", {
      code: error.code,
      message: error.message?.slice(0, 180)
    });
    return { error: "公司資料儲存失敗，請稍後再試。" };
  }

  revalidatePath("/admin/settings/company");
  revalidatePath("/properties");
  redirect("/admin/settings/company?saved=1");
}
