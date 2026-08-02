import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import type { requirementListQuerySchema } from "./schema";
type Filters=z.infer<typeof requirementListQuerySchema>;
const tenThousandsToTwd=(value:number)=>value*10_000;
const endOfDay=(date:string)=>`${date}T23:59:59.999Z`;
export const sanitizeRequirementSearch=(value:string)=>value.replace(/[%_,()]/g," ").trim();
export function budgetIncludesPrice(min:number|null,max:number|null,price:number){return (min==null||min<=price)&&(max==null||max>=price);}
export function priceWithinBudgetFilter(transactionType:"buy"|"rent"|undefined,amount:number){
 const filter=(prefix:"sale"|"rent")=>`or(${prefix}_budget_min.lte.${amount},${prefix}_budget_min.is.null),or(${prefix}_budget_max.gte.${amount},${prefix}_budget_max.is.null)`;
 if(transactionType)return `and(${filter(transactionType==="rent"?"rent":"sale")})`;
 return `and(transaction_type.eq.buy,${filter("sale")}),and(transaction_type.eq.rent,${filter("rent")})`;
}
export async function listRequirements(supabase:SupabaseClient,f:Filters){
 const from=(f.page-1)*f.pageSize,to=from+f.pageSize-1;
 let q=supabase.from("crm_customer_requirements").select("*,person:people(id,display_name)",{count:"exact"});
 if(f.search){
  const search=sanitizeRequirementSearch(f.search);
  const {data:matchingPeople}=await supabase.from("people").select("id").is("deleted_at",null).or(`display_name.ilike.%${search}%,legal_name.ilike.%${search}%,phone.ilike.%${search}%`).limit(100);
  const clauses=[`title.ilike.%${search}%`,`area_note.ilike.%${search}%`,`notes.ilike.%${search}%`];
  const personIds=(matchingPeople||[]).map(person=>person.id);
  if(personIds.length)clauses.push(`person_id.in.(${personIds.join(",")})`);
  q=q.or(clauses.join(","));
 }
 if(f.personId)q=q.eq("person_id",f.personId);if(f.requirementType)q=q.eq("requirement_type",f.requirementType);if(f.transactionType)q=q.eq("transaction_type",f.transactionType);if(f.status)q=q.eq("status",f.status);if(f.urgency)q=q.eq("urgency",f.urgency);if(f.assignedUserId)q=q.eq("assigned_user_id",f.assignedUserId);if(f.city)q=q.contains("cities",[f.city]);if(f.district)q=q.contains("districts",[f.district]);if(f.propertyCategory)q=q.contains("property_categories",[f.propertyCategory]);if(f.purchaseTimeline)q=q.eq("purchase_timeline",f.purchaseTimeline);
 const propertyPrice=f.propertyPrice==null?undefined:tenThousandsToTwd(f.propertyPrice);if(propertyPrice!=null)q=q.or(priceWithinBudgetFilter(f.transactionType,propertyPrice));if(f.landAreaMin!=null)q=q.gte("land_area_min",f.landAreaMin);if(f.buildingAreaMin!=null)q=q.gte("building_area_min",f.buildingAreaMin);if(f.bedroomsMin!=null)q=q.gte("bedrooms_min",f.bedroomsMin);if(f.elevator)q=q.eq("elevator_required",f.elevator==="required");if(f.parking)q=q.eq("parking_required",f.parking==="required");if(f.createdFrom)q=q.gte("created_at",`${f.createdFrom}T00:00:00.000Z`);if(f.createdTo)q=q.lte("created_at",endOfDay(f.createdTo));if(f.updatedFrom)q=q.gte("updated_at",`${f.updatedFrom}T00:00:00.000Z`);if(f.updatedTo)q=q.lte("updated_at",endOfDay(f.updatedTo));
 const budgetSortColumn=f.transactionType==="rent"?"rent_budget_max":"sale_budget_max";if(f.sort==="newest")q=q.order("created_at",{ascending:false});else if(f.sort==="budget_asc")q=q.order(budgetSortColumn,{ascending:true,nullsFirst:false});else if(f.sort==="budget_desc")q=q.order(budgetSortColumn,{ascending:false,nullsFirst:false});else q=q.order("updated_at",{ascending:false});return q.range(from,to);
}
export async function getRequirement(supabase:SupabaseClient,id:string){return supabase.from("crm_customer_requirements").select("*,person:people(id,display_name)").eq("id",id).maybeSingle();}
export async function listPersonRequirements(supabase:SupabaseClient,personId:string){return supabase.from("crm_customer_requirements").select("*").eq("person_id",personId).order("status",{ascending:true}).order("updated_at",{ascending:false});}
export function dbErrorStatus(code?:string){if(code==="42501")return 403;if(code==="23503")return 404;if(code==="23505")return 409;if(code==="42P01"||code==="PGRST205")return 503;return 500;}
