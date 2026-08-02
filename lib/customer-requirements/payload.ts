import type { RequirementInput } from "./schema.ts";
const moneyFields=["sale_budget_min","sale_budget_max","rent_budget_min","rent_budget_max","price_per_ping_min","price_per_ping_max","cash_available","loan_amount_expected"] as const;
export function tenThousandsToTwd(v:number|null|undefined){return v==null?null:Math.round(v*10000);}
export function twdToTenThousands(v:number|null|undefined){return v==null?null:v/10000;}
export function buildRequirementPayload(input:RequirementInput){const payload:Record<string,unknown>={...input};for(const k of moneyFields)payload[k]=tenThousandsToTwd(input[k]);for(const [k,v] of Object.entries(payload)){if(Array.isArray(v)&&v.length===0)payload[k]=null;if(v==="")payload[k]=null;}return payload;}
export function requirementToForm(row:Record<string,unknown>){const out={...row};for(const k of moneyFields)out[k]=twdToTenThousands(row[k] as number|null);return out;}
export function changedSafeFields(before:Record<string,unknown>,after:Record<string,unknown>){return Object.keys(after).filter(k=>JSON.stringify(before[k])!==JSON.stringify(after[k])).filter(k=>!["notes","household_notes","occupation_notes","cash_available","loan_amount_expected"].includes(k));}
