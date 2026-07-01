export const mediaUsageTypes = [
  "knowledge_hero",
  "knowledge_inline",
  "knowledge_gallery",
  "property_image",
  "property_cover",
  "property_floor_plan",
  "property_document_image",
  "company_logo",
  "company_line_qr",
  "hero_banner",
  "general"
] as const;

export const mediaUsageRoles = [
  "hero_image",
  "inline_image",
  "gallery_image",
  "cover_image",
  "floor_plan",
  "document_image",
  "company_logo",
  "company_line_qr",
  "hero_banner",
  "thumbnail",
  "general"
] as const;

export const mediaUsedByTypes = [
  "knowledge_article",
  "content_item",
  "property",
  "company_settings",
  "hero_banner",
  "general"
] as const;

export const mediaStatuses = ["active", "deleted"] as const;

export const mediaBucketName = "media";

export const mediaAllowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
] as const;

export const mediaMaxFileSize = 5 * 1024 * 1024;
