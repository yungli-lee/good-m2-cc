export type RequirementCompleteness = { sections: Array<{ label: string; complete: boolean; missing: string[] }> };
export function getRequirementCompleteness(value: Record<string, unknown>): RequirementCompleteness {
  const has = (key: string) => value[key] != null && value[key] !== "" && (!Array.isArray(value[key]) || (value[key] as unknown[]).length > 0);
  const budgetKey = value.transaction_type === "rent" ? "rent_budget_max" : "sale_budget_max";
  return { sections: [
    { label: "基本資料", complete: has("title") && has("property_categories"), missing: [["title", "客需名稱"], ["property_categories", "物件類型"]].filter(([key]) => !has(key)).map(([, label]) => label) },
    { label: "客需資料", complete: (has("cities") || has("districts") || has("area_note")) && has(budgetKey), missing: [...(!has("cities") && !has("districts") && !has("area_note") ? ["區域"] : []), ...(!has(budgetKey) ? ["預算上限"] : [])] },
    { label: "資金資料", complete: has("funding_status") || has("financing_status"), missing: !has("funding_status") && !has("financing_status") ? ["資金／貸款狀況"] : [] },
    { label: "時程資料", complete: has("purchase_timeline"), missing: has("purchase_timeline") ? [] : ["購買時程"] }
  ] };
}
