import type { MediaLibraryAsset } from "@/lib/media";

export type CmsStatus = "draft" | "published" | "archived";
export type SitePageType = "philosophy" | "services" | "contact" | "reminder" | "custom";
export type KnownSitePageKey = "philosophy" | "services" | "process" | "reminders" | "team";
export type SitePageKey = KnownSitePageKey | (string & {});

export type HomeCampaign = {
  id: string;
  title: string;
  subtitle: string | null;
  eyebrow: string | null;
  body: string | null;
  image_media_id: string | null;
  fallback_image_url: string | null;
  image_alt: string | null;
  cta_label: string | null;
  cta_href: string | null;
  secondary_cta_label: string | null;
  secondary_cta_href: string | null;
  status: CmsStatus;
  slide_duration_seconds: number;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  media_assets?: Pick<MediaLibraryAsset, "id" | "storage_path" | "alt_text" | "caption" | "original_filename" | "media_type" | "mime_type" | "file_size" | "poster_url" | "poster_storage_path"> | null;
};

export type SitePage = {
  id: string;
  page_key: SitePageKey;
  page_type: SitePageType;
  title: string;
  eyebrow: string | null;
  subtitle: string | null;
  markdown_content: string | null;
  cover_media_id: string | null;
  fallback_cover_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  status: CmsStatus;
  show_as_page: boolean;
  show_on_homepage: boolean;
  sort_order: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  archived_at: string | null;
  media_assets?: Pick<MediaLibraryAsset, "id" | "storage_path" | "alt_text" | "caption" | "original_filename"> | null;
};

export const cmsStatusLabels: Record<CmsStatus, string> = {
  draft: "草稿",
  published: "已發布",
  archived: "封存"
};

export const sitePageLabels: Record<KnownSitePageKey, string> = {
  philosophy: "服務理念",
  services: "服務項目",
  process: "買屋流程",
  reminders: "阿勇生活小提醒",
  team: "聯絡我們"
};

export const sitePageKeys = ["philosophy", "services", "process", "reminders", "team"] as const;

export const sitePageTypeLabels: Record<SitePageType, string> = {
  philosophy: "服務理念",
  services: "服務項目",
  contact: "聯絡我們",
  reminder: "阿勇生活小提醒",
  custom: "自訂頁面"
};

export function sitePageLabel(pageKey: SitePageKey, pageType?: SitePageType) {
  if (pageType) return sitePageTypeLabels[pageType];
  if (pageKey === "contact") return "聯絡我們";
  return sitePageLabels[pageKey as KnownSitePageKey] || pageKey;
}
