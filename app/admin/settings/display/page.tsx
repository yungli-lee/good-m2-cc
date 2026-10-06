import Link from "next/link";
import { SiteDisplaySettingsForm } from "@/components/admin/site-display-settings-form";
import { requireRole } from "@/lib/auth";
import { getSiteDisplaySettings } from "@/lib/site-display-settings";

export const runtime = "edge";

export default async function DisplaySettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireRole(["editor", "admin", "owner"]);
  const [settings, query] = await Promise.all([getSiteDisplaySettings(), searchParams]);
  return <main className="section"><div className="container">
    <div className="actions" style={{ justifyContent: "space-between", marginBottom: 18 }}><div><h1 style={{ margin: 0 }}>前台顯示設定</h1><p className="muted">控制首頁物件輪播與知識庫列表密度。</p></div><Link className="button ghost" href="/admin">回後台首頁</Link></div>
    {query.saved ? <div className="notice">前台顯示設定已儲存。</div> : null}
    <div className="card"><div className="card-body"><SiteDisplaySettingsForm settings={settings} /></div></div>
  </div></main>;
}
