"use client";

import { useEffect, useState } from "react";
import type { Property } from "@/lib/properties/types";

const parkingFeatures = ["平面", "機械", "上層", "下層"];
const parkingAccess = ["坡道", "升降"];
const parkingArrangement = ["無車位", "固定車位", "車位另租", "抽籤決定", "先到先停", "排隊等候"];
const managementTypes = ["保全公司", "管理員(警衛)", "守望亭", "固定駐警", "巡守人員", "保全設施"];
const exteriorMaterials = ["洗石子", "馬賽克", "方塊磚", "二丁掛", "玻璃帷幕", "花崗石", "原木", "其他"];
const buildingStructures = ["磚造", "加強磚造", "鋼筋混凝土RC", "鋼骨SC或鋼骨混泥土", "石材", "鋼骨鋼筋混凝土SRC", "其他建材"];
const facilities = ["會議室", "獨立會客室", "閱覽室", "放映廳", "空中花園", "電腦室", "健身房", "游泳池", "兒童遊戲區", "健康步道", "圖書館", "三溫暖(SPA)", "KTV室"];

function Checks({ name, options, values }: { name: string; options: string[]; values?: string[] | null }) {
  const selected = new Set(values || []);
  return (
    <div className="checkbox-group">
      {options.map((option) => (
        <label key={option}>
          <input type="checkbox" name={name} value={option} defaultChecked={selected.has(option)} /> {option}
        </label>
      ))}
    </div>
  );
}

function TriState({
  name,
  label,
  value
}: {
  name: string;
  label: string;
  value?: boolean | null;
}) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <select className="select" id={name} name={name} defaultValue={value == null ? "" : String(value)}>
        <option value="">未設定</option>
        <option value="true">是</option>
        <option value="false">否</option>
      </select>
    </div>
  );
}

