import assert from "node:assert/strict";

const { parsePastedProperty } = await import("../lib/properties/ai-parser.ts");

const parsed = parsePastedProperty(`
案名：彰化市測試華廈
樓高：2樓
開價：1288萬
`);

assert.equal(parsed.floor, "2樓");
assert.equal(parsed.price, "1288");

const mixedLine = parsePastedProperty(`
案名：彰化市測試華廈
坐向：坐西北朝東南 樓高：2樓
`);

assert.equal(mixedLine.floor, "2樓");
assert.equal(mixedLine.orientation, "坐西北朝東南");

const incomingTownhouse = parsePastedProperty(`
新接物件-透天
案名：彰化市透天測試
`);

assert.equal(incomingTownhouse.property_type, "townhouse");

const incomingLand = parsePastedProperty(`
新接物件-土地
案名：彰化市土地測試
`);

assert.equal(incomingLand.property_type, "land");

const incomingBuilding = parsePastedProperty(`
新接物件-大樓華廈
案名：彰化市大樓華廈測試
`);

assert.equal(incomingBuilding.property_type, "building");

const sampleTownhouse = parsePastedProperty(`
20260122
新接物件-透天
委託書編號：AK5384529
委託類型：專任
委託期間：2026/01/22-2026/04/21
屋主名稱：王先生
屋主電話：0912-345-678
開發：淑美、阿勇
帶看：鑰匙在電表上，請先通知屋主
案名：近員農黃昏市場朝南透天
地址：員林市大同路一段128巷23號
地號：員林市仁愛段668-3號
地坪：21.17坪
建坪：27.58坪
面寬：4.6米
深度：15.7米
坐向：坐北朝南
格局：4/3/3
樓高：2+1（三樓增建）
屋齡：43年（完工日：72/10/20)
開價：988萬
底價：出價談
開發：淑美、阿勇

推薦特色
帝王坐向，居住舒適，靜巷透天環境單純，4 房 3 衛完整格局，各有天地不干擾，三樓增建，使用空間靈活好規劃

🛒 生活機能完善
近員農黃昏市場採買便利，鄰近學區、商店林立生活圈成熟，日常機能一應俱全
`);

assert.equal(sampleTownhouse.listing_no, "AK5384529");
assert.equal(sampleTownhouse.listing_type, "專任");
assert.equal(sampleTownhouse.listing_start_date, "2026/01/22");
assert.equal(sampleTownhouse.listing_end_date, "2026/04/21");
assert.equal(sampleTownhouse.owner_name, "王先生");
assert.equal(sampleTownhouse.owner_phone, "0912-345-678");
assert.equal(sampleTownhouse.developer_names, "淑美、阿勇");
assert.equal(sampleTownhouse.showing_instructions, "鑰匙在電表上，請先通知屋主");
assert.equal(sampleTownhouse.frontage, "4.6米");
assert.equal(sampleTownhouse.depth, "15.7米");
assert.equal(sampleTownhouse.address_public, "員林市大同路一段");
assert.match(sampleTownhouse.address_private || "", /完整地址：員林市大同路一段128巷23號/);
assert.match(sampleTownhouse.address_private || "", /地號：員林市仁愛段668-3號/);
assert.equal(sampleTownhouse.property_type, "townhouse");
assert.equal(sampleTownhouse.price, "988");
assert.equal(sampleTownhouse.land_area_ping, "21.17");
assert.equal(sampleTownhouse.building_area_ping, "27.58");
assert.equal(sampleTownhouse.floor_price, "出價談");
assert.equal(sampleTownhouse.layout, "4房3廳3衛");
assert.equal(sampleTownhouse.description, "");
assert.match(sampleTownhouse.slug || "", /^20260122-/);
assert.doesNotMatch(sampleTownhouse.slug || "", /AK5384529/i);

const storefrontTownhouse = parsePastedProperty(`
20260124
新接物件-透天
案名：近員林第一市場｜商業核心透天金店面
地址：員林市民生路140號
地號：員林市員林段333號
地坪：56.56坪
建坪：85.79坪
面寬：4米
深度：36.6米
坐向：坐西北朝東南
樓高：4樓
屋齡：58年（完工日：57/08/10)
租金：一樓出租給夾娃娃機(45000/月)
開價：6300萬
底價：開即底(2.5%)
開發：阿勇、淑美

推薦特色
緊鄰員林第一市場，人潮、錢潮匯聚
民生路商業主幹道，曝光度高、辨識度強
商業區土地，使用彈性高，長期價值明確
市中心大地坪，釋出極為稀有
`);

assert.equal(storefrontTownhouse.property_type, "townhouse");
assert.equal(storefrontTownhouse.price, "6300");
assert.equal(storefrontTownhouse.developer_names, "阿勇、淑美");
assert.match(storefrontTownhouse.slug || "", /^20260124-/);

const addressPrivacy = parsePastedProperty(`
案名：福興測試
地址：彰化縣福興鄉龍舟路680巷45號
`);

assert.equal(addressPrivacy.address_public, "彰化縣福興鄉龍舟路");
assert.match(addressPrivacy.address_private || "", /完整地址：彰化縣福興鄉龍舟路680巷45號/);

const landShape = parsePastedProperty(`
新接物件-土地
地號：福興鄉文昌段935號
地坪：950坪
面寬：35米
深度：89~93米
開價：877萬
底價：出價談（3%）
屋主名稱：劉玉梅
`);

assert.equal(landShape.property_type, "land");
assert.equal(landShape.land_area_ping, "950");
assert.equal(landShape.frontage, "35米");
assert.equal(landShape.depth, "89~93米");
assert.equal(landShape.owner_name, "劉玉梅");
assert.match(landShape.address_private || "", /地號：福興鄉文昌段935號/);
assert.equal(landShape.floor_price, "出價談（3%）");

const precisionAndInternalFields = parsePastedProperty(`
案名：三位小數測試
地坪：21.175坪
建坪：56.565坪
服務費：4%
底價：980萬
`);

assert.equal(precisionAndInternalFields.land_area_ping, "21.175");
assert.equal(precisionAndInternalFields.building_area_ping, "56.565");
assert.equal(precisionAndInternalFields.service_fee_rate, "4%");
assert.equal(precisionAndInternalFields.floor_price, "980萬");
assert.doesNotMatch(precisionAndInternalFields.address_private || "", /服務費|980萬/);

const serviceFeeAliases = parsePastedProperty(`
案名：服務費測試
服務費%：3%
仲介服務費：2.5%
`);

assert.equal(serviceFeeAliases.service_fee_rate, "3%");

console.log("ai-parser tests passed");
