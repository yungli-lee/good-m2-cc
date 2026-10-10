import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ page?: string; session?: string }> };
type Session = { id: string; consented_at: string; expires_at: string; source_path: string };
type Message = { id: number; role: string; message: string; created_at: string; property_slug: string | null; preference: string; needs: unknown };
function formatDate(input: string) { return new Date(input).toLocaleString("zh-TW", {timeZone:"Asia/Taipei", hour12:false}); }
export default async function AiConversationArchive({ searchParams }: Props) {
  await requireRole(["admin","owner"]);
  const params = await searchParams;
  const pageNumber = Number(params.page || "1");
  const page = Number.isSafeInteger(pageNumber) && pageNumber > 0 && pageNumber <= 10000 ? pageNumber : 1;
  const selected = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(params.session || "") ? params.session! : "";
  const db = createSupabaseAdminClient();
  const { data, error, count } = await db.from("concierge_consented_sessions")
    .select("id,consented_at,expires_at,source_path",{count:"exact"})
    .gt("expires_at",new Date().toISOString())
    .order("consented_at",{ascending:false}).range((page-1)*20,page*20-1);
  const sessions = (data || []) as Session[];
  const { data: sessionData } = selected ? await db.from("concierge_consented_sessions").select("id,consented_at,expires_at,source_path").eq("id",selected).gt("expires_at",new Date().toISOString()).maybeSingle() : {data:null};
  const { data: messages, error: messageError } = sessionData ? await db.from("concierge_consented_messages")
    .select("id,role,message,created_at,property_slug,preference,needs")
    .eq("session_id",sessionData.id).order("id",{ascending:true}).limit(300) : {data:[],error:null};
  return <main className="section"><div className="container">
    <div className="actions" style={{justifyContent:"space-between"}}><h1>AI 對話紀錄</h1><Link className="button ghost" href="/admin">返回後台</Link></div>
    <p className="muted">僅限管理員檢視已同意且尚未到期的對話。撤回同意後即從資料庫刪除，不再顯示。此頁不建立 CRM 客戶資料。</p>
    {error ? <p role="alert">對話列表讀取失敗，請確認資料庫設定。</p> : <p>有效同意紀錄：{count ?? sessions.length} 筆</p>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),1fr))",gap:24,alignItems:"start"}}>
      <section aria-label="對話列表">
        <h2>對話清單</h2>
        {!error && sessions.length === 0 && <p>目前沒有可檢視的對話紀錄。</p>}
        {sessions.map(item=><div key={item.id} style={{padding:"12px 0",borderBottom:"1px solid #ded6c6"}}>
          <Link href={`/admin/ai-conversations?page=${page}&session=${item.id}`}><strong>{formatDate(item.consented_at)}</strong></Link>
          <p className="muted" style={{margin:"4px 0"}}>來源：{item.source_path} · 到期：{formatDate(item.expires_at)}</p>
        </div>)}
        <nav className="actions" aria-label="對話分頁" style={{marginTop:20}}>
          {page>1 && <Link className="button" href={`/admin/ai-conversations?page=${page-1}`}>上一頁</Link>}
          {(count ?? 0)>page*20 && <Link className="button" href={`/admin/ai-conversations?page=${page+1}`}>下一頁</Link>}
        </nav>
      </section>
      <section aria-label="對話明細">
        <h2>對話內容</h2>
        {!selected && <p className="muted">點選左側紀錄查看內容。</p>}
        {selected && !sessionData && <p>紀錄不存在、已撤回同意或已到期。</p>}
        {sessionData && <><p>同意時間：{formatDate(sessionData.consented_at)} · 來源：{sessionData.source_path}</p>
          {messageError && <p role="alert">對話內容讀取失敗。</p>}
          {!messageError && (messages as Message[] || []).length===0 && <p>此 Session 尚未保存任何問答。</p>}
          {((messages || []) as Message[]).map(m=><article key={m.id} style={{background:m.role==="user"?"#e9eff7":"#fff7e8",borderRadius:12,padding:14,margin:"12px 0",overflowWrap:"anywhere"}}>
            <strong>{m.role==="user"?"訪客":"AI 小助手"}</strong> <small className="muted">{formatDate(m.created_at)}</small>
            <p style={{whiteSpace:"pre-wrap"}}>{m.message}</p>
            {m.property_slug && <p className="muted">關聯物件：{m.property_slug}</p>}
            {m.role==="user" && m.preference!=="unspecified" && <p className="muted">偏好：{m.preference==="interested"?"有興趣":"不感興趣"}</p>}
          </article>)}
          {(messages || []).length===300 && <p className="muted">僅顯示前 300 則訊息。</p>}
        </>}
      </section>
    </div>
  </div></main>;
}
