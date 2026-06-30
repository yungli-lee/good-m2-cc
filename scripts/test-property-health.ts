import assert from "node:assert/strict";

const { calculatePropertyHealthScore } = await import("../lib/properties/health-score.ts");

const weak = calculatePropertyHealthScore({
  title: "測試物件",
  slug: "test-property",
  property_type: "other",
  highlights: [],
  property_media: []
});

assert.equal(weak.level, "weak");
assert.equal(weak.missing.some((item) => item.key === "price"), true);
assert.equal(weak.missing.some((item) => item.key === "media"), true);

const healthy = calculatePropertyHealthScore({
  title: "鹿港鎮公所前透天店住",
  slug: "lukang-townhouse",
  address_public: "彰化縣鹿港鎮民權路",
  price: 1180,
  land_area_ping: 32.5,
  building_area_ping: 48.2,
  layout: "4房3廳3衛",
  age: 12,
  orientation: "坐北朝南",
  floor: "3樓",
  property_type: "townhouse",
  highlights: ["鎮公所生活圈", "臨路店住"],
  description: "生活機能完整，適合自住與店面使用。",
  listing_no: "AK123456",
  listing_type: "專任",
  owner_name: "王先生",
  owner_phone: "0912-345-678",
  developer_names: "阿勇",
  seo_title: "鹿港透天店住",
  meta_description: "鹿港鎮公所前透天店住。",
  property_media: [
    {
      id: "media-1",
      property_id: "property-1",
      media_type: "image",
      url: "https://example.com/cover.jpg",
      storage_path: null,
      thumbnail_url: null,
      alt_text: null,
      sort_order: 1,
      is_cover: true,
      created_at: "",
      updated_at: "",
      deleted_at: null
    }
  ]
});

assert.equal(healthy.level, "good");
assert.equal(healthy.score >= 80, true);
assert.equal(healthy.missing.length, 0);

console.log("property health tests passed");
