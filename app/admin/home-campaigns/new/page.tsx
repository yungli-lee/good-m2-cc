import Link from "next/link";
import { HomeCampaignForm } from "@/components/admin/home-campaign-form";
import { requireRole } from "@/lib/auth";
import { listAdminMediaAssets } from "@/lib/media";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewHomeCampaignPage({ searchParams }: Props) {
  const params = await searchParams;
  await requireRole(["editor", "admin", "owner"]);
  const supabase = await createSupabaseServerClient();
  const mediaResult = await listAdminMediaAssets({ supabase, category: "all", status: "active", sort: "newest" });

  return (
    <main className="section">
      <div className="container">
        <div className="admin-page-header">
          <div>
            <p className="eyebrow">Home CMS</p>
            <h1>新增首頁 Campaign</h1>
          </div>
          <Link className="button ghost" href="/admin/home-campaigns">返回列表</Link>
        </div>
        {params.error ? <div className="notice">新增失敗：{params.error}</div> : null}
        <HomeCampaignForm mediaAssets={mediaResult.data} />
      </div>
    </main>
  );
}
