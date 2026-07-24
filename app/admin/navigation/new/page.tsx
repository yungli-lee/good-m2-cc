import Link from "next/link";
import { NavigationItemForm } from "@/components/admin/navigation-item-form";
import { requireRole } from "@/lib/auth";
import { listAdminSitePages } from "@/lib/home-cms/queries";
import { createNavigationItemAction } from "../actions";

export const runtime = "edge";

export default async function NewNavigationItemPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  await requireRole(["editor", "admin", "owner"]);
  const { data: pages } = await listAdminSitePages();
  return <main className="section"><div className="container">
    <div className="admin-page-header"><div><p className="eyebrow">Site Navigation</p><h1>新增選單項目</h1></div><Link className="button ghost" href="/admin/navigation">返回列表</Link></div>
    {query.error ? <div className="notice">新增失敗：{query.error}</div> : null}
    <NavigationItemForm action={createNavigationItemAction} pages={pages.filter((page) => page.status === "published" && !page.archived_at)} />
  </div></main>;
}
