export type PropertyStatus = "draft" | "published" | "archived";

export type Property = {
  id: string;
  title: string;
  slug: string;
  address_public: string | null;
  address_private: string | null;
  listing_no: string | null;
  listing_type: string | null;
  listing_start_date: string | null;
  listing_end_date: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  developer_names: string | null;
  showing_instructions: string | null;
  progress_notes?: string | null;
  service_fee_rate?: string | null;
  floor_price?: string | null;
  frontage: string | null;
  depth: string | null;
  price: number | null;
  land_area_ping: number | null;
  building_area_ping: number | null;
  layout: string | null;
  age: number | null;
  orientation: string | null;
  floor: string | null;
  property_type: string;
  highlights: string[];
  description: string | null;
  status: PropertyStatus;
  is_featured: boolean;
  sort_order: number;
  seo_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  deleted_at: string | null;
  deleted_by?: string | null;
  delete_reason?: string | null;
  property_media?: PropertyMedia[];
};

export type PropertyMedia = {
  id: string;
  property_id: string;
  media_type: "image";
  url: string;
  storage_path: string | null;
  thumbnail_url: string | null;
  alt_text: string | null;
  sort_order: number;
  is_cover: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export function getCoverMedia(property: Pick<Property, "property_media">) {
  const media = property.property_media || [];
  return media.find((item) => item.is_cover && !item.deleted_at) || media.find((item) => !item.deleted_at) || null;
}
