export type PropertyStatus = "draft" | "published" | "archived" | "expired";

export type Property = {
  id: string;
  title: string;
  slug: string;
  address_public: string | null;
  address_private: string | null;
  city?: string | null;
  district?: string | null;
  unavailable_reason?: string | null;
  unavailable_at?: string | null;
  listing_no: string | null;
  listing_type: string | null;
  listing_start_date: string | null;
  listing_end_date: string | null;
  contract_signed_date?: string | null;
  sale_motivation?: string[] | null;
  sale_motivation_other?: string | null;
  current_condition_type?: string[] | null;
  current_condition_other?: string | null;
  current_usage?: string[] | null;
  current_usage_other?: string | null;
  building_style?: string[] | null;
  building_style_other?: string | null;
  parking_type?: string[] | null;
  parking_type_other?: string | null;
  road_width?: number | null;
  completion_date?: string | null;
  has_addition?: boolean;
  addition_description?: string | null;
  elementary_school_district?: string | null;
  junior_high_school_district?: string | null;
  showing_meeting_location?: string | null;
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
  building_subtype?: "huaxia" | "highrise" | null;
  main_building_area_ping?: number | null;
  auxiliary_building_area_ping?: number | null;
  shared_area_ping?: number | null;
  parking_area_ping?: number | null;
  addition_area_ping?: number | null;
  above_ground_floors?: number | null;
  basement_floors?: number | null;
  parking_space_features?: string[] | null;
  parking_access_types?: string[] | null;
  parking_floor?: string | null;
  parking_space_no?: string | null;
  parking_arrangement?: string[] | null;
  management_types?: string[] | null;
  management_fee?: number | null;
  management_fee_payment?: string | null;
  cleaning_fee?: number | null;
  market_area?: string | null;
  park_green_space?: string | null;
  medical_facility?: string | null;
  nearby_train_station?: string | null;
  nearby_bus_stop?: string | null;
  community_name?: string | null;
  total_units?: number | null;
  elevator_count?: number | null;
  units_per_floor?: number | null;
  mortgage_setting_amount?: number | null;
  has_courtyard?: boolean | null;
  is_corner_unit?: boolean | null;
  exterior_materials?: string[] | null;
  building_structures?: string[] | null;
  public_facilities?: string[] | null;
  public_facility_floor_notes?: string | null;
  showing_key_available?: boolean | null;
  owner_age?: number | null;
  owner_gender?: "男" | "女" | null;
  owner_occupation?: string | null;
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
  expired_at?: string | null;
  deleted_at: string | null;
  deleted_by?: string | null;
  delete_reason?: string | null;
  property_media?: PropertyMedia[];
};

export type PropertyMedia = {
  id: string;
  property_id: string;
  media_type: "image" | "video";
  mime_type: string | null;
  file_size: number | null;
  url: string;
  storage_path: string | null;
  thumbnail_url: string | null;
  poster_storage_path: string | null;
  alt_text: string | null;
  sort_order: number;
  is_cover: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export function sortPropertyMedia(media: readonly PropertyMedia[]) {
  return [...media].sort((left, right) => {
    const sortDifference = Number(left.sort_order || 0) - Number(right.sort_order || 0);
    if (sortDifference) return sortDifference;
    const createdDifference = String(left.created_at || "").localeCompare(String(right.created_at || ""));
    return createdDifference || left.id.localeCompare(right.id);
  });
}

export function getMediaImageUrl(media: Pick<PropertyMedia, "media_type" | "url" | "thumbnail_url"> | null | undefined) {
  if (!media) return "";
  return (media.media_type === "video" ? media.thumbnail_url : media.url)?.trim() || "";
}

export function getCoverMedia(property: Pick<Property, "property_media">) {
  const media = sortPropertyMedia(property.property_media || [])
    .filter((item) => !item.deleted_at && Boolean(getMediaImageUrl(item)));
  return media.find((item) => item.is_cover) || media[0] || null;
}
