import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { areaPages as fallbackAreas, type AreaPage } from "@/lib/areas";

export type AreaPageRecord = AreaPage & {
  id: string;
  city: string;
  district: string;
  status: "draft" | "published" | "archived";
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  archived_at: string | null;
  updated_at: string;
};

const lineList = (value: unknown) => String(value || "").split("\n").map((item) => item.trim()).filter(Boolean);
const pairList = (value: unknown, first: string, second: string) => lineList(value).map((line) => {
  const [left, ...rest] = line.split("｜");
  return { [first]: left.trim(), [second]: rest.join("｜").trim() };
}).filter((item) => item[first] && item[second]);

export const areaPageSchema = z.object({
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(1).max(80), short_name: z.string().trim().min(1).max(80),
  eyebrow: z.string().trim().max(80), headline: z.string().trim().min(1).max(180),
  summary: z.string().trim().max(500), description: z.string().trim().max(3000),
  city: z.string().trim().min(1).max(80), district: z.string().trim().min(1).max(80),
  status: z.enum(["draft", "published", "archived"]), sort_order: z.coerce.number().int().min(0).max(100000),
  seo_title: z.string().trim().max(180).optional().or(z.literal("")),
  seo_description: z.string().trim().max(300).optional().or(z.literal("")),
  property_keywords_text: z.string(), audiences_text: z.string(), features_text: z.string(), cautions_text: z.string(), faqs_text: z.string()
});

export function areaValuesFromFormData(formData: FormData) {
  return Object.fromEntries(["slug","name","short_name","eyebrow","headline","summary","description","city","district","status","sort_order","seo_title","seo_description","property_keywords_text","audiences_text","features_text","cautions_text","faqs_text"].map((key) => [key, String(formData.get(key) || "")]));
}

export function areaPayload(input: z.infer<typeof areaPageSchema>) {
  return {
    slug: input.slug, name: input.name, short_name: input.short_name, eyebrow: input.eyebrow,
    headline: input.headline, summary: input.summary, description: input.description,
    city: input.city, district: input.district, status: input.status, sort_order: input.sort_order,
    seo_title: input.seo_title || null, seo_description: input.seo_description || null,
    property_keywords: lineList(input.property_keywords_text), audiences: lineList(input.audiences_text),
    features: pairList(input.features_text, "title", "description"), cautions: lineList(input.cautions_text),
    faqs: pairList(input.faqs_text, "question", "answer")
  };
}

function fromRow(row: Record<string, unknown>): AreaPageRecord {
  return {
    id: String(row.id), slug: String(row.slug), name: String(row.name), shortName: String(row.short_name), eyebrow: String(row.eyebrow || ""),
    headline: String(row.headline), summary: String(row.summary || ""), description: String(row.description || ""),
    city: String(row.city || "彰化縣"), district: String(row.district || row.name),
    propertyKeywords: Array.isArray(row.property_keywords) ? row.property_keywords.map(String) : [], searchTerms: [String(row.district || row.name)],
    audiences: Array.isArray(row.audiences) ? row.audiences.map(String) : [],
    features: Array.isArray(row.features) ? row.features as AreaPage["features"] : [], cautions: Array.isArray(row.cautions) ? row.cautions.map(String) : [],
    faqs: Array.isArray(row.faqs) ? row.faqs as AreaPage["faqs"] : [], status: row.status as AreaPageRecord["status"], sort_order: Number(row.sort_order || 0),
    seo_title: row.seo_title ? String(row.seo_title) : null, seo_description: row.seo_description ? String(row.seo_description) : null,
    published_at: row.published_at ? String(row.published_at) : null, archived_at: row.archived_at ? String(row.archived_at) : null, updated_at: String(row.updated_at || "")
  };
}

export async function listPublicAreaPages() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("area_pages").select("*").eq("status", "published").order("sort_order").order("name");
  if (error || !data) return fallbackAreas.map((area, index) => ({ ...area, id: area.slug, city: "彰化縣", district: area.name, status: "published" as const, sort_order: (index + 1) * 100, seo_title: null, seo_description: null, published_at: null, archived_at: null, updated_at: "" }));
  return data.map((row) => fromRow(row));
}

export async function getPublicAreaPage(slug: string) { return (await listPublicAreaPages()).find((area) => area.slug === slug) || null; }
export async function listAdminAreaPages() { const s = await createSupabaseServerClient(); const r = await s.from("area_pages").select("*").order("sort_order").order("name"); return { data: (r.data || []).map((row) => fromRow(row)), error: r.error }; }
export async function getAdminAreaPage(id: string) { const s = await createSupabaseServerClient(); const r = await s.from("area_pages").select("*").eq("id", id).maybeSingle(); return { data: r.data ? fromRow(r.data) : null, error: r.error }; }
