import { z } from "zod";

const optionalNumber = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.coerce.number().nonnegative().optional()
);

export const propertySchema = z.object({
  title: z.string().trim().min(1, "請輸入案名").max(120),
  slug: z.string().trim().min(1).max(140).regex(/^[a-z0-9-]+$/),
  address_public: z.string().trim().max(160).optional().or(z.literal("")),
  address_private: z.string().trim().max(300).optional().or(z.literal("")),
  price: optionalNumber,
  land_area_ping: optionalNumber,
  building_area_ping: optionalNumber,
  layout: z.string().trim().max(80).optional().or(z.literal("")),
  age: optionalNumber,
  orientation: z.string().trim().max(40).optional().or(z.literal("")),
  floor: z.string().trim().max(40).optional().or(z.literal("")),
  property_type: z.enum(["townhouse", "apartment", "building", "land", "farmland", "building_land", "storefront", "factory", "other"]),
  highlights: z.string().trim().max(500).optional().or(z.literal("")),
  description: z.string().trim().max(8000).optional().or(z.literal("")),
  status: z.enum(["draft", "published", "archived"]),
  is_featured: z.coerce.boolean().default(false),
  sort_order: z.coerce.number().int().default(1000),
  seo_title: z.string().trim().max(180).optional().or(z.literal("")),
  meta_description: z.string().trim().max(300).optional().or(z.literal("")),
  og_image_url: z.string().trim().max(500).optional().or(z.literal("")),
  canonical_url: z.string().trim().max(500).optional().or(z.literal(""))
});

export type PropertyFormInput = z.infer<typeof propertySchema>;

export function normalizePropertyForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return propertySchema.parse({
    ...raw,
    is_featured: formData.get("is_featured") === "on",
    highlights: String(formData.get("highlights") || "")
  });
}

export function highlightsToArray(value?: string) {
  return (value || "")
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function emptyToNull<T>(value: T | "") {
  return value === "" ? null : value;
}

export function toPropertyPayload(input: PropertyFormInput) {
  return {
    ...input,
    address_public: emptyToNull(input.address_public || ""),
    address_private: emptyToNull(input.address_private || ""),
    layout: emptyToNull(input.layout || ""),
    age: input.age ?? null,
    orientation: emptyToNull(input.orientation || ""),
    floor: emptyToNull(input.floor || ""),
    highlights: highlightsToArray(input.highlights),
    description: emptyToNull(input.description || ""),
    seo_title: emptyToNull(input.seo_title || ""),
    meta_description: emptyToNull(input.meta_description || ""),
    og_image_url: emptyToNull(input.og_image_url || ""),
    canonical_url: emptyToNull(input.canonical_url || "")
  };
}
