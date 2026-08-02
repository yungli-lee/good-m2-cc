import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import type { requirementListQuerySchema } from "./schema";
type Filters=z.infer<typeof requirementListQuerySchema>;
const tenThousandsToTwd=(value:number)=>value*10_000;
const endOfDay=(date:string)=>`${date}T23:59:59.999Z`;
export async function listRequirements(supabase:SupabaseClient,f:Filters){
 const from=(f.page-1)*f.pageSize,to=from+f.pageSize-1;
 let q=supabase.from("crm_customer_requirements").select("*,person:people(id,display_name)",{count:"exact"});
 if(f.search){
  const search=f.search.replace(/[%_,().]/g," ").trim();
  const {data:matchingPeople}=await supabase.from("people").select("id").is("deleted_at",null).or(`display_name.ilike.%${search}%,legal_name.ilike.%${search}%,phone.ilike.%${search}%`).limit(100);
  const clauses=[`title.ilike.%${search}%`,`area_note.ilike.%${search}%`,`notes.ilike.%${search}%`];
  const personIds=(matchingPeople||[]).map(person=>person.id);
  if(personIds.length)clauses.push(`person_id.in.(${personIds.join(",")})`);
  q=q.or(clauses.join(","));
 }
 if(f.personId)q=q.eq("person_id",f.personId);if(f.requirementType)q=q.eq("requirement_type",f.requirementType);if(f.transactionType)q=q.eq("transaction_type",f.transactionType);if(f.status)q=q.eq("status",f.status);if(f.urgency)q=q.eq("urgency",f.urgency);if(f.assignedUserId)q=q.eq("assigned_user_id",f.assignedUserId);if(f.city)q=q.contains("cities",[f.city]);if(f.district)q=q.contains("districts",[f.district]);if(f.propertyCategory)q=q.contains("property_categories",[f.propertyCategory]);if(f.purchaseTimeline)q=q.eq("purchase_timeline",f.purchaseTimeline);
 const minBudget=f.budgetMin==null?undefined:tenThousandsToTwd(f.budgetMin),maxBudget=f.budgetMax==null?undefined:tenThousandsToTwd(f.budgetMax);const minColumn=f.transactionType==="rent"?"rent_budget_min":"sale_budget_min",maxColumn=f.transactionType==="rent"?"rent_budget_max":"sale_budget_max";if(minBudget!=null){q=f.transactionType?q.gte(minColumn,minBudget):q.or(`sale_budget_min.gte.${minBudget},rent_budget_min.gte.${minBudget}`);}if(maxBudget!=null){q=f.transactionType?q.lte(maxColumn,maxBudget):q.or(`sale_budget_max.lte.${maxBudget},rent_budget_max.lte.${maxBudget}`);}if(f.landAreaMin!=null)q=q.gte("land_area_min",f.landAreaMin);if(f.buildingAreaMin!=null)q=q.gte("building_area_min",f.buildingAreaMin);if(f.bedroomsMin!=null)q=q.gte("bedrooms_min",f.bedroomsMin);if(f.elevator)q=q.eq("elevator_required",f.elevator==="required");if(f.parking)q=q.eq("parking_required",f.parking==="required");if(f.createdFrom)q=q.gte("created_at",`${f.createdFrom}T00:00:00.000Z`);if(f.createdTo)q=q.lte("created_at",endOfDay(f.createdTo));if(f.updatedFrom)q=q.gte("updated_at",`${f.updatedFrom}T00:00:00.000Z`);if(f.updatedTo)q=q.lte("updated_at",endOfDay(f.updatedTo));
 const budgetSortColumn=f.transactionType==="rent"?"rent_budget_max":"sale_budget_max";if(f.sort==="newest")q=q.order("created_at",{ascending:false});else if(f.sort==="budget_asc")q=q.order(budgetSortColumn,{ascending:true,nullsFirst:false});else if(f.sort==="budget_desc")q=q.order(budgetSortColumn,{ascending:false,nullsFirst:false});else q=q.order("updated_at",{ascending:false});return q.range(from,to);
}
export async function getRequirement(supabase:SupabaseClient,id:string){return supabase.from("crm_customer_requirements").select("*,person:people(id,display_name)").eq("id",id).maybeSingle();}
export async function listPersonRequirements(supabase:SupabaseClient,personId:string){return supabase.from("crm_customer_requirements").select("*").eq("person_id",personId).order("status",{ascending:true}).order("updated_at",{ascending:false});}
export function dbErrorStatus(code?:string){if(code==="42501")return 403;if(code==="23503")return 404;if(code==="23505")return 409;if(code==="42P01"||code==="PGRST205")return 503;return 500;}
