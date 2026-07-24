import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { companySettingsSchema, companySettingsValuesFromFormData, defaultCompanySettings } from "../lib/company-settings-core.ts";

assert.equal(defaultCompanySettings.brand_name, "阿勇不動產顧問");
assert.equal(defaultCompanySettings.company_name, "赫成開發有限公司");
assert.equal(defaultCompanySettings.franchise_name, "太平洋房屋彰化縣府加盟店");

const values = companySettingsValuesFromFormData(new FormData());
assert.equal(Object.hasOwn(values, "brand_name"), true);
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
const contact = readFileSync("app/(public)/contact/page.tsx", "utf8");
const form = readFileSync("components/admin/company-settings-form.tsx", "utf8");
const action = readFileSync("app/admin/settings/company/actions.ts", "utf8");
const home = readFileSync("app/page.tsx", "utf8");

assert.match(header, /<strong>\{settings\.brand_name\}<\/strong>/);
assert.match(header, /<small>\{settings\.franchise_name\}<\/small>/);
assert.doesNotMatch(header, /<strong>\{settings\.company_name\}<\/strong>/);

assert.match(footer, /\{settings\.brand_name\}・\{settings\.franchise_name\}/);
assert.match(footer, /<small>\{settings\.company_name\}<\/small>/);

assert.match(contact, /<h2>\{company\.company_name\}<\/h2>/);
assert.match(contact, /<p>\{company\.franchise_name\}<\/p>/);
assert.match(contact, /siteName: company\.brand_name/);

assert.match(form, /name="brand_name"/);
assert.match(form, /品牌名稱：顯示於網站 Header|顯示於網站 Header/);
assert.match(form, /公司法定名稱/);
assert.match(form, /加盟店名稱/);

assert.match(action, /revalidatePath\("\/"\)/);
assert.match(action, /revalidatePath\("\/contact"\)/);
assert.match(action, /revalidateTag\("company-settings"\)/);

assert.match(home, /title: company\.brand_name/);
assert.match(home, /siteName: company\.brand_name/);

console.log("company identity mapping tests passed");
