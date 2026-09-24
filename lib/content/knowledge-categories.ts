/** Stable public taxonomy. Article slugs are deliberately unrelated to these keys. */
export const knowledgeCategoryDefinitions = [
  { slug: "buying", name: "買屋指南", legacy: "buying-guide" },
  { slug: "selling", name: "賣屋指南", legacy: "selling-guide" },
  { slug: "mortgage", name: "貸款", legacy: "loan" },
  { slug: "tax", name: "稅務" },
  { slug: "transaction-safety", name: "交易安全" },
  { slug: "land-building", name: "土地建地" },
  { slug: "farmland", name: "農地" },
  { slug: "farmhouse", name: "農舍" },
  { slug: "industrial-property", name: "工業地廠房" },
  { slug: "inheritance-gift", name: "繼承贈與" }
] as const;

export function canonicalKnowledgeCategory(slug: string) {
  return knowledgeCategoryDefinitions.find(item => "legacy" in item && item.legacy === slug)?.slug || slug;
}

export function knowledgeCategorySlugs(slug: string): string[] {
  const canonical = canonicalKnowledgeCategory(slug);
  const definition = knowledgeCategoryDefinitions.find(item => item.slug === canonical);
  return definition && "legacy" in definition ? [canonical, definition.legacy] : [canonical];
}

export function knowledgeCategoryOrder(slug: string) {
  const index = knowledgeCategoryDefinitions.findIndex(item => item.slug === canonicalKnowledgeCategory(slug));
  return index < 0 ? 1000 : index;
}

export function isPublicKnowledgeCategory(slug: string) {
  return knowledgeCategoryOrder(slug) < 1000;
}
