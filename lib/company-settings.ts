import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  defaultCompanySettings,
  normalizeCompanySettings,
  type CompanySettings
} from "@/lib/company-settings-core";

export {
  companySettingsSchema,
  companySettingsValuesFromFormData,
  defaultCompanySettings
} from "@/lib/company-settings-core";
export type { CompanySettings } from "@/lib/company-settings-core";

const companySettingsSelect = Object.keys(defaultCompanySettings).join(",");

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
