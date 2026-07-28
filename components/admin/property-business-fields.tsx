"use client";

import { useState } from "react";
import type { Property } from "@/lib/properties/types";

const motivations = ["換屋","工作","就學","家庭組成改變","移民","資金運用","其他"];
const conditions = ["空屋","自用","出租","結構體","其他"];
const usages = ["住宅","店面","辦公","住辦","住店","廠房","倉庫","土地","車位","其他"];
const styles = ["透天","別墅","農舍","公寓","華廈","電梯大樓","套房","店面","廠房","倉庫","土地","其他"];
const parking = ["無","車庫","門前停車","騎樓停車","庭院停車","平面車位","機械車位","露天停車","其他"];

function OtherField({ name, label, visible, value }: { name:string; label:string; visible:boolean; value?:string|null }) {
  return visible ? <div className="field"><label htmlFor={name}>{label}</label><input className="input" id={name} name={name} defaultValue={value || ""}/></div> : null;
}
function ChoiceGroup({ name,label,options,selected,onChange }:{name:string;label:string;options:string[];selected:string[];onChange:(v:string)=>void}) {
  return <fieldset className="field"><legend>{label}</legend><div className="checkbox-group">{options.map((item)=><label key={item}><input type="checkbox" name={name} value={item} checked={selected.includes(item)} onChange={()=>onChange(item)}/> {item}</label>)}</div></fieldset>;
}
function initialValues(value?:string[]|null, fallback:string[]=[]){ return Array.isArray(value) ? value : fallback; }

export function PropertyBusinessFields({ property }:{property?:Property|null}) {
  const [motivation,setMotivation]=useState(initialValues(property?.sale_motivation,["資金運用"]));
  const [condition,setCondition]=useState(initialValues(property?.current_condition_type));
  const [usage,setUsage]=useState(initialValues(property?.current_usage));
  const [buildingStyle,setBuildingStyle]=useState(initialValues(property?.building_style));
  const [parkingType,setParkingType]=useState(initialValues(property?.parking_type));
  const [hasAddition,setHasAddition]=useState(Boolean(property?.has_addition));
  const toggle=(selected:string[], setSelected:(v:string[])=>void, value:string)=>setSelected(selected.includes(value)?selected.filter((item)=>item!==value):[...selected,value]);
  return <>
    <div className="field"><label htmlFor="contract_signed_date">簽約日期</label><input className="input" id="contract_signed_date" name="contract_signed_date" type="date" defaultValue={property?.contract_signed_date||""}/></div>
    <ChoiceGroup name="sale_motivation" label="售屋動機（可複選）" options={motivations} selected={motivation} onChange={(v)=>toggle(motivation,setMotivation,v)}/>
    <OtherField name="sale_motivation_other" label="售屋動機－其他說明" visible={motivation.includes("其他")} value={property?.sale_motivation_other}/>
    <div className="field"><label htmlFor="showing_meeting_location">約看地點</label><input className="input" id="showing_meeting_location" name="showing_meeting_location" defaultValue={property?.showing_meeting_location||""}/></div>
    <ChoiceGroup name="current_condition_type" label="現況種類（可複選）" options={conditions} selected={condition} onChange={(v)=>toggle(condition,setCondition,v)}/>
    <OtherField name="current_condition_other" label="現況種類－其他說明" visible={condition.includes("其他")} value={property?.current_condition_other}/>
    <ChoiceGroup name="current_usage" label="現況用途（可複選）" options={usages} selected={usage} onChange={(v)=>toggle(usage,setUsage,v)}/>
    <OtherField name="current_usage_other" label="現況用途－其他說明" visible={usage.includes("其他")} value={property?.current_usage_other}/>
    <ChoiceGroup name="building_style" label="型態（可複選）" options={styles} selected={buildingStyle} onChange={(v)=>toggle(buildingStyle,setBuildingStyle,v)}/>
    <OtherField name="building_style_other" label="型態－其他說明" visible={buildingStyle.includes("其他")} value={property?.building_style_other}/>
    <ChoiceGroup name="parking_type" label="停車位（可複選）" options={parking} selected={parkingType} onChange={(v)=>toggle(parkingType,setParkingType,v)}/>
    <OtherField name="parking_type_other" label="停車位－其他說明" visible={parkingType.includes("其他")} value={property?.parking_type_other}/>
    <div className="field"><label htmlFor="road_width">路寬（米）</label><input className="input" id="road_width" name="road_width" type="number" step="0.01" min="0" defaultValue={property?.road_width??""}/></div>
    <div className="field"><label htmlFor="completion_date">完工日期</label><input className="input" id="completion_date" name="completion_date" type="date" defaultValue={property?.completion_date||""}/></div>
    <div className="field"><label htmlFor="has_addition"><input id="has_addition" type="checkbox" name="has_addition" checked={hasAddition} onChange={(e)=>setHasAddition(e.target.checked)}/> 有加建</label></div>
    <OtherField name="addition_description" label="加建位置／說明" visible={hasAddition} value={property?.addition_description}/>
    <div className="field"><label htmlFor="elementary_school_district">小學學區</label><input className="input" id="elementary_school_district" name="elementary_school_district" defaultValue={property?.elementary_school_district||""}/></div>
    <div className="field"><label htmlFor="junior_high_school_district">中學學區</label><input className="input" id="junior_high_school_district" name="junior_high_school_district" defaultValue={property?.junior_high_school_district||""}/></div>
  </>;
}
