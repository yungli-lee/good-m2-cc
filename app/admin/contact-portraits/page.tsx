import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveContactPortraitAction } from "./actions";

export const runtime = "edge";

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function ContactPortraitsPage({ searchParams }: Props) {
  await requireRole(["editor", "admin", "owner"]);
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: page } = await supabase
    .from("site_pages")
    .select("markdown_content")
    .eq("page_type", "contact")
    .eq("status", "published")
    .is("archived_at", null)
    .eq("show_as_page", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  const content = String(page?.markdown_content || "");
  const portraits = Object.fromEntries(Array.from(content.matchAll(/<!-- contact-portrait:(ayong|amei) (https:\/\/[^\s<>]+) -->/g)).map((match) => [match[1], match[2]]));
  const errorText: Record<string, string> = {
    person: "人物資料不正確。", missing: "請先選擇照片。", format: "請上傳 5MB 以內的 JPG、PNG 或 WebP 照片。",
    page: "找不到已發布的「聯絡我們」頁面。", upload: "照片上傳失敗，請稍後再試。",
    save: "頁面資料儲存失敗，或同時有其他人正在編輯；請重新整理後再試。"
  };
  return (
    <main className="section">
      <div className="container">
        <div className="admin-page-header">
          <div><p className="eyebrow">Contact</p><h1>阿勇、阿美個別頭像管理</h1><p className="muted">兩人各自上傳照片，儲存後會顯示在前台「聯絡我們」的人物卡片，不會變更公司 Logo。</p></div>
          <div className="admin-actions"><Link className="button ghost" href="/admin/site-pages">返回頁面管理</Link><Link className="button ghost" href="/contact" target="_blank">查看前台</Link></div>
        </div>
        {query.saved ? <div className="success">{query.saved === "ayong" ? "阿勇" : "阿美"}照片已儲存，前台將使用新照片。</div> : null}
        {query.error ? <div className="notice">{errorText[query.error] || "儲存失敗。"}</div> : null}
        {!page ? <div className="notice">目前沒有已發布的 Contact 頁面，請先發布聯絡我們頁面。</div> : null}
        <div className="grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {([{ key: "ayong", label: "阿勇" }, { key: "amei", label: "阿美" }] as const).map((person) => (
            <section className="card" key={person.key}>
              <div className="card-body">
                <h2>{person.label}的照片</h2>
                {portraits[person.key] ? <img src={portraits[person.key]} alt={`${person.label}目前的照片`} style={{ width: "100%", maxHeight: 320, objectFit: "contain", background: "#f5f5f5", borderRadius: 12 }} /> : <p className="muted">尚未上傳照片</p>}
                <form action={saveContactPortraitAction} encType="multipart/form-data" className="form-grid">
                  <input type="hidden" name="person" value={person.key} />
                  <div className="field full"><label htmlFor={`portrait-${person.key}`}>選擇新照片</label><input className="input" id={`portrait-${person.key}`} name="portrait" type="file" accept="image/jpeg,image/png,image/webp" required /><span className="muted">JPG、PNG、WebP，最大 5MB。新照片儲存後取代此人物的舊照片。</span></div>
                  <div className="field full"><button className="button" type="submit" disabled={!page}>儲存{person.label}照片</button></div>
                </form>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
