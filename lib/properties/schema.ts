import { z } from "zod";

const optionalNumber = z.preprocess(
  (value) => {
    if (value === "" || value == null) return undefined;
    if (typeof value === "string") return value.replace(/[,\s米公尺坪]+$/g, "").trim();
    return value;
  },
  z.coerce.number().nonnegative().optional()
);

const optionalInteger = z.preprocess(
  (value) => value === "" || value == null ? undefined : value,
  z.coerce.number().int().nonnegative().optional()
);

const optionalBoolean = z.preprocess(
  (value) => {
    if (value === "" || value == null) return undefined;
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    return value;
  },
  z.boolean().optional()
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
  city: z.string().trim().max(80).optional().or(z.literal("")),
  district: z.string().trim().max(80).optional().or(z.literal("")),
  listing_no: z.string().trim().max(80).optional().or(z.literal("")),
  listing_type: z.enum(["專任", "一般委託", "口頭", ""]).optional(),
  listing_start_date: z.string().trim().max(10).optional().or(z.literal("")),
  listing_end_date: z.string().trim().max(10).optional().or(z.literal("")),
  contract_signed_date: z.string().trim().max(10).optional().or(z.literal("")),
  sale_motivation: z.array(z.enum(["換屋", "工作", "就學", "家庭組成改變", "移民", "資金運用", "其他"])).default(["資金運用"]),
  sale_motivation_other: z.string().trim().max(160).optional().or(z.literal("")),
  current_condition_type: z.array(z.enum(["空屋", "自用", "出租", "結構體", "其他"])).default([]),
  current_condition_other: z.string().trim().max(160).optional().or(z.literal("")),
  current_usage: z.array(z.enum(["住宅", "店面", "辦公", "住辦", "住店", "廠房", "倉庫", "土地", "車位", "其他"])).default([]),
  current_usage_other: z.string().trim().max(160).optional().or(z.literal("")),
  building_style: z.array(z.enum(["透天", "別墅", "農舍", "公寓", "華廈", "電梯大樓", "套房", "店面", "廠房", "倉庫", "土地", "其他"])).default([]),
  building_style_other: z.string().trim().max(160).optional().or(z.literal("")),
  parking_type: z.array(z.enum(["無", "車庫", "門前停車", "騎樓停車", "庭院停車", "平面車位", "機械車位", "露天停車", "其他"])).default([]),
  parking_type_other: z.string().trim().max(160).optional().or(z.literal("")),
  road_width: optionalNumber,
  completion_date: z.string().trim().max(10).optional().or(z.literal("")),
  has_addition: z.coerce.boolean().default(false),
  addition_description: z.string().trim().max(500).optional().or(z.literal("")),
  elementary_school_district: z.string().trim().max(160).optional().or(z.literal("")),
  junior_high_school_district: z.string().trim().max(160).optional().or(z.literal("")),
  showing_meeting_location: z.string().trim().max(500).optional().or(z.literal("")),
  owner_name: z.string().trim().max(80).optional().or(z.literal("")),
  owner_phone: z.string().trim().max(80).optional().or(z.literal("")),
  developer_names: z.string().trim().max(160).optional().or(z.literal("")),
  showing_instructions: z.string().trim().max(1000).optional().or(z.literal("")),
  progress_notes: z.string().trim().max(8000).optional().or(z.literal("")),
  service_fee_rate: z.string().trim().max(40).optional().or(z.literal("")),
  floor_price: z.string().trim().max(80).optional().or(z.literal("")),
  frontage: z.string().trim().max(80).optional().or(z.literal("")),
  depth: z.string().trim().max(80).optional().or(z.literal("")),
  price: optionalNumber,
  land_area_ping: optionalNumber,
  building_area_ping: optionalNumber,
  layout: z.string().trim().max(80).optional().or(z.literal("")),
  age: optionalNumber,
  orientation: z.string().trim().max(40).optional().or(z.literal("")),
  floor: z.string().trim().max(40).optional().or(z.literal("")),
  building_subtype: z.enum(["huaxia", "highrise", ""]).optional(),
  main_building_area_ping: optionalNumber,
  auxiliary_building_area_ping: optionalNumber,
  shared_area_ping: optionalNumber,
  parking_area_ping: optionalNumber,
  addition_area_ping: optionalNumber,
  above_ground_floors: optionalInteger,
  basement_floors: optionalInteger,
  parking_space_features: z.array(z.enum(["平面", "機械", "上層", "下層"])).default([]),
  parking_access_types: z.array(z.enum(["坡道", "升降"])).default([]),
  parking_floor: z.string().trim().max(40).optional().or(z.literal("")),
  parking_space_no: z.string().trim().max(80).optional().or(z.literal("")),
  parking_arrangement: z.array(z.enum(["無車位", "固定車位", "車位另租", "抽籤決定", "先到先停", "排隊等候"])).default([]),
  management_types: z.array(z.enum(["保全公司", "管理員(警衛)", "守望亭", "固定駐警", "巡守人員", "保全設施"])).default([]),
  management_fee: optionalNumber,
  management_fee_payment: z.enum(["月繳", "雙月繳", "季繳", "年繳", "一次繳", ""]).optional(),
  cleaning_fee: optionalNumber,
  market_area: z.string().trim().max(200).optional().or(z.literal("")),
  park_green_space: z.string().trim().max(200).optional().or(z.literal("")),
  medical_facility: z.string().trim().max(200).optional().or(z.literal("")),
  nearby_train_station: z.string().trim().max(200).optional().or(z.literal("")),
  nearby_bus_stop: z.string().trim().max(200).optional().or(z.literal("")),
  community_name: z.string().trim().max(200).optional().or(z.literal("")),
  total_units: optionalInteger,
  elevator_count: optionalInteger,
  units_per_floor: optionalInteger,
  mortgage_setting_amount: optionalNumber,
  has_courtyard: optionalBoolean,
  is_corner_unit: optionalBoolean,
  exterior_materials: z.array(z.enum(["洗石子", "馬賽克", "方塊磚", "二丁掛", "玻璃帷幕", "花崗石", "原木", "其他"])).default([]),
  building_structures: z.array(z.enum(["磚造", "加強磚造", "鋼筋混凝土RC", "鋼骨SC或鋼骨混泥土", "石材", "鋼骨鋼筋混凝土SRC", "其他建材"])).default([]),
  public_facilities: z.array(z.enum(["會議室", "獨立會客室", "閱覽室", "放映廳", "空中花園", "電腦室", "健身房", "游泳池", "兒童遊戲區", "健康步道", "圖書館", "三溫暖(SPA)", "KTV室"])).default([]),
  public_facility_floor_notes: z.string().trim().max(500).optional().or(z.literal("")),
  showing_key_available: optionalBoolean,
  owner_age: optionalInteger,
  owner_gender: z.enum(["男", "女", ""]).optional(),
  owner_occupation: z.string().trim().max(160).optional().or(z.literal("")),
  property_type: z.enum(["townhouse", "apartment", "building", "land", "farmland", "building_land", "industrial_land", "farmhouse", "storefront", "factory", "other"]),
  highlights: z.string().trim().max(500).optional().or(z.literal("")),
  description: z.string().trim().max(8000).optional().or(z.literal("")),
  status: z.enum(["draft", "published", "archived", "expired"]),
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
  city: string;
  district: string;
  listing_no: string;
  listing_type: string;
  listing_start_date: string;
  listing_end_date: string;
  contract_signed_date: string;
  sale_motivation: string[];
  sale_motivation_other: string;
  current_condition_type: string[];
  current_condition_other: string;
  current_usage: string[];
  current_usage_other: string;
  building_style: string[];
  building_style_other: string;
  parking_type: string[];
  parking_type_other: string;
  road_width: string;
  completion_date: string;
  has_addition: boolean;
  addition_description: string;
  elementary_school_district: string;
  junior_high_school_district: string;
  showing_meeting_location: string;
  owner_name: string;
  owner_phone: string;
  developer_names: string;
  showing_instructions: string;
  progress_notes: string;
  service_fee_rate: string;
  floor_price: string;
  frontage: string;
  depth: string;
  price: string;
  land_area_ping: string;
  building_area_ping: string;
  layout: string;
  age: string;
  orientation: string;
  floor: string;
  building_subtype: string;
  main_building_area_ping: string;
  auxiliary_building_area_ping: string;
  shared_area_ping: string;
  parking_area_ping: string;
  addition_area_ping: string;
  above_ground_floors: string;
  basement_floors: string;
  parking_space_features: string[];
  parking_access_types: string[];
  parking_floor: string;
  parking_space_no: string;
  parking_arrangement: string[];
  management_types: string[];
  management_fee: string;
  management_fee_payment: string;
  cleaning_fee: string;
  market_area: string;
  park_green_space: string;
  medical_facility: string;
  nearby_train_station: string;
  nearby_bus_stop: string;
  community_name: string;
  total_units: string;
  elevator_count: string;
  units_per_floor: string;
  mortgage_setting_amount: string;
  has_courtyard: string;
  is_corner_unit: string;
  exterior_materials: string[];
  building_structures: string[];
  public_facilities: string[];
  public_facility_floor_notes: string;
  showing_key_available: string;
  owner_age: string;
  owner_gender: string;
  owner_occupation: string;
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
    city: String(formData.get("city") || ""),
    district: String(formData.get("district") || ""),
    listing_no: String(formData.get("listing_no") || ""),
    listing_type: String(formData.get("listing_type") || ""),
    listing_start_date: normalizeDateInput(String(formData.get("listing_start_date") || "")),
    listing_end_date: normalizeDateInput(String(formData.get("listing_end_date") || "")),
    contract_signed_date: normalizeDateInput(String(formData.get("contract_signed_date") || "")),
    sale_motivation: formData.getAll("sale_motivation").map(String).filter(Boolean),
    sale_motivation_other: String(formData.get("sale_motivation_other") || ""),
    current_condition_type: formData.getAll("current_condition_type").map(String).filter(Boolean),
    current_condition_other: String(formData.get("current_condition_other") || ""),
    current_usage: formData.getAll("current_usage").map(String).filter(Boolean),
    current_usage_other: String(formData.get("current_usage_other") || ""),
    building_style: formData.getAll("building_style").map(String).filter(Boolean),
    building_style_other: String(formData.get("building_style_other") || ""),
    parking_type: formData.getAll("parking_type").map(String).filter(Boolean),
    parking_type_other: String(formData.get("parking_type_other") || ""),
    road_width: String(formData.get("road_width") || ""),
    completion_date: normalizeDateInput(String(formData.get("completion_date") || "")),
    has_addition: formData.get("has_addition") === "on",
    addition_description: String(formData.get("addition_description") || ""),
    elementary_school_district: String(formData.get("elementary_school_district") || ""),
    junior_high_school_district: String(formData.get("junior_high_school_district") || ""),
    showing_meeting_location: String(formData.get("showing_meeting_location") || ""),
    owner_name: String(formData.get("owner_name") || ""),
    owner_phone: String(formData.get("owner_phone") || ""),
    developer_names: String(formData.get("developer_names") || ""),
    showing_instructions: String(formData.get("showing_instructions") || ""),
    progress_notes: String(formData.get("progress_notes") || ""),
    service_fee_rate: String(formData.get("service_fee_rate") || ""),
    floor_price: String(formData.get("floor_price") || ""),
    frontage: String(formData.get("frontage") || ""),
    depth: String(formData.get("depth") || ""),
    price: String(formData.get("price") || ""),
    land_area_ping: String(formData.get("land_area_ping") || ""),
    building_area_ping: String(formData.get("building_area_ping") || ""),
    layout: String(formData.get("layout") || ""),
    age: String(formData.get("age") || ""),
    orientation: String(formData.get("orientation") || ""),
    floor: String(formData.get("floor") || ""),
    building_subtype: String(formData.get("building_subtype") || ""),
    main_building_area_ping: String(formData.get("main_building_area_ping") || ""),
    auxiliary_building_area_ping: String(formData.get("auxiliary_building_area_ping") || ""),
    shared_area_ping: String(formData.get("shared_area_ping") || ""),
    parking_area_ping: String(formData.get("parking_area_ping") || ""),
    addition_area_ping: String(formData.get("addition_area_ping") || ""),
    above_ground_floors: String(formData.get("above_ground_floors") || ""),
    basement_floors: String(formData.get("basement_floors") || ""),
    parking_space_features: formData.getAll("parking_space_features").map(String).filter(Boolean),
    parking_access_types: formData.getAll("parking_access_types").map(String).filter(Boolean),
    parking_floor: String(formData.get("parking_floor") || ""),
    parking_space_no: String(formData.get("parking_space_no") || ""),
    parking_arrangement: formData.getAll("parking_arrangement").map(String).filter(Boolean),
    management_types: formData.getAll("management_types").map(String).filter(Boolean),
    management_fee: String(formData.get("management_fee") || ""),
    management_fee_payment: String(formData.get("management_fee_payment") || ""),
    cleaning_fee: String(formData.get("cleaning_fee") || ""),
    market_area: String(formData.get("market_area") || ""),
    park_green_space: String(formData.get("park_green_space") || ""),
    medical_facility: String(formData.get("medical_facility") || ""),
    nearby_train_station: String(formData.get("nearby_train_station") || ""),
    nearby_bus_stop: String(formData.get("nearby_bus_stop") || ""),
    community_name: String(formData.get("community_name") || ""),
    total_units: String(formData.get("total_units") || ""),
    elevator_count: String(formData.get("elevator_count") || ""),
    units_per_floor: String(formData.get("units_per_floor") || ""),
    mortgage_setting_amount: String(formData.get("mortgage_setting_amount") || ""),
    has_courtyard: String(formData.get("has_courtyard") || ""),
    is_corner_unit: String(formData.get("is_corner_unit") || ""),
    exterior_materials: formData.getAll("exterior_materials").map(String).filter(Boolean),
    building_structures: formData.getAll("building_structures").map(String).filter(Boolean),
    public_facilities: formData.getAll("public_facilities").map(String).filter(Boolean),
    public_facility_floor_notes: String(formData.get("public_facility_floor_notes") || ""),
    showing_key_available: String(formData.get("showing_key_available") || ""),
    owner_age: String(formData.get("owner_age") || ""),
    owner_gender: String(formData.get("owner_gender") || ""),
    owner_occupation: String(formData.get("owner_occupation") || ""),
    property_type: String(formData.get("property_type") || "townhouse"),
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
  const normalized = (value || "").replace(/\r\n?/g, "\n");
  return normalized ? normalized.split("\n") : [];
}

