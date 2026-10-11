import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { taskTypeLabels, showingStatusLabels } from "@/lib/sales-tasks";
import { createSalesTask, changeSalesTaskStatus } from "./actions";
export const runtime="edge";
export const dynamic="force-dynamic";

type Task={id:string;title:string;status:string;task_type:string;showing_status:string|null;priority:string;due_at:string;person_id:string|null;property_id:string|null;notes:string|null};
type Person={id:string;display_name:string};
type Property={id:string;title:string};
type Props={searchParams:Promise<{error?:string;saved?:string}>};
const formatDate=(iso:string)=>new Intl.DateTimeFormat("zh-TW",{timeZone:"Asia/Taipei",dateStyle:"medium",timeStyle:"short"}).format(new Date(iso));
export default async function SalesTasksPage({searchParams}:Props){
 const current=await requireRole(["editor","admin","owner"]);
 const params=await searchParams;
 const db=await createSupabaseServerClient();
 const [tasksResult,peopleResult,propertiesResult]=await Promise.all([
  db.from("sales_follow_up_tasks").select("id,title,status,task_type,showing_status,priority,due_at,person_id,property_id,notes").eq("assigned_to",current.user.id).order("due_at",{ascending:true}).limit(100),
  db.from("people").select("id,display_name").eq("status","active").is("deleted_at",null).order("display_name",{ascending:true}).limit(150),
  db.from("properties").select("id,title").eq("status","published").is("deleted_at",null).order("updated_at",{ascending:false}).limit(150)
 ]);
 const tasks=(tasksResult.data||[]) as Task[];
 const people=(peopleResult.data||[]) as Person[];
 const properties=(propertiesResult.data||[]) as Property[];
 const personNames=new Map(people.map(p=>[p.id,p.display_name]));
 const propertyNames=new Map(properties.map(p=>[p.id,p.title]));
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Taipei",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const overdue=tasks.filter(x=>x.status==="open"&&new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Taipei",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(x.due_at))<today);
 const open=tasks.filter(x=>x.status==="open");
 return <main className="section"><div className="container">
  <div className="actions" style={{justifyContent:"space-between",marginBottom:18}}>
   <div><h1 style={{margin:0}}>銷售跟進任務</h1><p className="muted">第一版僅顯示自己負責的任務；客戶有看屋意願不代表已確認帶看。</p></div>
   <Link className="button ghost" href="/admin">返回銷售工作台</Link>
  </div>
  {params.saved?<div className="notice">任務已儲存。</div>:null}
  {params.error?<div className="notice">操作未成功（{params.error}）。請檢查欄位、權限及 Preview 資料表。</div>:null}
  {tasksResult.error?<div className="notice">無法讀取銷售任務；請先在 Preview Supabase 執行對應 migration，並確認 RLS 權限。</div>:null}
  <div className="people-summary-grid" style={{marginBottom:16}}>
   <article className="card"><div className="card-body"><p className="muted">待跟進</p><strong style={{fontSize:"1.8rem"}}>{open.length}</strong></div></article>
   <article className="card"><div className="card-body"><p className="muted">已逾期</p><strong style={{fontSize:"1.8rem"}}>{overdue.length}</strong></div></article>
   <article className="card"><div className="card-body"><p className="muted">待確認帶看</p><strong style={{fontSize:"1.8rem"}}>{open.filter(x=>x.task_type==="showing"&&x.showing_status==="pending_confirmation").length}</strong></div></article>
  </div>
  <div className="card" style={{marginBottom:18}}><div className="card-body">
   <h2 style={{marginTop:0}}>新增跟進任務</h2>
   <p className="muted">至少選擇一位客戶或一件在售物件；時區為台北時間。完成後仍保留紀錄。</p>
   <form action={createSalesTask} className="form-grid">
    <label className="field"><span>任務名稱</span><input className="input" required maxLength={120} name="title" placeholder="例如：確認謝小姐星期日下午帶看"/></label>
    <label className="field"><span>對應客戶</span><select className="select" name="person_id" defaultValue=""><option value="">不指定客戶</option>{people.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select></label>
    <label className="field"><span>對應物件</span><select className="select" name="property_id" defaultValue=""><option value="">不指定物件</option>{properties.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
    <label className="field"><span>任務類型</span><select className="select" name="task_type" defaultValue="follow_up">{Object.entries(taskTypeLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
    <label className="field"><span>帶看狀態（僅帶看任務適用）</span><select className="select" name="showing_status" defaultValue="pending_confirmation">{Object.entries(showingStatusLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
    <label className="field"><span>優先順序</span><select className="select" name="priority" defaultValue="normal"><option value="low">一般</option><option value="normal">正常</option><option value="high">優先</option></select></label>
    <label className="field"><span>下次跟進時間（台北）</span><input className="input" name="due_at" type="datetime-local" required/></label>
    <label className="field"><span>備註</span><textarea className="input" name="notes" rows={2} maxLength={2000}/></label>
    <div className="actions"><button type="submit" className="button" disabled={Boolean(tasksResult.error)}>建立任務</button></div>
   </form>
  </div></div>
  <div className="card"><div className="card-body"><h2 style={{marginTop:0}}>任務列表（依到期時間）</h2>
   <div className="table-wrap"><table><thead><tr><th>任務</th><th>關聯</th><th>期限</th><th>狀態</th><th>操作</th></tr></thead><tbody>
    {tasks.map(t=><tr key={t.id}><td><strong>{t.title}</strong><br/><span className="muted">{taskTypeLabels[t.task_type]||t.task_type} {t.showing_status? "／"+(showingStatusLabels[t.showing_status]||t.showing_status):""}</span>{t.notes?<p className="muted">{t.notes}</p>:null}</td>
      <td>{t.person_id?<p><Link href={`/admin/people/${t.person_id}`}>{personNames.get(t.person_id)||"查看客戶"}</Link></p>:null}{t.property_id?<p><Link href={`/admin/properties/${t.property_id}/edit`}>{propertyNames.get(t.property_id)||"查看物件"}</Link></p>:null}</td>
      <td>{formatDate(t.due_at)}</td><td>{t.status==="open"?"待跟進":t.status==="completed"?"已完成":"已取消"}</td>
      <td>{t.status==="open"?<div className="actions"><form action={changeSalesTaskStatus.bind(null,t.id,"completed")}><button className="button" type="submit">完成</button></form><form action={changeSalesTaskStatus.bind(null,t.id,"cancelled")}><button className="button ghost" type="submit">取消</button></form></div>:<form action={changeSalesTaskStatus.bind(null,t.id,"open")}><button className="button ghost" type="submit">重新開啟</button></form>}</td>
     </tr>)}
    {!tasks.length?<tr><td colSpan={5}>尚未建立任務。</td></tr>:null}
   </tbody></table></div>
  </div></div>
 </div></main>;
}
