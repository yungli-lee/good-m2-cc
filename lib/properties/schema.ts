import { z } from "zod";

const optionalNumber = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.coerce.number().nonnegative().optional()
);

function normalizeDateInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!match) return trimmed;
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function toSafeSlug(slug: string, title: string) {
  const cleaned = (slug || title)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);

  return cleaned || `property-${crypto.randomUUID().slice(0, 8)}`;
}

const draftSlug = z
  .string()
  .trim()
  .max(140, "Slug 最多 140 字")
  .regex(/^[a-z0-9-]*$/, "Slug 只能使用小寫英文、數字與連字號");

export const propertySchema = z.object({
  title: z.string().trim().min(1, "請輸入案名").max(120),
  slug: z.string().trim().min(1).max(140).regex(/^[a-z0-9-]+$/),
  address_public: z.string().trim().max(160).optional().or(z.literal("")),
  address_private: z.string().trim().max(4000).optional().or(z.literal("")),
  listing_no: z.string().trim().max(80).optional().or(z.literal("")),
  listing_type: z.enum(["專任", "一般委託", "口頭", ""]).optional(),
  listing_start_date: z.string().trim().max(10).optional().or(z.literal("")),
  listing_end_date: z.string().trim().max(10).optional().or(z.literal("")),
  owner_name: z.string().trim().max(80).optional().or(z.literal("")),
  owner_phone: z.string().trim().max(80).optional().or(z.literal("")),
  developer_names: z.string().trim().max(160).optional().or(z.literal("")),
  showing_instructions: z.string().trim().max(1000).optional().or(z.literal("")),
  progress_notes: z.string().trim().max(8000).optional().or(z.literal("")),
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

export const draftPropertySchema = z.object({
  title: z.string().trim().min(1, "請輸入案名").max(120, "案名最多 120 字"),
  slug: draftSlug,
  price: optionalNumber,
  address_public: z.string().trim().max(160, "公開地址最多 160 字").optional().or(z.literal(""))
});

export type DraftPropertyInput = z.infer<typeof draftPropertySchema>;

export type PropertyFormInput = z.infer<typeof propertySchema>;

export type DraftPropertyFormValues = {
  title: string;
  slug: string;
  price: string;
  address_public: string;
};

export type DraftPropertyFormState = {
  values: DraftPropertyFormValues;
  fieldErrors: Partial<Record<keyof DraftPropertyFormValues, string>>;
  formError?: string;
};

export type PropertyFormValues = {
  title: string;
  slug: string;
  address_public: string;
  address_private: string;
  listing_no: string;
  listing_type: string;
  listing_start_date: string;
  listing_end_date: string;
  owner_name: string;
  owner_phone: string;
  developer_names: string;
  showing_instructions: string;
  progress_notes: string;
  price: string;
  land_area_ping: string;
  building_area_ping: string;
  layout: string;
  age: string;
  orientation: string;
  floor: string;
  property_type: string;
  highlights: string;
  description: string;
  status: string;
  is_featured: boolean;
  sort_order: string;
  seo_title: string;
  meta_description: string;
  og_image_url: string;
  canonical_url: string;
};

export type PropertyFormState = {
  values: PropertyFormValues;
  fieldErrors: Partial<Record<keyof PropertyFormValues, string>>;
  formError?: string;
  formKey?: string;
};

export function draftPropertyValuesFromFormData(formData: FormData): DraftPropertyFormValues {
  return {
    title: String(formData.get("title") || ""),
    slug: String(formData.get("slug") || ""),
    price: String(formData.get("price") || ""),
    address_public: String(formData.get("address_public") || "")
  };
}

export function propertyValuesFromFormData(formData: FormData): PropertyFormValues {
  return {
    title: String(formData.get("title") || ""),
    slug: String(formData.get("slug") || ""),
    address_public: String(formData.get("address_public") || ""),
    address_private: String(formData.get("address_private") || ""),
    listing_no: String(formData.get("listing_no") || ""),
    listing_type: String(formData.get("listing_type") || ""),
    listing_start_date: normalizeDateInput(String(formData.get("listing_start_date") || "")),
    listing_end_date: normalizeDateInput(String(formData.get("listing_end_date") || "")),
    owner_name: String(formData.get("owner_name") || ""),
    owner_phone: String(formData.get("owner_phone") || ""),
    developer_names: String(formData.get("developer_names") || ""),
    showing_instructions: String(formData.get("showing_instructions") || ""),
    progress_notes: String(formData.get("progress_notes") || ""),
    price: String(formData.get("price") || ""),
    land_area_ping: String(formData.get("land_area_ping") || ""),
    building_area_ping: String(formData.get("building_area_ping") || ""),
    layout: String(formData.get("layout") || ""),
    age: String(formData.get("age") || ""),
    orientation: String(formData.get("orientation") || ""),
    floor: String(formData.get("floor") || ""),
    property_type: String(formData.get("property_type") || "other"),
    highlights: String(formData.get("highlights") || ""),
    description: String(formData.get("description") || ""),
    status: String(formData.get("status") || "draft"),
    is_featured: formData.get("is_featured") === "on",
    sort_order: String(formData.get("sort_order") || "1000"),
    seo_title: String(formData.get("seo_title") || ""),
    meta_description: String(formData.get("meta_description") || ""),
    og_image_url: String(formData.get("og_image_url") || ""),
    canonical_url: String(formData.get("canonical_url") || "")
  };
}

export function toDraftPropertyPayload(input: DraftPropertyInput) {
  return {
    title: input.title,
    slug: toSafeSlug(input.slug, input.title),
    price: input.price ?? null,
    address_public: emptyToNull(input.address_public || ""),
    status: "draft" as const
  };
}

export function normalizePropertyForm(formData: FormData) {
  const values = propertyValuesFromFormData(formData);
  return normalizePropertyValues(values);
}

export function normalizePropertyValues(values: PropertyFormValues) {
  const title = values.title;
  return propertySchema.parse({
    ...values,
    title,
    slug: toSafeSlug(values.slug, title),
    is_featured: values.is_featured,
    highlights: values.highlights
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
    listing_no: emptyToNull(input.listing_no || ""),
    listing_type: emptyToNull(input.listing_type || ""),
    listing_start_date: emptyToNull(input.listing_start_date || ""),
    listing_end_date: emptyToNull(input.listing_end_date || ""),
    owner_name: emptyToNull(input.owner_name || ""),
    owner_phone: emptyToNull(input.owner_phone || ""),
    developer_names: emptyToNull(input.developer_names || ""),
    showing_instructions: emptyToNull(input.showing_instructions || ""),
    progress_notes: emptyToNull(input.progress_notes || ""),
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
