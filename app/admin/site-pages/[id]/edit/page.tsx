import Link from "next/link";
import { notFound } from "next/navigation";
import { SitePageForm } from "@/components/admin/site-page-form";
import { requireRole } from "@/lib/auth";
import { getSitePage, listAdminSitePages } from "@/lib/home-cms/queries";
import { listAdminMediaAssets } from "@/lib/media";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

export default async function EditSitePagePage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  await requireRole(["editor", "admin", "owner"]);
  const supabase = await createSupabaseServerClient();
  const [{ data: page }, mediaResult, pagesResult] = await Promise.all([
    getSitePage(id),
    listAdminMediaAssets({ supabase, category: "all", status: "active", sort: "newest" }),
    listAdminSitePages()
  ]);
  if (!page) notFound();

  return (
    <main className="section">
      <div className="container">
        <div className="admin-page-header">
          <div>
            <p className="eyebrow">Home CMS</p>
            <h1>編輯靜態頁面內容</h1>
            <p className="muted">{page.title}</p>
          </div>
          <Link className="button ghost" href="/admin/site-pages">返回列表</Link>
        </div>
        {query.saved ? <div className="success">頁面內容已儲存。</div> : null}
        {query.error ? <div className="notice">儲存失敗：{query.error}</div> : null}
        <SitePageForm
          page={page}
          mediaAssets={mediaResult.data}
          existingPageTypes={pagesResult.data.map((item) => item.page_type)}
        />
      </div>
    </main>
  );
}
