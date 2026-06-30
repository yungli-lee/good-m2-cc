import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const defaultCompanySettings = {
  company_name: "赫成開發有限公司",
  franchise_name: "太平洋房屋彰化縣府加盟店",
  brokerage_license_no: "府地籍字第1120453178號",
  realtor_certificate_no: "（112）彰縣字第00538號"
};

export type CompanySettings = typeof defaultCompanySettings;

export const companySettingsSchema = z.object({
  company_name: z.string().trim().min(1, "請輸入公司名稱").max(120),
  franchise_name: z.string().trim().min(1, "請輸入加盟店").max(120),
  brokerage_license_no: z.string().trim().min(1, "請輸入經紀業特許字號").max(120),
  realtor_certificate_no: z.string().trim().min(1, "請輸入不動產經紀人證號").max(120)
});

export function companySettingsValuesFromFormData(formData: FormData) {
  return {
    company_name: String(formData.get("company_name") || ""),
    franchise_name: String(formData.get("franchise_name") || ""),
    brokerage_license_no: String(formData.get("brokerage_license_no") || ""),
    realtor_certificate_no: String(formData.get("realtor_certificate_no") || "")
  };
}

export async function getPublicCompanySettings(): Promise<CompanySettings> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("company_settings")
    .select("company_name,franchise_name,brokerage_license_no,realtor_certificate_no")
    .eq("id", "default")
    .maybeSingle();

  if (error || !data) return defaultCompanySettings;
  return {
    company_name: data.company_name || defaultCompanySettings.company_name,
    franchise_name: data.franchise_name || defaultCompanySettings.franchise_name,
    brokerage_license_no: data.brokerage_license_no || defaultCompanySettings.brokerage_license_no,
    realtor_certificate_no: data.realtor_certificate_no || defaultCompanySettings.realtor_certificate_no
  };
}
