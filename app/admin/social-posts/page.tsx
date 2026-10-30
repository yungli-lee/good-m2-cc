import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSocialPost, updateSocialPost, deleteSocialPost } from "./actions";
import { CopyPostButton } from "./copy-button";

export const runtime = "edge";
export const dynamic = "force-dynamic";
const categories: Record<string,string> = {property:"物件推薦",knowledge:"知識／政策",daily:"生活分享",general:"自由貼文"};
const statuses: Record<string,string> = {draft:"草稿",ready:"待發布",posted:"已手動發布",archived:"封存"};

export default async function SocialPostsPage() {
  const current = await requireRole(["editor","admin","owner"]);
  const supabase = await createSupabaseServerClient();
  const { data: posts, error } = await supabase.from("social_posts")
    .select("id,title,body,category,status,destination_notes,created_at")
    .eq("author_id",current.user.id).order("created_at",{ascending:false}).limit(100);
  return <main className="section"><div className="container">
    <div className="admin-page-header"><div><p className="eyebrow">Social Publishing</p><h1>社群發文管理</h1>
      <p className="muted">不限物件推薦。集中管理草稿、社團目的地及人工發布紀錄；不會自動發布到 Facebook。</p></div>
      <Link className="button ghost" href="/admin">返回後台</Link></div>
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
        <div className="admin-actions" style={{flexWrap:"wrap"}}>
          <CopyPostButton body={post.body||""} />
          <a className="button ghost" href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer">開啟 Facebook</a>
          <form action={updateSocialPost.bind(null,post.id)}><select className="input" name="status" defaultValue={post.status}>{Object.entries(statuses).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select><button className="button ghost" type="submit">更新狀態</button></form>
          <form action={deleteSocialPost.bind(null,post.id)}><button className="button danger" type="submit">刪除</button></form>
        </div>
      </div></article>)}
      {!error&&!posts?.length ? <p className="muted">尚無草稿。從上方新增第一篇貼文。</p> : null}
    </div>
  </div></main>;
}
