import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PropertyCollectionPage } from "@/components/properties/property-collection-page";
import { getPublishedPropertyCollection } from "@/lib/property-collections/queries";
import { collectionSlugPattern, propertyCollectionHref } from "@/lib/property-collections/core";
import { getCollectionSocialImage } from "@/lib/property-collections/social";
import { getPublicCompanySettings } from "@/lib/company-settings";
import { siteOrigin } from "@/lib/home-cms/routing";

export const runtime = "edge";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
async function loadCollection(params: Props["params"]) {
  const { slug } = await params;
  if (!collectionSlugPattern.test(slug) || slug.length > 80) notFound();
  const collection = await getPublishedPropertyCollection(slug);
  if (!collection) notFound();
  return collection;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const collection = await loadCollection(params);
  const [company, image] = await Promise.all([getPublicCompanySettings(), getCollectionSocialImage(collection.cover_storage_path)]);
  const title = `${collection.title}｜${company.brand_name}`;
  const description = collection.description || "阿勇與阿美為你精選目前在售物件，歡迎聯絡我們詳細介紹。";
  const path = propertyCollectionHref(collection.slug);
  return { title, description, alternates: { canonical: path },
    openGraph: { title, description, siteName: company.brand_name, url: `${siteOrigin()}${path}`, type: "website", images: [{ url: image, width: 1200, height: 630, type: "image/jpeg", alt: collection.title }] },
    twitter: { card: "summary_large_image", title, description, images: [image] }
  };
}
export default async function CollectionPage({ params }: Props) {
  return <PropertyCollectionPage collection={await loadCollection(params)} />;
}
