import type { MediaStatus, MediaUsageType } from "@/lib/media/types";
import type { MediaCategoryFilter, MediaSort } from "@/lib/media/schema";

export const mediaUsageTypeLabels: Record<MediaUsageType, string> = {
  knowledge_hero: "知識庫封面",
  knowledge_inline: "知識庫內文",
  knowledge_gallery: "知識庫圖庫",
  property_image: "物件圖片",
  property_cover: "物件封面",
  property_floor_plan: "物件平面圖",
  property_document_image: "物件文件圖片",
  company_logo: "公司 Logo",
  company_line_qr: "公司 LINE QRCode",
  hero_banner: "首頁 Banner",
  general: "一般圖片"
};

export const mediaCategoryLabels: Record<MediaCategoryFilter, string> = {
  all: "全部",
  knowledge: "知識庫",
  property: "物件",
  company: "公司",
  hero: "首頁",
  general: "一般圖片"
};

export const mediaStatusLabels: Record<MediaStatus, string> = {
  active: "啟用",
  deleted: "封存"
};

export const mediaSortLabels: Record<MediaSort, string> = {
  newest: "最新",
  oldest: "最舊",
  name: "名稱"
};
