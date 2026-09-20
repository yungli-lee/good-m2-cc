import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { canonicalKnowledgeCategory, knowledgeCategoryDefinitions, knowledgeCategoryOrder, knowledgeCategorySlugs, isPublicKnowledgeCategory } from "../lib/content/knowledge-categories.ts";

assert.deepEqual(knowledgeCategoryDefinitions.map(item => item.slug), ["buying", "selling", "mortgage", "tax", "transaction-safety", "land-building", "farmland", "farmhouse", "industrial-property", "inheritance-gift"]);
assert.equal(canonicalKnowledgeCategory("buying-guide"), "buying");
assert.equal(canonicalKnowledgeCategory("selling-guide"), "selling");
assert.equal(canonicalKnowledgeCategory("loan"), "mortgage");
assert.deepEqual(knowledgeCategorySlugs("loan"), ["mortgage", "loan"]);
for (const slug of ["legal", "faq", "changhua-market", "uncategorized", ""]) assert.equal(isPublicKnowledgeCategory(slug), false);
assert.equal(knowledgeCategoryOrder("mortgage") < knowledgeCategoryOrder("tax"), true);

// Exercise the actual query functions with a staff-visible data set: draft-only
// categories must not leak into the public selector through authenticated RLS.
const calls: { table: string; operations: [string, ...unknown[]][] }[] = [];
const categories = [
  { id: "empty", slug: "industrial-property", name: "工業地廠房", sort_order: 900, content_items: [{ count: 2 }] },
  { id: "buy", slug: "buying", name: "買屋指南", sort_order: 100, content_items: [{ count: 5 }] },
  { id: "old", slug: "legal", name: "法規", sort_order: 800, content_items: [{ count: 1 }] },
  { id: "unused", slug: "faq", name: "常見問題", sort_order: 1000, content_items: [{ count: 0 }] }
];
const supabase = { from(table: string) {
  const call = { table, operations: [] as [string, ...unknown[]][] }; calls.push(call);
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "is", "not", "or", "order", "limit", "range"]) {
    builder[method] = (...args: unknown[]) => { call.operations.push([method, ...args]); return builder; };
  }
  builder.then = (resolve: (result: unknown) => void) => {
    const countOnly = call.operations.some(op => op[0] === "select" && (op[2] as { head?: boolean })?.head);
    const filter = call.operations.find(op => op[0] === "eq" && op[1] === "category_id");
    resolve({ data: table === "content_categories" ? categories : [], error: null, count: countOnly ? (filter?.[2] === "buy" ? 5 : 0) : 0 });
  };
  return builder;
} };
const code = ts.transpileModule(readFileSync("lib/content/queries.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const result = { exports: {} as Record<string, (...args: unknown[]) => Promise<unknown>> };
new Function("require", "module", "exports", code)((name: string) => {
  if (name.includes("supabase/server")) return { createSupabaseServerClient: async () => supabase };
  if (name.includes("knowledge-categories")) return { canonicalKnowledgeCategory, knowledgeCategoryOrder, knowledgeCategorySlugs, isPublicKnowledgeCategory };
  throw new Error(`Unexpected import ${name}`);
}, result, result.exports);
const publicCategories = await result.exports.listKnowledgeCategories({ publicOnly: true }) as { slug: string }[];
assert.deepEqual(publicCategories.map(item => item.slug), ["buying"]);
const countCalls = calls.filter(call => call.table === "content_items");
assert.equal(countCalls.length, 2);
for (const call of countCalls) {
  assert.ok(call.operations.some(op => op[0] === "eq" && op[1] === "status" && op[2] === "published"));
  assert.ok(call.operations.some(op => op[0] === "eq" && op[1] === "content_type" && op[2] === "knowledge"));
  assert.ok(call.operations.some(op => op[0] === "is" && op[1] === "deleted_at"));
  assert.ok(call.operations.some(op => op[0] === "eq" && op[1] === "noindex" && op[2] === false));
}
const adminCategories = await result.exports.listKnowledgeCategories() as { slug: string }[];
assert.deepEqual(adminCategories.map(item => item.slug), ["buying", "industrial-property", "legal"], "Keep unused target categories and used legacy categories in admin");
calls.length = 0;
await result.exports.listPublicKnowledgeItems({ category: "loan", q: "銀行", page: 2, pageSize: 6 });
assert.ok(calls.some(call => call.operations.some(op => op[0] === "in" && op[1] === "slug" && JSON.stringify(op[2]) === '["mortgage","loan"]')));
assert.ok(calls.some(call => call.operations.some(op => op[0] === "range" && op[1] === 6 && op[2] === 11)));
assert.ok(calls.some(call => call.operations.some(op => op[0] === "or" && String(op[1]).includes("title.ilike.%銀行%"))));
console.log("Knowledge taxonomy/query behavior: PASS");
