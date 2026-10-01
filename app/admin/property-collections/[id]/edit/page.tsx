import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { PropertyCollectionForm } from "@/components/admin/property-collection-form";
import { getAdminPropertyCollection } from "@/lib/property-collections/queries";
import { getCollectionCover, getCollectionSocialImage } from "@/lib/property-collections/social";
import { siteOrigin } from "@/lib/home-cms/routing";
export const runtime = "edge";
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> };
export default async function EditPropertyCollection({ params, searchParams }: Props) {
  await requireRole(["editor", "admin", "owner"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await getAdminPropertyCollection(id);
  if (!data) notFound();
  const query = await searchParams;
  return <main className="section"><div className="container"><div className="admin-page-header"><h1>編輯物件分享主題</h1><Link className="button ghost" href="/admin/property-collections">返回列表</Link></div>{query.saved ? <div className="success">主題已儲存。</div> : null}<PropertyCollectionForm key={data.updated_at} collection={data} coverUrl={getCollectionCover(data.cover_storage_path)} fallbackImage={await getCollectionSocialImage()} origin={siteOrigin()} /></div></main>;
}
