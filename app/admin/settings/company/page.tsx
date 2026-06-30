import Link from "next/link";
import { CompanySettingsForm } from "@/components/admin/company-settings-form";
import { requireRole } from "@/lib/auth";
import { getPublicCompanySettings } from "@/lib/company-settings";

export const runtime = "edge";

type Props = {
  searchParams: Promise<{ saved?: string }>;
};

export default async function AdminCompanySettingsPage({ searchParams }: Props) {
  await requireRole(["editor", "admin", "owner"]);
  const query = await searchParams;
  const settings = await getPublicCompanySettings();

  return (
    <main className="section">
      <div className="container">
        <div className="actions" style={{ justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0 }}>公司資料設定</h1>
            <p className="muted">前台物件詳細頁會顯示這組公開公司資訊。</p>
          </div>
          <Link className="button ghost" href="/admin">回後台首頁</Link>
        </div>

        {query.saved ? <div className="notice">公司資料已儲存。</div> : null}
        <div className="card">
          <div className="card-body">
            <CompanySettingsForm settings={settings} />
          </div>
        </div>
      </div>
    </main>
  );
}
