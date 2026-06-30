import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const defaultCompanySettings = {
  company_name: "赫成開發有限公司",
  franchise_name: "太平洋房屋彰化縣府加盟店",
  brokerage_license_no: "府地籍字第1120453178號",
  realtor_certificate_no: "（112）彰縣字第00538號",
  salesperson_registration_no: "",
  company_phone: "",
  company_address: "",
  company_email: "",
  google_maps_url: "",
  facebook_url: "",
  instagram_url: "",
  youtube_url: "",
  tiktok_url: "",
  line_url: "",
  logo_url: "",
  line_qr_code_url: "",
  copyright_text: ""
};

export type CompanySettings = typeof defaultCompanySettings;

export const companySettingsSchema = z.object({
  company_name: z.string().trim().min(1, "請輸入公司名稱").max(120),
  franchise_name: z.string().trim().min(1, "請輸入加盟店").max(120),
  brokerage_license_no: z.string().trim().min(1, "請輸入經紀業特許字號").max(120),
  realtor_certificate_no: z.string().trim().min(1, "請輸入不動產經紀人證號").max(120),
  salesperson_registration_no: z.string().trim().max(120).optional().or(z.literal("")),
  company_phone: z.string().trim().max(80).optional().or(z.literal("")),
  company_address: z.string().trim().max(240).optional().or(z.literal("")),
  company_email: z.string().trim().email("Email 格式不正確").max(160).optional().or(z.literal("")),
  google_maps_url: z.string().trim().url("Google Maps 連結格式不正確").max(500).optional().or(z.literal("")),
  facebook_url: z.string().trim().url("Facebook 連結格式不正確").max(500).optional().or(z.literal("")),
  instagram_url: z.string().trim().url("Instagram 連結格式不正確").max(500).optional().or(z.literal("")),
  youtube_url: z.string().trim().url("YouTube 連結格式不正確").max(500).optional().or(z.literal("")),
  tiktok_url: z.string().trim().url("TikTok 連結格式不正確").max(500).optional().or(z.literal("")),
  line_url: z.string().trim().url("LINE 連結格式不正確").max(500).optional().or(z.literal("")),
  logo_url: z.string().trim().url("公司 Logo URL 格式不正確").max(500).optional().or(z.literal("")),
  line_qr_code_url: z.string().trim().url("LINE QR Code URL 格式不正確").max(500).optional().or(z.literal("")),
  copyright_text: z.string().trim().max(240).optional().or(z.literal(""))
});

export function companySettingsValuesFromFormData(formData: FormData) {
  return {
    company_name: String(formData.get("company_name") || ""),
    franchise_name: String(formData.get("franchise_name") || ""),
    brokerage_license_no: String(formData.get("brokerage_license_no") || ""),
    realtor_certificate_no: String(formData.get("realtor_certificate_no") || ""),
    salesperson_registration_no: String(formData.get("salesperson_registration_no") || ""),
    company_phone: String(formData.get("company_phone") || ""),
    company_address: String(formData.get("company_address") || ""),
    company_email: String(formData.get("company_email") || ""),
    google_maps_url: String(formData.get("google_maps_url") || ""),
    facebook_url: String(formData.get("facebook_url") || ""),
    instagram_url: String(formData.get("instagram_url") || ""),
    youtube_url: String(formData.get("youtube_url") || ""),
    tiktok_url: String(formData.get("tiktok_url") || ""),
    line_url: String(formData.get("line_url") || ""),
    logo_url: String(formData.get("logo_url") || ""),
    line_qr_code_url: String(formData.get("line_qr_code_url") || ""),
    copyright_text: String(formData.get("copyright_text") || "")
  };
}

const companySettingsSelect = Object.keys(defaultCompanySettings).join(",");

function normalizeCompanySettings(data?: Partial<CompanySettings> | null): CompanySettings {
  return Object.fromEntries(
    Object.entries(defaultCompanySettings).map(([key, value]) => [
      key,
      typeof data?.[key as keyof CompanySettings] === "string" ? data[key as keyof CompanySettings] || value : value
    ])
  ) as CompanySettings;
}

export async function getPublicCompanySettings(): Promise<CompanySettings> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("company_settings")
    .select(companySettingsSelect)
    .eq("id", "default")
    .maybeSingle();

  if (error || !data) return defaultCompanySettings;
  return normalizeCompanySettings(data as Partial<CompanySettings>);
}
