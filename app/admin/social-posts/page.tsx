import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSocialPost, editSocialPost, updateSocialPost, deleteSocialPost } from "./actions";
import { CopyPostButton } from "./copy-button";
import { PublishFacebookButton } from "./publish-facebook-button";
import { DeleteFacebookButton } from "./delete-facebook-button";
import { FacebookConnectionCheck } from "./facebook-connection-check";
import { ScheduleFacebookButton } from "./schedule-facebook-button";
import { SyncFacebookStatusButton } from "./sync-facebook-status-button";
import { UploadPostImage } from "./upload-post-image";
import { DiagnoseImagesButton } from "./diagnose-images-button";
import { MetaPhotoTestButton } from "./meta-photo-test-button";

export const runtime = "edge";
export const dynamic = "force-dynamic";
const categories: Record<string,string> = {property:"物件推薦",knowledge:"知識／政策",daily:"生活分享",general:"自由貼文"};
const statuses: Record<string,string> = {draft:"草稿",ready:"待發布",posted:"已發布",archived:"封存",publishing:"發布中",publish_unknown:"發文結果待核對",scheduled:"已預約"};

type SearchParams = { q?: string; status?: string; sort?: string; from?: string; to?: string; page?: string };
const PAGE_SIZE = 20;
const filterStatuses = ["all", "draft", "ready", "scheduled", "posted", "publishing", "publish_unknown", "archived"];
const filterSorts = ["newest", "oldest", "scheduled"];

