import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { companySettingsSchema, companySettingsValuesFromFormData, defaultCompanySettings } from "../lib/company-settings-core.ts";

assert.equal(defaultCompanySettings.brand_name, "阿勇不動產顧問");
assert.equal(defaultCompanySettings.brand_tagline, "彰化房地產資訊與服務");
assert.equal(defaultCompanySettings.company_name, "赫成開發有限公司");
assert.equal(defaultCompanySettings.franchise_name, "太平洋房屋彰化縣府加盟店");

const values = companySettingsValuesFromFormData(new FormData());
assert.equal(Object.hasOwn(values, "brand_name"), true);
assert.equal(Object.hasOwn(values, "brand_tagline"), true);
assert.equal(Object.hasOwn(values, "company_name"), true);
assert.equal(Object.hasOwn(values, "franchise_name"), true);
assert.equal(companySettingsSchema.safeParse({
  ...defaultCompanySettings,
  brand_name: "",
  company_name: "赫成開發有限公司",
  franchise_name: "太平洋房屋彰化縣府加盟店"
}).success, false);

const header = readFileSync("components/layout/site-header.tsx", "utf8");
const footer = readFileSync("components/layout/site-footer.tsx", "utf8");
const property = readFileSync("app/(public)/properties/[slug]/page.tsx", "utf8");
const contact = readFileSync("app/(public)/contact/page.tsx", "utf8");
const form = readFileSync("components/admin/company-settings-form.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
const action = readFileSync("app/admin/settings/company/actions.ts", "utf8");
const home = readFileSync("app/page.tsx", "utf8");
const brandMigration = readFileSync("supabase/migrations/202607240103_company_settings_brand_name.sql", "utf8");
const taglineMigration = readFileSync("supabase/migrations/202607240104_company_settings_brand_tagline.sql", "utf8");

assert.match(header, /<strong>\{settings\.brand_name\}<\/strong>/);
assert.match(header, /<small>\{settings\.brand_tagline\}<\/small>/);
assert.doesNotMatch(header, /<strong>\{settings\.company_name\}<\/strong>/);

assert.match(footer, /\{settings\.brand_name\}・\{settings\.franchise_name\}/);
assert.match(header, /settings\.brand_logo_url/);
assert.doesNotMatch(header, /settings\.logo_url/);
assert.match(contact, /company\.franchise_logo_url/);
assert.match(property, /companySettings\.franchise_logo_url/);
assert.match(footer, /<small>\{settings\.company_name\}<\/small>/);

assert.match(contact, /<h2>\{company\.company_name\}<\/h2>/);
assert.match(contact, /<p>\{company\.franchise_name\}<\/p>/);
assert.match(contact, /siteName: company\.brand_name/);

assert.match(form, /name="brand_name"/);
assert.match(form, /name="brand_tagline"/);
assert.match(form, /品牌名稱：顯示於網站 Header|顯示於網站 Header/);
assert.match(form, /公司法定名稱/);
assert.match(form, /加盟店名稱/);
assert.match(form, /品牌副標/);
assert.match(form, /舊版公司 Logo（相容欄位）/);
assert.doesNotMatch(form, /name="logo_file"/);
assert.match(css, /\.site-app-brand img[\s\S]*height: 44px[\s\S]*object-fit: contain/);
assert.match(css, /\.site-app-brand-logo[\s\S]*max-width: 120px[\s\S]*max-height: 120px[\s\S]*object-fit: contain/);

assert.match(action, /revalidatePath\("\/"\)/);
assert.match(action, /revalidatePath\("\/contact"\)/);
assert.match(action, /revalidateTag\("company-settings"\)/);
assert.match(brandMigration, /add column if not exists brand_name/);
assert.match(brandMigration, /notify pgrst, 'reload schema'/);
assert.match(taglineMigration, /add column if not exists brand_tagline/);
assert.match(taglineMigration, /彰化房地產資訊與服務/);

assert.match(home, /title: company\.brand_name/);
assert.match(home, /siteName: company\.brand_name/);

console.log("company identity mapping tests passed");
