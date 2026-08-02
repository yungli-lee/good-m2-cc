import { z } from "zod";
import { fundingStatuses, propertyCategories, purchaseTimelines, requirementStatuses, requirementTypes, transactionTypes, urgencyLevels } from "./constants.ts";
const blankNull=z.preprocess(v=>v===""?null:v,z.string().trim().max(4000).nullable().optional());
const num=z.preprocess(v=>v===""||v==null?null:v,z.coerce.number().nonnegative().nullable().optional());
const int=z.preprocess(v=>v===""||v==null?null:v,z.coerce.number().int().nonnegative().nullable().optional());
const bool=z.boolean().nullable().optional();
const arr=z.array(z.string().trim().min(1)).default([]);
export const requirementInputSchema=z.object({
 person_id:z.string().uuid("客戶格式錯誤"),title:z.string().trim().min(1,"請輸入客需名稱").max(160),requirement_type:z.enum(requirementTypes),transaction_type:z.enum(transactionTypes),status:z.enum(requirementStatuses).default("active"),urgency:z.enum(urgencyLevels).nullable().optional(),
 property_categories:z.array(z.enum(propertyCategories)).min(1,"至少選擇一種物件類型"),cities:arr,districts:arr,area_note:blankNull,school_districts:arr,commute_notes:blankNull,
 sale_budget_min:num,sale_budget_max:num,rent_budget_min:num,rent_budget_max:num,price_per_ping_min:num,price_per_ping_max:num,
 land_area_min:num,land_area_max:num,building_area_min:num,building_area_max:num,frontage_min:num,depth_min:num,road_width_min:num,building_height_min:num,clear_height_min:num,
 bedrooms_min:int,bedrooms_max:int,living_rooms_min:int,bathrooms_min:int,building_age_max:num,floor_min:int,floor_max:int,
 elevator_required:bool,parking_required:bool,ground_floor_required:bool,accessible_required:bool,
 zoning_types:arr,property_uses:arr,orientation_preferences:arr,needs_corner_lot:bool,needs_main_road:bool,needs_water:bool,needs_electricity:bool,needs_legal_farmhouse:bool,
 power_capacity_min:num,needs_three_phase_power:bool,needs_fire_compliance:bool,needs_factory_registration:bool,needs_smoke_exhaust:bool,needs_office:bool,needs_staff_housing:bool,needs_large_vehicle_access:bool,crane_required:bool,crane_capacity_min:num,
 must_have:arr,nice_to_have:arr,unacceptable:arr,household_notes:blankNull,occupation_notes:blankNull,funding_status:z.enum(fundingStatuses).nullable().optional(),cash_available:num,loan_amount_expected:num,financing_status:blankNull,purchase_timeline:z.enum(purchaseTimelines).nullable().optional(),move_in_date:blankNull,notes:blankNull,assigned_user_id:z.string().uuid().nullable().optional()
}).superRefine((v,c)=>{if(!v.cities.length&&!v.districts.length&&!v.area_note)c.addIssue({code:"custom",path:["area_note"],message:"至少填寫縣市、行政區或區域備註"});const ranges:Array<[number|null|undefined,number|null|undefined,string]>=[[v.sale_budget_min,v.sale_budget_max,"sale_budget_max"],[v.rent_budget_min,v.rent_budget_max,"rent_budget_max"],[v.price_per_ping_min,v.price_per_ping_max,"price_per_ping_max"],[v.land_area_min,v.land_area_max,"land_area_max"],[v.building_area_min,v.building_area_max,"building_area_max"],[v.bedrooms_min,v.bedrooms_max,"bedrooms_max"],[v.floor_min,v.floor_max,"floor_max"]];for(const [a,b,p] of ranges)if(a!=null&&b!=null&&a>b)c.addIssue({code:"custom",path:[p],message:"上限不得小於下限"});if(v.transaction_type==="buy"){if(v.sale_budget_max==null)c.addIssue({code:"custom",path:["sale_budget_max"],message:"買賣客需必須填寫預算上限"});if(v.rent_budget_min!=null||v.rent_budget_max!=null)c.addIssue({code:"custom",path:["rent_budget_max"],message:"買賣客需不得填租金"});}else{if(v.rent_budget_max==null)c.addIssue({code:"custom",path:["rent_budget_max"],message:"租賃客需必須填寫租金上限"});if(v.sale_budget_min!=null||v.sale_budget_max!=null)c.addIssue({code:"custom",path:["sale_budget_max"],message:"租賃客需不得填買賣預算"});}});
export const requirementStatusSchema=z.object({status:z.enum(requirementStatuses)});
const optionalQueryNumber=z.preprocess(v=>v===""||v==null?undefined:v,z.coerce.number().nonnegative().optional());
const blankUndefined=<T extends z.ZodTypeAny>(schema:T)=>z.preprocess(v=>v===""||v==null?undefined:v,schema.optional());
const optionalQueryBoolean=blankUndefined(z.enum(["required","not_required"]));
const optionalDate=blankUndefined(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));
export const requirementListQuerySchema=z.object({
 page:z.coerce.number().int().min(1).default(1),pageSize:z.coerce.number().int().min(10).max(100).default(20),search:z.string().trim().max(120).default(""),personId:blankUndefined(z.string().uuid()),requirementType:blankUndefined(z.enum(requirementTypes)),transactionType:blankUndefined(z.enum(transactionTypes)),status:blankUndefined(z.enum(requirementStatuses)),urgency:blankUndefined(z.enum(urgencyLevels)),assignedUserId:blankUndefined(z.string().uuid()),city:blankUndefined(z.string().trim().max(80)),district:blankUndefined(z.string().trim().max(80)),propertyCategory:blankUndefined(z.enum(propertyCategories)),purchaseTimeline:blankUndefined(z.enum(purchaseTimelines)),
 budgetMin:optionalQueryNumber,budgetMax:optionalQueryNumber,landAreaMin:optionalQueryNumber,buildingAreaMin:optionalQueryNumber,bedroomsMin:optionalQueryNumber,elevator:optionalQueryBoolean,parking:optionalQueryBoolean,createdFrom:optionalDate,createdTo:optionalDate,updatedFrom:optionalDate,updatedTo:optionalDate,
 sort:z.enum(["newest","updated","budget_asc","budget_desc"]).default("updated")
}).superRefine((v,c)=>{if(v.budgetMin!=null&&v.budgetMax!=null&&v.budgetMin>v.budgetMax)c.addIssue({code:"custom",path:["budgetMax"],message:"預算上限不得小於下限"});});
export type RequirementInput=z.infer<typeof requirementInputSchema>;
export function fieldErrors(error:z.ZodError){return error.issues.reduce<Record<string,string>>((o,i)=>{const k=String(i.path[0]||"form");if(!o[k])o[k]=i.message;return o;},{});}
