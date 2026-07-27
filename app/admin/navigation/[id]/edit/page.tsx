import Link from "next/link";
import { notFound } from "next/navigation";
import { NavigationItemForm } from "@/components/admin/navigation-item-form";
import { requireRole } from "@/lib/auth";
import { listAdminSitePages } from "@/lib/home-cms/queries";
import { getAdminNavigationItem } from "@/lib/navigation";

export const runtime = "edge";

export default async function EditNavigationItemPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  await requireRole(["editor", "admin", "owner"]);
  const [{ data: item }, { data: pages }] = await Promise.all([getAdminNavigationItem(id), listAdminSitePages()]);
  if (!item) notFound();
  return <main className="section"><div className="container">
    <div className="admin-page-header"><div><p className="eyebrow">Site Navigation</p><h1>編輯選單項目</h1></div><Link className="button ghost" href="/admin/navigation">返回列表</Link></div>
    {query.error ? <div className="notice">儲存失敗：{query.error}</div> : null}
    <NavigationItemForm item={item} pages={pages.filter((page) => page.status === "published" && !page.archived_at)} />
  </div></main>;
}
