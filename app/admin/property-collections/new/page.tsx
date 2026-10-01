import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { PropertyCollectionForm } from "@/components/admin/property-collection-form";
import { getCollectionSocialImage } from "@/lib/property-collections/social";
import { siteOrigin } from "@/lib/home-cms/routing";
export const runtime = "edge";
export default async function NewPropertyCollection() {
  await requireRole(["editor", "admin", "owner"]);
  return <main className="section"><div className="container"><div className="admin-page-header"><h1>新增物件分享主題</h1><Link className="button ghost" href="/admin/property-collections">返回列表</Link></div><PropertyCollectionForm fallbackImage={await getCollectionSocialImage()} origin={siteOrigin()} /></div></main>;
}
