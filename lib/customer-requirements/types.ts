import type { requirementStatuses, requirementTypes, transactionTypes, urgencyLevels } from "./constants.ts";
export type RequirementType=(typeof requirementTypes)[number];
export type TransactionType=(typeof transactionTypes)[number];
export type RequirementStatus=(typeof requirementStatuses)[number];
export type RequirementUrgency=(typeof urgencyLevels)[number];
export type CustomerRequirement={id:string;person_id:string;title:string;requirement_type:RequirementType;transaction_type:TransactionType;status:RequirementStatus;urgency:RequirementUrgency|null;property_categories:string[];cities:string[]|null;districts:string[]|null;area_note:string|null;sale_budget_min:number|null;sale_budget_max:number|null;rent_budget_min:number|null;rent_budget_max:number|null;assigned_user_id:string|null;purchase_timeline:string|null;notes:string|null;created_at:string;updated_at:string;last_matched_at:string|null;[key:string]:unknown};
export type RequirementListItem=CustomerRequirement&{person?:{id:string;display_name:string}|null;assignee_label?:string|null};
export type RequirementListResponse={items:RequirementListItem[];page:number;pageSize:number;total:number;totalPages:number};
