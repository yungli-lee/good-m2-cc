import Link from "next/link";
import { notFound } from "next/navigation";
import { HomeCampaignForm } from "@/components/admin/home-campaign-form";
import { requireRole } from "@/lib/auth";
import { getHomeCampaign } from "@/lib/home-cms/queries";
import { listAdminMediaAssets } from "@/lib/media";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

export default async function EditHomeCampaignPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  await requireRole(["editor", "admin", "owner"]);
  const supabase = await createSupabaseServerClient();
  const [{ data: campaign }, mediaResult] = await Promise.all([
    getHomeCampaign(id),
    listAdminMediaAssets({ supabase, category: "all", status: "active", sort: "newest" })
  ]);
  if (!campaign) notFound();

  return (
    <main className="section">
      <div className="container">
        <div className="admin-page-header">
          <div>
            <p className="eyebrow">Home CMS</p>
            <h1>編輯首頁 Campaign</h1>
            <p className="muted">{campaign.title}</p>
          </div>
          <Link className="button ghost" href="/admin/home-campaigns">返回列表</Link>
        </div>
        {query.saved ? <div className="success">Campaign 已儲存。</div> : null}
        {query.error ? <div className="notice">儲存失敗：{query.error}</div> : null}
        <HomeCampaignForm campaign={campaign} mediaAssets={mediaResult.data} />
      </div>
    </main>
  );
}