export function PropertyApartmentBuildingFields({ property }: { property?: Property | null }) {
  const [propertyType, setPropertyType] = useState(property?.property_type || "townhouse");

  useEffect(() => {
    const select = document.getElementById("property_type") as HTMLSelectElement | null;
    if (!select) return;
    const update = () => setPropertyType(select.value);
    update();
    select.addEventListener("change", update);
    return () => select.removeEventListener("change", update);
  }, []);

  if (propertyType !== "apartment" && propertyType !== "building") return null;

  return (
    <fieldset className="field full" style={{ border: "1px solid #d8d2c5", borderRadius: 8, padding: 16 }}>
      <legend><strong>公寓／華廈／大樓專用資料</strong></legend>
      <p className="muted">供專用 Excel 與下一階段前台揭露使用。標示「後台限定」的資料不會直接公開。</p>

      <div className="form-grid">
        {propertyType === "building" ? (
          <div className="field">
            <label htmlFor="building_subtype">建物型態（手動選）</label>
            <select className="select" id="building_subtype" name="building_subtype" defaultValue={property?.building_subtype || ""}>
              <option value="">請選擇</option>
              <option value="huaxia">華廈</option>
              <option value="highrise">大樓</option>
            </select>
          </div>
        ) : (
          <>
            <input type="hidden" name="building_subtype" value="" />
            <div className="field"><label>建物型態</label><input className="input" value="無電梯公寓" disabled /></div>
          </>
        )}

        <div className="field"><label htmlFor="main_building_area_ping">主建坪</label><input className="input" id="main_building_area_ping" name="main_building_area_ping" type="number" step="0.001" min="0" defaultValue={property?.main_building_area_ping ?? ""} /></div>
        <div className="field"><label htmlFor="auxiliary_building_area_ping">附建坪</label><input className="input" id="auxiliary_building_area_ping" name="auxiliary_building_area_ping" type="number" step="0.001" min="0" defaultValue={property?.auxiliary_building_area_ping ?? ""} /></div>
        <div className="field"><label htmlFor="shared_area_ping">公設坪數</label><input className="input" id="shared_area_ping" name="shared_area_ping" type="number" step="0.001" min="0" defaultValue={property?.shared_area_ping ?? ""} /></div>
        <div className="field"><label htmlFor="parking_area_ping">車位坪數</label><input className="input" id="parking_area_ping" name="parking_area_ping" type="number" step="0.001" min="0" defaultValue={property?.parking_area_ping ?? ""} /></div>
        <div className="field"><label htmlFor="addition_area_ping">加建坪數</label><input className="input" id="addition_area_ping" name="addition_area_ping" type="number" step="0.001" min="0" defaultValue={property?.addition_area_ping ?? ""} /></div>

        <div className="field"><label htmlFor="above_ground_floors">地上總樓層</label><input className="input" id="above_ground_floors" name="above_ground_floors" type="number" min="0" defaultValue={property?.above_ground_floors ?? ""} /></div>
        <div className="field"><label htmlFor="basement_floors">地下樓層</label><input className="input" id="basement_floors" name="basement_floors" type="number" min="0" defaultValue={property?.basement_floors ?? ""} /></div>
        <div className="field"><label htmlFor="community_name">社區／大樓名稱</label><input className="input" id="community_name" name="community_name" defaultValue={property?.community_name || ""} /></div>
        <div className="field"><label htmlFor="total_units">總戶數</label><input className="input" id="total_units" name="total_units" type="number" min="0" defaultValue={property?.total_units ?? ""} /></div>
        <div className="field"><label htmlFor="elevator_count">電梯數</label><input className="input" id="elevator_count" name="elevator_count" type="number" min="0" defaultValue={property?.elevator_count ?? ""} /></div>
        <div className="field"><label htmlFor="units_per_floor">每層戶數</label><input className="input" id="units_per_floor" name="units_per_floor" type="number" min="0" defaultValue={property?.units_per_floor ?? ""} /></div>

        <fieldset className="field"><legend>車位</legend><Checks name="parking_space_features" options={parkingFeatures} values={property?.parking_space_features} /></fieldset>
        <fieldset className="field"><legend>車道</legend><Checks name="parking_access_types" options={parkingAccess} values={property?.parking_access_types} /></fieldset>
        <div className="field"><label htmlFor="parking_floor">車位樓層</label><input className="input" id="parking_floor" name="parking_floor" defaultValue={property?.parking_floor || ""} /></div>
        <div className="field"><label htmlFor="parking_space_no">車位編號</label><input className="input" id="parking_space_no" name="parking_space_no" defaultValue={property?.parking_space_no || ""} /></div>
        <fieldset className="field full"><legend>車位型態</legend><Checks name="parking_arrangement" options={parkingArrangement} values={property?.parking_arrangement} /></fieldset>

        <fieldset className="field"><legend>管理方式</legend><Checks name="management_types" options={managementTypes} values={property?.management_types} /></fieldset>
        <div className="field"><label htmlFor="management_fee">管理費（元）</label><input className="input" id="management_fee" name="management_fee" type="number" min="0" defaultValue={property?.management_fee ?? ""} /></div>
        <div className="field"><label htmlFor="management_fee_payment">管理費繳費方式</label><select className="select" id="management_fee_payment" name="management_fee_payment" defaultValue={property?.management_fee_payment || ""}><option value="">未設定</option>{["月繳","雙月繳","季繳","年繳","一次繳"].map((x)=><option key={x} value={x}>{x}</option>)}</select></div>
        <div className="field"><label htmlFor="cleaning_fee">清潔費（元）</label><input className="input" id="cleaning_fee" name="cleaning_fee" type="number" min="0" defaultValue={property?.cleaning_fee ?? ""} /></div>

        <div className="field"><label htmlFor="market_area">市場商圈</label><input className="input" id="market_area" name="market_area" defaultValue={property?.market_area || ""} /></div>
        <div className="field"><label htmlFor="park_green_space">公園／綠地</label><input className="input" id="park_green_space" name="park_green_space" defaultValue={property?.park_green_space || ""} /></div>
        <div className="field"><label htmlFor="medical_facility">醫療機構</label><input className="input" id="medical_facility" name="medical_facility" defaultValue={property?.medical_facility || ""} /></div>
        <div className="field"><label htmlFor="nearby_train_station">鄰近火車站</label><input className="input" id="nearby_train_station" name="nearby_train_station" defaultValue={property?.nearby_train_station || ""} /></div>
        <div className="field"><label htmlFor="nearby_bus_stop">鄰近公車站</label><input className="input" id="nearby_bus_stop" name="nearby_bus_stop" defaultValue={property?.nearby_bus_stop || ""} /></div>

        <TriState name="has_courtyard" label="中庭" value={property?.has_courtyard} />
        <TriState name="is_corner_unit" label="邊間" value={property?.is_corner_unit} />
        <fieldset className="field full"><legend>外壁材質</legend><Checks name="exterior_materials" options={exteriorMaterials} values={property?.exterior_materials} /></fieldset>
        <fieldset className="field full"><legend>建物結構</legend><Checks name="building_structures" options={buildingStructures} values={property?.building_structures} /></fieldset>
        <fieldset className="field full"><legend>公共設施</legend><Checks name="public_facilities" options={facilities} values={property?.public_facilities} /></fieldset>
        <div className="field full"><label htmlFor="public_facility_floor_notes">公共設施樓層／補充</label><textarea className="textarea" id="public_facility_floor_notes" name="public_facility_floor_notes" defaultValue={property?.public_facility_floor_notes || ""} /></div>

        <div className="field"><label htmlFor="mortgage_setting_amount">設定金額（萬元，後台限定）</label><input className="input" id="mortgage_setting_amount" name="mortgage_setting_amount" type="number" min="0" defaultValue={property?.mortgage_setting_amount ?? ""} /></div>
        <TriState name="showing_key_available" label="KEY 有無（後台限定）" value={property?.showing_key_available} />
        <div className="field"><label htmlFor="owner_age">屋主年齡（後台限定）</label><input className="input" id="owner_age" name="owner_age" type="number" min="0" defaultValue={property?.owner_age ?? ""} /></div>
        <div className="field"><label htmlFor="owner_gender">屋主性別（後台限定）</label><select className="select" id="owner_gender" name="owner_gender" defaultValue={property?.owner_gender || ""}><option value="">未設定</option><option value="男">男</option><option value="女">女</option></select></div>
        <div className="field"><label htmlFor="owner_occupation">屋主工作（後台限定）</label><input className="input" id="owner_occupation" name="owner_occupation" defaultValue={property?.owner_occupation || ""} /></div>
      </div>
    </fieldset>
  );
}
