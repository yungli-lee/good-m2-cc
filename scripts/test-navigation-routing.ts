import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const apiRoute = readFileSync("app/api/admin/navigation/[id]/route.ts", "utf8");
const form = readFileSync("components/admin/navigation-item-form.tsx", "utf8");
const editPage = readFileSync("app/admin/navigation/[id]/edit/page.tsx", "utf8");

assert.match(apiRoute, /export async function PATCH/);
assert.match(apiRoute, /export async function DELETE/);
assert.match(apiRoute, /\.eq\("id", id\)/);
assert.match(apiRoute, /getAdminNavigationItem\(id\)/);
assert.match(apiRoute, /redirectTo: "\/admin\/navigation\?saved=1"/);
assert.match(apiRoute, /revalidatePath\("\/admin\/navigation"\)/);
assert.match(apiRoute, /revalidatePath\(`\/admin\/navigation\/\$\{id\}\/edit`\)/);
assert.match(apiRoute, /revalidateTag\("site-navigation"\)/);
assert.doesNotMatch(apiRoute, /\.from\("site_pages"\)\.delete/);

assert.match(form, /fetch\(`\/api\/admin\/navigation\/\$\{item\.id\}`/);
assert.match(form, /method: item\?\.id \? "PATCH" : "POST"/);
assert.match(form, /method: "DELETE"/);
assert.match(form, /router\.replace\(result\.redirectTo/);
assert.doesNotMatch(form, /<form action=/);
assert.doesNotMatch(editPage, /deleteNavigationItemAction|updateNavigationItemAction|\.bind\(null, id\)/);

console.log("navigation action routing tests passed");
