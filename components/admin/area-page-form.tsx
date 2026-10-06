import type { AreaPageRecord } from "@/lib/areas-cms";

const lines = (value: string[]) => value.join("\n");
const pairs = (value: Array<Record<string,string>>, first: string, second: string) => value.map((item) => `${item[first]}｜${item[second]}`).join("\n");
export function AreaPageForm({ area, action }: { area?: AreaPageRecord | null; action: string | ((formData: FormData) => Promise<void>) }) {
  return <form className="form-grid" action={action} method={typeof action === "string" ? "post" : undefined}>
    <label className="field"><span>狀態</span><select className="select" name="status" defaultValue={area?.status || "draft"}><option value="draft">草稿</option><option value="published">發布</option><option value="archived">下架</option></select></label>
    <label className="field"><span>排序</span><input className="input" name="sort_order" type="number" min="0" defaultValue={area?.sort_order ?? 1000} required /></label>
    <label className="field"><span>網址 Slug</span><input className="input" name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={area?.slug || ""} required /></label>
    <label className="field"><span>英文標籤</span><input className="input" name="eyebrow" defaultValue={area?.eyebrow || ""} /></label>
    <label className="field"><span>縣市</span><input className="input" name="city" defaultValue={area?.city || "彰化縣"} required /></label>
    <label className="field"><span>鄉鎮市區（物件篩選欄位）</span><input className="input" name="district" defaultValue={area?.district || ""} required /></label>
    <label className="field"><span>正式名稱</span><input className="input" name="name" defaultValue={area?.name || ""} placeholder="福興鄉" required /></label>
    <label className="field"><span>文案簡稱</span><input className="input" name="short_name" defaultValue={area?.shortName || ""} placeholder="福興" required /></label>
    <label className="field full"><span>頁面主標題</span><input className="input" name="headline" defaultValue={area?.headline || ""} required /></label>
    <label className="field full"><span>主摘要</span><textarea className="textarea" name="summary" rows={3} defaultValue={area?.summary || ""} /></label>
    <label className="field full"><span>地區介紹</span><textarea className="textarea" name="description" rows={5} defaultValue={area?.description || ""} /></label>
    <label className="field full"><span>物件類型標籤（每行一項）</span><textarea className="textarea" name="property_keywords_text" rows={4} defaultValue={lines(area?.propertyKeywords || [])} /></label>
    <label className="field full"><span>適合客群（每行一項）</span><textarea className="textarea" name="audiences_text" rows={5} defaultValue={lines(area?.audiences || [])} /></label>
    <label className="field full"><span>觀察重點（每行：標題｜說明）</span><textarea className="textarea" name="features_text" rows={6} defaultValue={pairs((area?.features || []) as Array<Record<string,string>>, "title", "description")} /></label>
    <label className="field full"><span>注意事項（每行一項）</span><textarea className="textarea" name="cautions_text" rows={5} defaultValue={lines(area?.cautions || [])} /></label>
    <label className="field full"><span>FAQ（每行：問題｜回答）</span><textarea className="textarea" name="faqs_text" rows={8} defaultValue={pairs((area?.faqs || []) as Array<Record<string,string>>, "question", "answer")} /></label>
    <label className="field full"><span>SEO Title（空白使用主標題）</span><input className="input" name="seo_title" defaultValue={area?.seo_title || ""} /></label>
    <label className="field full"><span>SEO Description（空白使用主摘要）</span><textarea className="textarea" name="seo_description" rows={3} defaultValue={area?.seo_description || ""} /></label>
    <div className="field full"><button className="button" type="submit">儲存服務地區</button></div>
  </form>;
}