export default async function SocialPostsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = (await searchParams) || {};
  const keyword = (typeof params.q === "string" ? params.q : "").trim().slice(0, 120);
  const statusFilter = filterStatuses.includes(params.status || "") ? params.status! : "all";
  const sort = filterSorts.includes(params.sort || "") ? params.sort! : "newest";
  const from = typeof params.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.from) && !Number.isNaN(Date.parse(params.from)) ? params.from : "";
  const to = typeof params.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.to) && !Number.isNaN(Date.parse(params.to)) ? params.to : "";
  const page = typeof params.page === "string" && /^[1-9]\d{0,5}$/.test(params.page) ? Number(params.page) : 1;
  const pageUrl = (number: number) => {
    const query = new URLSearchParams();
    if (keyword) query.set("q", keyword);
    if (statusFilter !== "all") query.set("status", statusFilter);
    if (sort !== "newest") query.set("sort", sort);
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    query.set("page", String(number));
    return "/admin/social-posts?" + query.toString();
  };
  const current = await requireRole(["editor","admin","owner"]);
  const supabase = await createSupabaseServerClient();
  // Filter before pagination so deleted Facebook posts do not consume page slots.
  let query = supabase.from("social_posts")
    .select("id,title,body,category,status,destination_notes,facebook_post_id,facebook_deleted_at,facebook_scheduled_for,link_url,created_at", { count: "exact" })
    .eq("author_id", current.user.id)
    .is("facebook_deleted_at", null);
  if (statusFilter !== "all") query = query.eq("status", statusFilter);
  if (from) query = query.gte("created_at", from + "T00:00:00+08:00");
  if (to) {
    const exclusiveEnd = new Date(to + "T00:00:00+08:00");
    exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
    query = query.lt("created_at", exclusiveEnd.toISOString());
  }
  if (keyword) {
    // PostgREST OR filters use a quoted value; remove filter grammar characters
    // rather than interpolating them into the expression.
    const safe = keyword.replace(/[(),\\\"%*]/g, " ").replace(/\s+/g, " ").trim();
    if (safe) {
      const value = '"*' + safe + '*"';
      query = query.or(["title", "body", "link_url", "facebook_post_id"].map(column => column + ".ilike." + value).join(","));
    }
  }
  if (sort === "scheduled") query = query.order("facebook_scheduled_for", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
  else query = query.order("created_at", { ascending: sort === "oldest" });
  const { data: posts, error, count } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const facebookReady = process.env.FACEBOOK_PUBLISH_ENABLED === "true" && Boolean(process.env.FACEBOOK_PAGE_ACCESS_TOKEN);
  return <main className="section"><div className="container">
    <div className="admin-page-header"><div><p className="eyebrow">Social Publishing</p><h1>社群發文管理</h1>
      <p className="muted">不限物件推薦。集中管理草稿、社團目的地及人工發布紀錄；不會自動發布到 Facebook。</p></div>
      <Link className="button ghost" href="/admin">返回後台</Link></div>
    {!facebookReady ? <div className="notice" role="status" style={{marginBottom:18}}>Facebook 直接發布尚未啟用：Preview 伺服器缺少啟用設定或粉專權杖。草稿仍可儲存、編輯，但目前不會發送到 Facebook。請先由管理者設定 Preview 的 FACEBOOK_PAGE_ACCESS_TOKEN（伺服器加密環境變數）及 FACEBOOK_PUBLISH_ENABLED=true，再重新部署。不要將 Token 複製到網站欄位或聊天中。</div> : <div className="success" role="status" style={{marginBottom:18}}>Facebook 發布服務設定已載入。實際發布前請確認目標粉專及內容。</div>}
    {(current.profile.role === "admin" || current.profile.role === "owner") ? <FacebookConnectionCheck/> : null}
    <section className="card" style={{marginBottom:24}}><div className="card-body">
      <h2>新增發文草稿</h2><p className="muted">第一步：先儲存草稿。第二步：在下方「我的貼文」找到該草稿，使用拖拉圖片上傳區新增照片，確認後再立即或預約發布。</p>
      <form action={createSocialPost} style={{display:"grid",gap:14}}>
        <label className="field"><span>貼文標題（僅供後台辨識）</span><input className="input" name="title" maxLength={200} required placeholder="例如：週末早安分享"/></label>
        <label className="field"><span>內容分類</span><select className="input" name="category" defaultValue="general">
          {Object.entries(categories).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <label className="field"><span>貼文文案</span><textarea className="input" name="body" rows={7} maxLength={20000} placeholder="輸入 Facebook 貼文內容、Hashtag、連結…"/></label>
        <label className="field"><span>分享連結（選填，https://）</span><input className="input" type="url" name="link_url" placeholder="https://example.com/..." /></label>
        <label className="field"><span>發文社團／目的地備註</span><textarea className="input" name="destination_notes" rows={3} maxLength={4000} placeholder="例如：彰化房屋買賣社團、個人動態、粉專"/></label>
        <div className="admin-actions"><button className="button" type="submit">儲存草稿</button></div>
      </form>
    </div></section>
    <h2>我的貼文</h2>
    <form method="get" action="/admin/social-posts" className="card" style={{marginBottom:18}}>
      <div className="card-body" style={{display:"grid",gap:12}}>
        <label className="field"><span>搜尋貼文索引</span><input className="input" type="search" name="q" defaultValue={keyword} maxLength={120} placeholder="標題、內文、網址或 Facebook 貼文 ID"/></label>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12}}>
          <label className="field"><span>發布狀態</span><select className="input" name="status" defaultValue={statusFilter}>
            <option value="all">全部狀態</option>
            {Object.entries(statuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}
          </select></label>
          <label className="field"><span>排序</span><select className="input" name="sort" defaultValue={sort}>
            <option value="newest">最新優先</option><option value="oldest">最舊優先</option><option value="scheduled">預約時間優先</option>
          </select></label>
          <label className="field"><span>建立日期起</span><input className="input" type="date" name="from" defaultValue={from}/></label>
          <label className="field"><span>建立日期迄</span><input className="input" type="date" name="to" defaultValue={to}/></label>
        </div>
        <div className="admin-actions"><button className="button" type="submit">搜尋貼文</button><Link className="button ghost" href="/admin/social-posts">清除條件</Link></div>
        <p className="muted" style={{margin:0}}>搜尋涵蓋全部歷史貼文，預設不顯示 Facebook 已刪除的紀錄；每頁 20 筆。</p>
      </div>
    </form>
    {!error ? <p className="muted" role="status">符合條件共 {total} 筆 · 第 {Math.min(page,totalPages)} / {totalPages} 頁</p> : null}
    {error ? <div className="notice">目前無法讀取貼文資料。請確認 social_posts 資料表已部署到測試資料庫。</div> : null}
    <div style={{display:"grid",gap:14}}>
      {(posts||[]).map(post=><article className="card" key={post.id}><div className="card-body">
        <div className="actions" style={{justifyContent:"space-between"}}><strong>{post.title}</strong><span className="muted">{post.facebook_deleted_at ? "封存" : post.status==="scheduled" ? "已預約" : post.facebook_post_id ? "已發布" : statuses[post.status]||post.status} · {categories[post.category]||post.category}</span></div>
        <p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{post.body||"（尚未輸入文案）"}</p>
        {post.link_url ? <p className="muted">分享連結：<a href={post.link_url} target="_blank" rel="noopener noreferrer">{post.link_url}</a></p> : null}
        {post.destination_notes ? <p className="muted" style={{whiteSpace:"pre-wrap"}}>目的地：{post.destination_notes}</p> : null}
        {(post.status === "draft" || post.status === "ready") ? <UploadPostImage id={post.id}/> : null}
        {post.status === "publish_unknown" ? <><DiagnoseImagesButton id={post.id}/>{(current.profile.role==="admin"||current.profile.role==="owner")?<MetaPhotoTestButton id={post.id}/>:null}</> : null}
        {(post.status === "draft" || post.status === "ready") ? <details style={{marginBottom:12}}>
          <summary style={{cursor:"pointer",fontWeight:600}}>編輯草稿</summary>
          <form action={editSocialPost.bind(null,post.id)} style={{display:"grid",gap:12,marginTop:12}}>
            <label className="field"><span>標題</span><input className="input" name="title" defaultValue={post.title} required maxLength={200}/></label>
            <label className="field"><span>分類</span><select className="input" name="category" defaultValue={post.category}>
              {Object.entries(categories).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
            <label className="field"><span>貼文內容</span><textarea className="input" name="body" rows={6} defaultValue={post.body||""} maxLength={20000}/></label>
            <label className="field"><span>分享連結</span><input className="input" type="url" name="link_url" defaultValue={post.link_url||""}/></label>
            <label className="field"><span>目的地備註</span><textarea className="input" name="destination_notes" rows={2} defaultValue={post.destination_notes||""} maxLength={4000}/></label>
            <div><button className="button" type="submit">儲存修改</button></div>
          </form>
        </details> : null}
        <p className="muted">Facebook 發布狀態：{post.facebook_deleted_at ? "已刪除" : post.status==="scheduled" ? "已預約（未發布）" : post.facebook_post_id ? "已發布" : post.status==="publishing" ? "發布中" : post.status==="publish_unknown" ? "結果待核對" : "未發布"}</p>
        {post.facebook_scheduled_for ? <p className="muted">Facebook 預定發布：{new Date(post.facebook_scheduled_for).toLocaleString("zh-TW",{timeZone:"Asia/Taipei"})}（台灣時間）</p> : null}
        {post.facebook_post_id ? <p className="muted">Facebook 貼文 ID：{post.facebook_post_id}　{post.facebook_deleted_at ? <span>原文已刪除，僅保留歷史紀錄</span> : post.status==="scheduled" ? <span>已預約，請到 Facebook 排程區管理</span> : <a href={"https://www.facebook.com/"+post.facebook_post_id.replace("_","/posts/")} target="_blank" rel="noopener noreferrer">查看原文</a>}</p> : null}
        <div className="admin-actions" style={{flexWrap:"wrap"}}>
          <CopyPostButton body={post.body||""} />
          {post.facebook_post_id && !post.facebook_deleted_at ? <SyncFacebookStatusButton id={post.id}/> : null}
          {((post.status==="draft"||post.status==="ready") && !post.facebook_post_id) ? <><PublishFacebookButton id={post.id} enabled={facebookReady}/><ScheduleFacebookButton id={post.id} enabled={facebookReady}/></> : null}
          {post.facebook_post_id && !post.facebook_deleted_at && post.status!=="scheduled" && (current.profile.role==="admin"||current.profile.role==="owner") ? <DeleteFacebookButton id={post.id}/> : null}
          <a className="button ghost" href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer">開啟 Facebook</a>
          {!post.facebook_post_id && ["draft","ready","archived"].includes(post.status) ? <form action={updateSocialPost.bind(null,post.id)}><select className="input" name="status" defaultValue={post.status}>{[["draft","草稿"],["ready","待發布"],["archived","封存"]].map(([value,label])=><option value={value} key={value}>{label}</option>)}</select><button className="button ghost" type="submit">更新狀態</button></form> : null}
          {!post.facebook_post_id ? <form action={deleteSocialPost.bind(null,post.id)}><button className="button danger" type="submit">刪除草稿</button></form> : null}
        </div>
      </div></article>)}
      {!error&&!posts?.length ? <p className="muted">{page > totalPages ? "此頁沒有貼文，請返回上一頁。" : "沒有符合條件的貼文。"}</p> : null}
    </div>
    {!error && totalPages > 1 ? <nav aria-label="貼文分頁" className="admin-actions" style={{marginTop:18,flexWrap:"wrap"}}>
      {page > 1 ? <Link className="button ghost" href={pageUrl(page-1)}>上一頁</Link> : null}
      <span className="muted">第 {Math.min(page,totalPages)} / {totalPages} 頁</span>
      {page < totalPages ? <Link className="button ghost" href={pageUrl(page+1)}>下一頁</Link> : null}
    </nav> : null}
  </div></main>;
}
