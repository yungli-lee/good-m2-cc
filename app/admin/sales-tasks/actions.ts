"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { salesTaskInput } from "@/lib/sales-tasks";

export async function createSalesTask(form: FormData) {
  const current = await requireRole(["editor","admin","owner"]);
  const values = Object.fromEntries(form.entries());
  const parsed = salesTaskInput.safeParse(values);
  if (!parsed.success) redirect("/admin/sales-tasks?error=invalid");
  const supabase = await createSupabaseServerClient();
  const input = parsed.data;
  // Validate the referenced records are still available to this logged-in operator.
  if (input.person_id) {
    const { data } = await supabase.from("people").select("id").eq("id",input.person_id).is("deleted_at",null).maybeSingle();
    if (!data) redirect("/admin/sales-tasks?error=person");
  }
  if (input.property_id) {
    const { data } = await supabase.from("properties").select("id").eq("id",input.property_id).is("deleted_at",null).maybeSingle();
    if (!data) redirect("/admin/sales-tasks?error=property");
  }
  const { error } = await supabase.from("sales_follow_up_tasks").insert({
    title:input.title,person_id:input.person_id||null,property_id:input.property_id||null,
    task_type:input.task_type,showing_status:input.task_type==="showing" ? input.showing_status||"pending_confirmation" : null,
    priority:input.priority,notes:input.notes||null,due_at:new Date(input.due_at+"+08:00").toISOString(),
    showing_at:input.showing_at ? new Date(input.showing_at+"+08:00").toISOString() : null,
    assigned_to:current.user.id,created_by:current.user.id
  });
  if (error) redirect("/admin/sales-tasks?error=save");
  revalidatePath("/admin/sales-tasks");
  revalidatePath("/admin");
  redirect("/admin/sales-tasks?saved=1");
}

export async function changeSalesTaskStatus(id: string, status: "completed"|"open"|"cancelled") {
  const current = await requireRole(["editor","admin","owner"]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/admin/sales-tasks?error=invalid");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("sales_follow_up_tasks")
    .update({ status, completed_at:status==="completed"?new Date().toISOString():null, updated_at:new Date().toISOString() })
    .eq("id",id).eq("assigned_to",current.user.id);
  if (error) redirect("/admin/sales-tasks?error=save");
  revalidatePath("/admin/sales-tasks");
  revalidatePath("/admin");
  redirect("/admin/sales-tasks?saved=1");
}

export async function updateSalesTask(id:string,form:FormData){
 const current=await requireRole(["editor","admin","owner"]);
 if(!/^[0-9a-f-]{36}$/i.test(id)) redirect("/admin/sales-tasks?error=invalid");
 const parsed=salesTaskInput.safeParse(Object.fromEntries(form.entries()));
 if(!parsed.success) redirect("/admin/sales-tasks?error=invalid");
 const input=parsed.data;
 const db=await createSupabaseServerClient();
 const {data:existing}=await db.from("sales_follow_up_tasks").select("id,person_id,property_id").eq("id",id).eq("assigned_to",current.user.id).maybeSingle();
 if(!existing) redirect("/admin/sales-tasks?error=not_found");
 if(input.person_id){const {data}=await db.from("people").select("id").eq("id",input.person_id).is("deleted_at",null).maybeSingle();if(!data)redirect("/admin/sales-tasks?error=person");}
 if(input.property_id){const {data}=await db.from("properties").select("id").eq("id",input.property_id).is("deleted_at",null).maybeSingle();if(!data)redirect("/admin/sales-tasks?error=property");}
 const {data,error}=await db.from("sales_follow_up_tasks").update({
 title:input.title,person_id:input.person_id||null,property_id:input.property_id||null,
 task_type:input.task_type,showing_status:input.task_type==="showing"?input.showing_status||"pending_confirmation":null,
 showing_at:input.showing_at?new Date(input.showing_at+"+08:00").toISOString():null,
 due_at:new Date(input.due_at+"+08:00").toISOString(),priority:input.priority,notes:input.notes||null,updated_at:new Date().toISOString(),
 line_reminder_attempts:0,line_reminder_claimed_for:null,line_reminder_claimed_at:null,line_reminder_last_error:null
 }).eq("id",id).eq("assigned_to",current.user.id).select("id").maybeSingle();
 if(error||!data)redirect("/admin/sales-tasks?error=save");
 revalidatePath("/admin/sales-tasks");revalidatePath("/admin");
 redirect("/admin/sales-tasks?saved=updated");
}


export async function cancelSalesShowing(id:string){
 const current=await requireRole(["editor","admin","owner"]);
 if(!/^[0-9a-f-]{36}$/i.test(id)) redirect("/admin/sales-tasks?error=invalid");
 const db=await createSupabaseServerClient();
 const {data:prior,error:lookupError}=await db.from("sales_follow_up_tasks")
  .select("id,task_type,showing_at,showing_status,notes").eq("id",id).eq("assigned_to",current.user.id).maybeSingle();
 if(lookupError||!prior) redirect("/admin/sales-tasks?error=not_found");
 if(!prior.showing_at && prior.showing_status==="cancelled") redirect("/admin/sales-tasks");
 // Preserve an internal record of the former appointment without cancelling the follow-up task.
 const former=prior.showing_at ? new Intl.DateTimeFormat("zh-TW",{timeZone:"Asia/Taipei",dateStyle:"short",timeStyle:"short",hourCycle:"h23"}).format(new Date(prior.showing_at)) : "未指定時間";
 const entry=`[取消帶看 ${new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Taipei",dateStyle:"short",timeStyle:"short",hourCycle:"h23"}).format(new Date())}] 原帶看時間：${former}`;
 const notes=[prior.notes||"",entry].filter(Boolean).join("\n");
 if(notes.length>2000) redirect("/admin/sales-tasks?error=notes_full");
 const {data,error}=await db.from("sales_follow_up_tasks").update({
   showing_at:null,showing_status:prior.task_type==="showing"?"cancelled":null,notes,updated_at:new Date().toISOString()
 }).eq("id",id).eq("assigned_to",current.user.id).select("id").maybeSingle();
 if(error||!data) redirect("/admin/sales-tasks?error=save");
 revalidatePath("/admin/sales-tasks");revalidatePath("/admin");
 redirect("/admin/sales-tasks?saved=showing_cancelled");
}