export function emptyToNull<T>(value: T | "") {
  return value === "" ? null : value;
}

export function toPropertyPayload(input: PropertyFormInput) {
  return {
    ...input,
    address_public: emptyToNull(input.address_public || ""),
    address_private: emptyToNull(input.address_private || ""),
    city: emptyToNull(input.city || ""),
    district: emptyToNull(input.district || ""),
    listing_no: emptyToNull(input.listing_no || ""),
    listing_type: emptyToNull(input.listing_type || ""),
    listing_start_date: emptyToNull(input.listing_start_date || ""),
    listing_end_date: emptyToNull(input.listing_end_date || ""),
    contract_signed_date: emptyToNull(input.contract_signed_date || ""),
    sale_motivation: input.sale_motivation.length ? input.sale_motivation : ["資金運用"],
    sale_motivation_other: emptyToNull(input.sale_motivation_other || ""),
    current_condition_type: input.current_condition_type,
    current_condition_other: emptyToNull(input.current_condition_other || ""),
    current_usage: input.current_usage,
    current_usage_other: emptyToNull(input.current_usage_other || ""),
    building_style: input.building_style,
    building_style_other: emptyToNull(input.building_style_other || ""),
    parking_type: input.parking_type,
    parking_type_other: emptyToNull(input.parking_type_other || ""),
    road_width: input.road_width ?? null,
    completion_date: emptyToNull(input.completion_date || ""),
    has_addition: input.has_addition ?? false,
    addition_description: emptyToNull(input.addition_description || ""),
    elementary_school_district: emptyToNull(input.elementary_school_district || ""),
    junior_high_school_district: emptyToNull(input.junior_high_school_district || ""),
    showing_meeting_location: emptyToNull(input.showing_meeting_location || ""),
    owner_name: emptyToNull(input.owner_name || ""),
    owner_phone: emptyToNull(input.owner_phone || ""),
    developer_names: emptyToNull(input.developer_names || ""),
    showing_instructions: emptyToNull(input.showing_instructions || ""),
    progress_notes: emptyToNull(input.progress_notes || ""),
    service_fee_rate: emptyToNull(input.service_fee_rate || ""),
    floor_price: emptyToNull(input.floor_price || ""),
    frontage: emptyToNull(input.frontage || ""),
    depth: emptyToNull(input.depth || ""),
    layout: emptyToNull(input.layout || ""),
    age: input.age ?? null,
    orientation: emptyToNull(input.orientation || ""),
    floor: emptyToNull(input.floor || ""),
    building_subtype: emptyToNull(input.building_subtype || ""),
    main_building_area_ping: input.main_building_area_ping ?? null,
    auxiliary_building_area_ping: input.auxiliary_building_area_ping ?? null,
    shared_area_ping: input.shared_area_ping ?? null,
    parking_area_ping: input.parking_area_ping ?? null,
    addition_area_ping: input.addition_area_ping ?? null,
    above_ground_floors: input.above_ground_floors ?? null,
    basement_floors: input.basement_floors ?? null,
    parking_space_features: input.parking_space_features,
    parking_access_types: input.parking_access_types,
    parking_floor: emptyToNull(input.parking_floor || ""),
    parking_space_no: emptyToNull(input.parking_space_no || ""),
    parking_arrangement: input.parking_arrangement,
    management_types: input.management_types,
    management_fee: input.management_fee ?? null,
    management_fee_payment: emptyToNull(input.management_fee_payment || ""),
    cleaning_fee: input.cleaning_fee ?? null,
    market_area: emptyToNull(input.market_area || ""),
    park_green_space: emptyToNull(input.park_green_space || ""),
    medical_facility: emptyToNull(input.medical_facility || ""),
    nearby_train_station: emptyToNull(input.nearby_train_station || ""),
    nearby_bus_stop: emptyToNull(input.nearby_bus_stop || ""),
    community_name: emptyToNull(input.community_name || ""),
    total_units: input.total_units ?? null,
    elevator_count: input.elevator_count ?? null,
    units_per_floor: input.units_per_floor ?? null,
    mortgage_setting_amount: input.mortgage_setting_amount ?? null,
    has_courtyard: input.has_courtyard ?? null,
    is_corner_unit: input.is_corner_unit ?? null,
    exterior_materials: input.exterior_materials,
    building_structures: input.building_structures,
    public_facilities: input.public_facilities,
    public_facility_floor_notes: emptyToNull(input.public_facility_floor_notes || ""),
    showing_key_available: input.showing_key_available ?? null,
    owner_age: input.owner_age ?? null,
    owner_gender: emptyToNull(input.owner_gender || ""),
    owner_occupation: emptyToNull(input.owner_occupation || ""),
    highlights: highlightsToArray(input.highlights),
    description: emptyToNull(input.description || ""),
    seo_title: emptyToNull(input.seo_title || ""),
    meta_description: emptyToNull(input.meta_description || ""),
    og_image_url: emptyToNull(input.og_image_url || ""),
    canonical_url: emptyToNull(input.canonical_url || "")
  };
}
