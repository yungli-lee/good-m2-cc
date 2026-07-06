import Link from "next/link";
import { SitePageForm } from "@/components/admin/site-page-form";
import { requireRole } from "@/lib/auth";
import { listAdminMediaAssets } from "@/lib/media";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSitePageAction } from "../actions";

export const runtime = "edge";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewSitePagePage({ searchParams }: Props) {
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
            <h1>新增靜態頁面內容</h1>
          </div>
          <Link className="button ghost" href="/admin/site-pages">返回列表</Link>
        </div>
        {params.error ? <div className="notice">新增失敗：{params.error}</div> : null}
        <SitePageForm action={createSitePageAction} mediaAssets={mediaResult.data} />
      </div>
    </main>
  );
}
