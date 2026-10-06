import { z } from "zod";
import { collectionDistricts, collectionTypes, type CollectionFilters } from "../properties/collection-link.ts";

export const collectionStatusLabels = { draft: "草稿", published: "已發布", archived: "已停用" } as const;
export const collectionCoverPattern = /^property-collections\/cover-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$/;
export const collectionSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const optionalPrice = z.preprocess(value => value === "" || value == null ? null : Number(value), z.number().finite().min(0).max(100000000).nullable());
const inputSchema = z.object({
  slug: z.string().trim().min(1, "請填寫網址名稱。").max(80).regex(collectionSlugPattern, "網址只能使用小寫英文、數字與連字號。"),
  title: z.string().trim().min(1, "請填寫主題標題。").max(100, "標題最多100字。"),
  description: z.string().trim().max(500, "介紹最多500字。"),
  q: z.string().trim().max(200),
  city: z.string().trim().max(80),
  districts: z.array(z.string()).max(26).refine(values => values.every(value => collectionDistricts.includes(value)), "請選擇有效地區。"),
  property_type: z.string().refine(value => !value || Object.hasOwn(collectionTypes, value), "請選擇有效物件類型。"),
  price_min: optionalPrice,
  price_max: optionalPrice,
  cover_storage_path: z.string().refine(value => !value || collectionCoverPattern.test(value), "請重新上傳主題封面。"),
  status: z.enum(["draft", "published", "archived"])
}).refine(value => value.price_min === null || value.price_max === null || value.price_min <= value.price_max, { message: "最低總價不能高於最高總價。", path: ["price_max"] });

export function parseCollectionForm(form: FormData, existingSlug?: string) {
  const field = (name: string) => String(form.get(name) || "");
  return inputSchema.safeParse({
    slug: existingSlug ?? field("slug"), title: field("title"), description: field("description"),
    q: field("q"), city: field("city"), districts: [...new Set(form.getAll("district").map(String))],
    property_type: field("property_type"), price_min: field("price_min"), price_max: field("price_max"),
    cover_storage_path: field("cover_storage_path"), status: field("status") || "draft"
  });
}
export type CollectionInput = z.infer<typeof inputSchema>;
export type PropertyCollection = CollectionInput & { id: string; updated_at: string; created_at: string };
export function propertyCollectionFilters(collection: CollectionInput): CollectionFilters {
  return {
    q: collection.q, city: collection.city, districts: collection.districts,
    type: collection.property_type as CollectionFilters["type"],
    ...(collection.price_min !== null ? { minPrice: collection.price_min } : {}),
    ...(collection.price_max !== null ? { maxPrice: collection.price_max } : {})
  };
}
export function propertyCollectionHref(slug: string) {
  return `/collections/${encodeURIComponent(slug)}`;
}
export function propertyCollectionCoverUrl(path: string, supabaseOrigin?: string) {
  if (!collectionCoverPattern.test(path) || !supabaseOrigin) return null;
  try {
    const origin = new URL(supabaseOrigin);
    if (origin.protocol !== "https:") return null;
    return new URL(`/storage/v1/object/public/media/${path}`, origin.origin).href;
  } catch { return null; }
}
