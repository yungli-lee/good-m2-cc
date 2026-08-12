"use client";

import { useActionState } from "react";
import { updateSiteDisplaySettingsAction } from "@/app/admin/settings/display/actions";
import type { SiteDisplaySettings } from "@/lib/site-display-settings";

export function SiteDisplaySettingsForm({ settings }: { settings: SiteDisplaySettings }) {
  const [state, action, pending] = useActionState<{ error?: string }, FormData>(updateSiteDisplaySettingsAction, {});
  return <form className="form-grid" action={action}>
    {state.error ? <div className="notice field full">{state.error}</div> : null}
    <div className="field full"><h2 style={{ margin: 0 }}>首頁物件輪播</h2><p className="muted">精選與最新分開控制；最新物件會自動排除精選物件。</p></div>
    <div className="field"><label htmlFor="featured_property_limit">精選物件最多顯示</label><input className="input" id="featured_property_limit" name="featured_property_limit" type="number" min="3" max="24" defaultValue={settings.featured_property_limit} /></div>
    <div className="field"><label htmlFor="featured_property_interval_seconds">精選輪播秒數</label><input className="input" id="featured_property_interval_seconds" name="featured_property_interval_seconds" type="number" min="3" max="30" defaultValue={settings.featured_property_interval_seconds} /></div>
    <label className="field"><span>精選自動輪播</span><input name="featured_property_autoplay" type="checkbox" defaultChecked={settings.featured_property_autoplay} /></label>
    <div className="field"><label htmlFor="latest_property_limit">最新物件最多顯示</label><input className="input" id="latest_property_limit" name="latest_property_limit" type="number" min="3" max="24" defaultValue={settings.latest_property_limit} /></div>
    <div className="field"><label htmlFor="latest_property_interval_seconds">最新輪播秒數</label><input className="input" id="latest_property_interval_seconds" name="latest_property_interval_seconds" type="number" min="3" max="30" defaultValue={settings.latest_property_interval_seconds} /></div>
    <label className="field"><span>最新自動輪播</span><input name="latest_property_autoplay" type="checkbox" defaultChecked={settings.latest_property_autoplay} /></label>
    <div className="field full"><h2>知識庫列表</h2><label htmlFor="knowledge_page_size">每頁文章數</label><select className="input" id="knowledge_page_size" name="knowledge_page_size" defaultValue={settings.knowledge_page_size}>{[6, 9, 12].map((value) => <option value={value} key={value}>{value} 篇</option>)}</select><p className="muted">首頁最新不動產知識固定顯示 3 篇，不受此設定影響。</p></div>
    <div className="field full"><button className="button" disabled={pending}>{pending ? "儲存中…" : "儲存前台顯示設定"}</button></div>
  </form>;
}
