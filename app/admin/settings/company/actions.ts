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

function sanitizeDbError(error: { code?: string; message?: string; details?: string | null } | null) {
  return {
    code: error?.code || "unknown",
    message: (error?.message || "Unknown database error").slice(0, 180),
    details: error?.details?.slice(0, 180) || null
  };
}

function companySettingsErrorMessage(error: { code?: string; message?: string } | null) {
  const code = error?.code || "unknown";
  const message = (error?.message || "資料庫未回傳錯誤訊息").slice(0, 120);
  if (code === "42501") return `公司資料儲存失敗：資料庫權限不足（${code}）。`;
  if (code === "PGRST204") return `公司資料儲存失敗：資料庫欄位尚未套用或 schema cache 未更新（${code}）。`;
  return `公司資料儲存失敗：${code} ${message}`;
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
  const payload = {
    id: "default",
    ...defaultCompanySettings,
    ...parsed.data,
    updated_by: current.user.id,
    updated_at: new Date().toISOString()
  };

  const { data: updated, error: updateError } = await supabase
    .from("company_settings")
    .update(payload)
    .eq("id", "default")
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("company_settings_update_failed", sanitizeDbError(updateError));
    return { error: companySettingsErrorMessage(updateError) };
  }

  if (!updated?.id) {
    const { error: insertError } = await supabase
      .from("company_settings")
      .insert(payload)
      .select("id")
      .single();

    if (insertError) {
      console.error("company_settings_insert_failed", sanitizeDbError(insertError));
      return { error: companySettingsErrorMessage(insertError) };
    }
  }

  revalidatePath("/admin/settings/company");
  revalidatePath("/properties");
  redirect("/admin/settings/company?saved=1");
}
