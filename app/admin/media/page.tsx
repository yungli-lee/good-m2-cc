import Link from "next/link";
import { MediaLibraryManager } from "@/components/admin/media-library-manager";
import { requireRole } from "@/lib/auth";
import { listAdminMediaAssets } from "@/lib/media";
import { parseMediaCategory, parseMediaSort, parseMediaStatus } from "@/lib/media/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

type Props = {
  searchParams: Promise<{ q?: string; usage?: string; status?: string; sort?: string }>;
};

export default async function AdminMediaPage({ searchParams }: Props) {
  await requireRole(["editor", "admin", "owner"]);
  const params = await searchParams;
  const filters = {
    q: params.q?.trim() || "",
    usage: parseMediaCategory(params.usage),
    status: parseMediaStatus(params.status),
    sort: parseMediaSort(params.sort)
  };
  const supabase = await createSupabaseServerClient();
  const { data: assets, error } = await listAdminMediaAssets({
    supabase,
    q: filters.q,
    category: filters.usage,
    status: filters.status,
    sort: filters.sort
  });

  return (
    <main className="section">
      <div className="container">
        <div className="admin-page-header">
          <div>
            <p className="eyebrow">Media Library</p>
            <h1>媒體庫</h1>
          </div>
          <div className="admin-actions">
            <Link className="button ghost" href="/admin">返回後台</Link>
          </div>
        </div>

        {error ? <div className="notice">媒體資料讀取失敗。</div> : null}
        <MediaLibraryManager assets={assets} filters={filters} />
      </div>
    </main>
  );
}
