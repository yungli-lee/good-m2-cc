export const requirementTypes = ["residential","townhouse","storefront","office","factory","warehouse","building_land","industrial_land","farmland","investment","rental","other"] as const;
export const transactionTypes = ["buy","rent"] as const;
export const requirementStatuses = ["active","paused","fulfilled","archived"] as const;
export const urgencyLevels = ["high","normal","low"] as const;
export const fundingStatuses = ["cash","loan","cash_and_loan","asset_sale","undecided"] as const;
export const purchaseTimelines = ["immediate","within_1_month","within_3_months","within_6_months","within_1_year","undecided"] as const;
export const propertyCategories = ["townhouse","apartment","building","land","farmland","building_land","storefront","factory","office","warehouse","other"] as const;
export type RequirementTypeValue = (typeof requirementTypes)[number];
export type PropertyCategoryValue = (typeof propertyCategories)[number];
export const statusTransitions: Record<string, readonly string[]> = { active:["paused","fulfilled","archived"], paused:["active","fulfilled","archived"], fulfilled:["archived"], archived:[] };
export const requirementTypeLabels: Record<(typeof requirementTypes)[number],string> = { residential:"住宅",townhouse:"透天",storefront:"店面",office:"辦公室",factory:"工廠",warehouse:"倉儲",building_land:"建地",industrial_land:"工業地",farmland:"農地",investment:"投資",rental:"租賃",other:"其他" };
export const propertyCategoryLabels: Record<PropertyCategoryValue,string> = { townhouse:"透天厝",apartment:"公寓",building:"電梯大樓",land:"土地",farmland:"農地",building_land:"建地",storefront:"店面",factory:"工廠",office:"辦公室",warehouse:"倉儲",other:"其他" };
export const requirementPropertyCategoryMap: Record<RequirementTypeValue,readonly PropertyCategoryValue[]> = {
 residential:["townhouse","apartment","building","other"],townhouse:["townhouse","building"],storefront:["storefront","building"],office:["office","building"],factory:["factory","warehouse"],warehouse:["warehouse","factory"],building_land:["building_land","land"],industrial_land:["land","building_land"],farmland:["farmland","land"],investment:propertyCategories,rental:["townhouse","apartment","building","storefront","factory","office","warehouse","other"],other:propertyCategories,
};
export const requirementTypeLabel=(value:string)=>requirementTypeLabels[value as RequirementTypeValue]||"未知需求類型";
export const propertyCategoryLabel=(value:string)=>propertyCategoryLabels[value as PropertyCategoryValue]||"未知物件類型";
export const allowedPropertyCategories=(value:string):readonly PropertyCategoryValue[]=>requirementPropertyCategoryMap[value as RequirementTypeValue]||propertyCategories;
export const normalizePropertyCategories=(requirementType:string,values:readonly string[])=>values.filter((value):value is PropertyCategoryValue=>allowedPropertyCategories(requirementType).includes(value as PropertyCategoryValue));
export const statusLabels: Record<(typeof requirementStatuses)[number],string> = { active:"有效",paused:"暫停",fulfilled:"已完成",archived:"已封存" };
export const urgencyLabels: Record<(typeof urgencyLevels)[number],string> = { high:"高",normal:"一般",low:"低" };
export const activityTypeForStatus = { paused:"requirement_paused",active:"requirement_resumed",fulfilled:"requirement_closed",archived:"requirement_archived" } as const;
export const DB_CURRENCY_UNIT = "TWD" as const;
export const UI_CURRENCY_UNIT = "TWD_10K" as const;
