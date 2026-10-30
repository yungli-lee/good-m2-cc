import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSocialPost, editSocialPost, updateSocialPost, deleteSocialPost } from "./actions";
import { CopyPostButton } from "./copy-button";
import { PublishFacebookButton } from "./publish-facebook-button";
import { DeleteFacebookButton } from "./delete-facebook-button";

export const runtime = "edge";
export const dynamic = "force-dynamic";
const categories: Record<string,string> = {property:"物件推薦",knowledge:"知識／政策",daily:"生活分享",general:"自由貼文"};
const statuses: Record<string,string> = {draft:"草稿",ready:"待發布",posted:"已手動發布",archived:"封存",publishing:"發布中",publish_unknown:"發文結果待核對"};

export default async function SocialPostsPage() {
  const current = await requireRole(["editor","admin","owner"]);
  const supabase = await createSupabaseServerClient();
  const { data: posts, error } = await supabase.from("social_posts")
    .select("id,title,body,category,status,destination_notes,facebook_post_id,facebook_deleted_at,created_at")
    .eq("author_id",current.user.id).order("created_at",{ascending:false}).limit(100);
  const facebookReady = process.env.FACEBOOK_PUBLISH_ENABLED === "true" && Boolean(process.env.FACEBOOK_PAGE_ACCESS_TOKEN);
  return <main className="section"><div className="container">
    <div className="admin-page-header"><div><p className="eyebrow">Social Publishing</p><h1>社群發文管理</h1>
      <p className="muted">不限物件推薦。集中管理草稿、社團目的地及人工發布紀錄；不會自動發布到 Facebook。</p></div>
      <Link className="button ghost" href="/admin">返回後台</Link></div>
    {!facebookReady ? <div className="notice" role="status" style={{marginBottom:18}}>Facebook 直接發布尚未啟用：Preview 伺服器缺少啟用設定或粉專權杖。草稿仍可儲存、編輯，但目前不會發送到 Facebook。請先由管理者設定 Preview 的 FACEBOOK_PAGE_ACCESS_TOKEN（伺服器加密環境變數）及 FACEBOOK_PUBLISH_ENABLED=true，再重新部署。不要將 Token 複製到網站欄位或聊天中。</div> : <div className="success" role="status" style={{marginBottom:18}}>Facebook 發布服務設定已載入。實際發布前請確認目標粉專及內容。</div>}
    <section className="card" style={{marginBottom:24}}><div className="card-body">
      <h2>新增發文草稿</h2>
      <form action={createSocialPost} style={{display:"grid",gap:14}}>
        <label className="field"><span>貼文標題（僅供後台辨識）</span><input className="input" name="title" maxLength={200} required placeholder="例如：週末早安分享"/></label>
        <label className="field"><span>內容分類</span><select className="input" name="category" defaultValue="general">
          {Object.entries(categories).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <label className="field"><span>貼文文案</span><textarea className="input" name="body" rows={7} maxLength={20000} placeholder="輸入 Facebook 貼文內容、Hashtag、連結…"/></label>
        <label className="field"><span>發文社團／目的地備註</span><textarea className="input" name="destination_notes" rows={3} maxLength={4000} placeholder="例如：彰化房屋買賣社團、個人動態、粉專"/></label>
        <div className="admin-actions"><button className="button" type="submit">儲存草稿</button></div>
      </form>
    </div></section>
    <h2>我的貼文（最近 100 筆）</h2>
    {error ? <div className="notice">目前無法讀取貼文資料。請確認 social_posts 資料表已部署到測試資料庫。</div> : null}
    <div style={{display:"grid",gap:14}}>
      {(posts||[]).map(post=><article className="card" key={post.id}><div className="card-body">
        <div className="actions" style={{justifyContent:"space-between"}}><strong>{post.title}</strong><span className="muted">{statuses[post.status]||post.status} · {categories[post.category]||post.category}</span></div>
        <p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{post.body||"（尚未輸入文案）"}</p>
        {post.destination_notes ? <p className="muted" style={{whiteSpace:"pre-wrap"}}>目的地：{post.destination_notes}</p> : null}
        {(post.status === "draft" || post.status === "ready") ? <details style={{marginBottom:12}}>
          <summary style={{cursor:"pointer",fontWeight:600}}>編輯草稿</summary>
          <form action={editSocialPost.bind(null,post.id)} style={{display:"grid",gap:12,marginTop:12}}>
            <label className="field"><span>標題</span><input className="input" name="title" defaultValue={post.title} required maxLength={200}/></label>
            <label className="field"><span>分類</span><select className="input" name="category" defaultValue={post.category}>
              {Object.entries(categories).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
            <label className="field"><span>貼文內容</span><textarea className="input" name="body" rows={6} defaultValue={post.body||""} maxLength={20000}/></label>
            <label className="field"><span>目的地備註</span><textarea className="input" name="destination_notes" rows={2} defaultValue={post.destination_notes||""} maxLength={4000}/></label>
            <div><button className="button" type="submit">儲存修改</button></div>
          </form>
        </details> : null}
        {post.facebook_post_id ? <p className="muted">Facebook 貼文 ID：{post.facebook_post_id} · {post.facebook_deleted_at ? "已刪除" : "已發布"}　<a href={"https://www.facebook.com/"+post.facebook_post_id.replace("_","/posts/")} target="_blank" rel="noopener noreferrer">查看原文</a></p> : null}
        <div className="admin-actions" style={{flexWrap:"wrap"}}>
          <CopyPostButton body={post.body||""} />
          {((post.status==="draft"||post.status==="ready") && !post.facebook_post_id) ? <PublishFacebookButton id={post.id} enabled={facebookReady}/> : null}
          {post.facebook_post_id && !post.facebook_deleted_at && (current.profile.role==="admin"||current.profile.role==="owner") ? <DeleteFacebookButton id={post.id}/> : null}
          <a className="button ghost" href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer">開啟 Facebook</a>
          <form action={updateSocialPost.bind(null,post.id)}><select className="input" name="status" defaultValue={post.status}>{Object.entries(statuses).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select><button className="button ghost" type="submit">更新狀態</button></form>
          <form action={deleteSocialPost.bind(null,post.id)}><button className="button danger" type="submit">刪除</button></form>
        </div>
      </div></article>)}
      {!error&&!posts?.length ? <p className="muted">尚無草稿。從上方新增第一篇貼文。</p> : null}
    </div>
  </div></main>;
}
