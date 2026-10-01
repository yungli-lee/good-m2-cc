import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getAdminPropertyCollection } from "@/lib/property-collections/queries";
import { PropertyCollectionPage } from "@/components/properties/property-collection-page";
export const runtime = "edge";
export const metadata: Metadata = { title: "分享主題後台預覽", robots: { index: false, follow: false } };
export default async function CollectionPreview({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["editor", "admin", "owner"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await getAdminPropertyCollection(id);
  if (!data) notFound();
  return <PropertyCollectionPage collection={data} preview />;
}
