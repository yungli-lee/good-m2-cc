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

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const maxImageSize = 5 * 1024 * 1024;

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

function isUploadedImageFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

function cleanFilename(name: string) {
  const extension = name.split(".").pop()?.toLowerCase() || "image";
  const base = name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${base || "company-image"}-${crypto.randomUUID()}.${extension}`;
}

function validateImageFile(file: File) {
  if (!imageTypes.has(file.type)) return "圖片格式不支援，請上傳 JPG、PNG、WebP 或 GIF。";
  if (file.size <= 0 || file.size > maxImageSize) return "圖片大小需介於 1 byte 到 5MB。";
  return null;
}

async function uploadCompanyImage(input: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  file: File;
  userId: string;
  slot: "logo" | "line-qr";
}) {
  const validationError = validateImageFile(input.file);
  if (validationError) return { url: null, error: validationError };

  const storagePath = `${input.userId}/${input.slot}/${cleanFilename(input.file.name)}`;
  const { error: uploadError } = await input.supabase.storage.from("company-assets").upload(storagePath, input.file, {
    contentType: input.file.type,
    upsert: false
  });

  if (uploadError) {
    console.error("company_settings_image_upload_failed", sanitizeDbError(uploadError));
    return { url: null, error: `圖片上傳失敗：${uploadError.message.slice(0, 120)}` };
  }

  const { data } = input.supabase.storage.from("company-assets").getPublicUrl(storagePath);
  if (!data.publicUrl) return { url: null, error: "圖片上傳失敗：無法取得公開 URL。" };
  return { url: data.publicUrl, error: null };
}

export async function updateCompanySettingsAction(_previousState: { error?: string; fieldErrors?: Record<string, string> }, formData: FormData) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const supabase = await createSupabaseServerClient();
  const values = companySettingsValuesFromFormData(formData);
  const logoFile = formData.get("logo_file");
  const lineQrFile = formData.get("line_qr_code_file");

  if (isUploadedImageFile(logoFile)) {
    const result = await uploadCompanyImage({ supabase, file: logoFile, userId: current.user.id, slot: "logo" });
    if (result.error) return { error: result.error };
    values.logo_url = result.url || values.logo_url;
  }

  if (isUploadedImageFile(lineQrFile)) {
    const result = await uploadCompanyImage({ supabase, file: lineQrFile, userId: current.user.id, slot: "line-qr" });
    if (result.error) return { error: result.error };
    values.line_qr_code_url = result.url || values.line_qr_code_url;
  }

  const parsed = companySettingsSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: "請確認欄位內容後再儲存。",
      fieldErrors: fieldErrors(parsed.error)
    };
  }

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
