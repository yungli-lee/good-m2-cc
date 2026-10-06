"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { allowedPropertyCategories, normalizePropertyCategories, propertyCategoryLabel, requirementTypeLabel, requirementTypes, urgencyLabels, urgencyLevels } from "@/lib/customer-requirements/constants";

type Props={personId:string;requirementId?:string;initial?:Record<string,unknown>;assignees:Array<{id:string;label:string}>};
const text=(v:unknown)=>typeof v==="string"?v:"";
const scalarText=(v:unknown)=>v==null?"":String(v);
const numberText=(v:unknown)=>typeof v==="number"?String(v/10000):"";
const list=(v:unknown)=>Array.isArray(v)?v.join("、"):"";
const split=(v:string)=>v.split(/[,，、\n]/).map(x=>x.trim()).filter(Boolean);

export function CustomerRequirementForm({personId,requirementId,initial={},assignees}:Props){
 const router=useRouter();
 const initialType=text(initial.requirement_type)||"residential";
 const initialCategories=Array.isArray(initial.property_categories)?initial.property_categories.filter((value):value is string=>typeof value==="string"):["townhouse"];
 const [values,setValues]=useState<Record<string,unknown>>({
  person_id:personId,title:text(initial.title),requirement_type:initialType,transaction_type:text(initial.transaction_type)||"buy",status:text(initial.status)||"active",urgency:text(initial.urgency)||"normal",
  property_categories:normalizePropertyCategories(initialType,initialCategories),cities:list(initial.cities),districts:list(initial.districts),area_note:text(initial.area_note),
  sale_budget_min:numberText(initial.sale_budget_min),sale_budget_max:numberText(initial.sale_budget_max),rent_budget_min:numberText(initial.rent_budget_min),rent_budget_max:numberText(initial.rent_budget_max),
  land_area_min:scalarText(initial.land_area_min),land_area_max:scalarText(initial.land_area_max),building_area_min:scalarText(initial.building_area_min),building_area_max:scalarText(initial.building_area_max),
  bedrooms_min:scalarText(initial.bedrooms_min),bedrooms_max:scalarText(initial.bedrooms_max),elevator_required:initial.elevator_required??null,parking_required:initial.parking_required??null,
  frontage_min:scalarText(initial.frontage_min),depth_min:scalarText(initial.depth_min),road_width_min:scalarText(initial.road_width_min),needs_water:initial.needs_water??null,needs_electricity:initial.needs_electricity??null,
  needs_three_phase_power:initial.needs_three_phase_power??null,needs_large_vehicle_access:initial.needs_large_vehicle_access??null,needs_office:initial.needs_office??null,
  must_have:list(initial.must_have),nice_to_have:list(initial.nice_to_have),unacceptable:list(initial.unacceptable),purchase_timeline:text(initial.purchase_timeline)||"undecided",funding_status:text(initial.funding_status)||"undecided",
  financing_status:text(initial.financing_status),assigned_user_id:text(initial.assigned_user_id)||null,notes:text(initial.notes),
 });
 const [errors,setErrors]=useState<Record<string,string>>({});
 const [formError,setFormError]=useState("");
 const [busy,setBusy]=useState(false);
 const set=(key:string,value:unknown)=>setValues(previous=>({...previous,[key]:value}));
 const type=String(values.requirement_type),tx=String(values.transaction_type),selectedCategories=values.property_categories as string[];
 const availableCategories=allowedPropertyCategories(type);
 const land=["building_land","industrial_land","farmland"].includes(type),factory=["factory","warehouse"].includes(type),residential=["residential","townhouse","rental"].includes(type),commercial=["storefront","office"].includes(type);
 const changeRequirementType=(next:string)=>setValues(previous=>({...previous,requirement_type:next,property_categories:normalizePropertyCategories(next,previous.property_categories as string[])}));
 const field=(key:string,label:string,inputType="text")=><label className="field"><span>{label}</span><input className="input" type={inputType} value={String(values[key]??"")} onChange={event=>set(key,event.target.value)} />{errors[key]?<small className="field-error">{errors[key]}</small>:null}</label>;
 const choice=(key:string,label:string)=><label className="field"><span>{label}</span><select className="select" value={values[key]===true?"true":values[key]===false?"false":""} onChange={event=>set(key,event.target.value===""?null:event.target.value==="true")}><option value="">不限／未確認</option><option value="true">必須</option><option value="false">不需要</option></select></label>;

 async function submit(event:React.FormEvent){
  event.preventDefault();if(busy)return;setBusy(true);setErrors({});setFormError("");
  const body:Record<string,unknown>={...values,person_id:personId};
  for(const key of ["cities","districts","must_have","nice_to_have","unacceptable"])body[key]=split(String(values[key]||""));
  for(const key of ["sale_budget_min","sale_budget_max","rent_budget_min","rent_budget_max","land_area_min","land_area_max","building_area_min","building_area_max","bedrooms_min","bedrooms_max","frontage_min","depth_min","road_width_min"])body[key]=values[key]===""?null:Number(values[key]);
  if(tx==="buy"){body.rent_budget_min=null;body.rent_budget_max=null}else{body.sale_budget_min=null;body.sale_budget_max=null}
  const response=await fetch(requirementId?`/api/admin/crm/requirements/${requirementId}`:"/api/admin/crm/requirements",{method:requirementId?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const output=await response.json().catch(()=>null);setBusy(false);
  if(!response.ok||!output?.ok){const nextErrors=output?.fieldErrors||{};const firstError=Object.values(nextErrors).find((message):message is string=>typeof message==="string");setErrors(nextErrors);setFormError(firstError?`${output?.message||"客需儲存失敗"}：${firstError}`:output?.message||"客需儲存失敗");return}
  router.push(`/admin/crm/requirements/${output.item.id}`);router.refresh();
 }

 return <form className="form-grid" onSubmit={submit}>
  <label className="field full"><span>客需名稱</span><input className="input" value={String(values.title)} onChange={event=>set("title",event.target.value)} required />{errors.title?<small className="field-error">{errors.title}</small>:null}</label>
  <label className="field"><span>需求類型</span><select className="select" value={type} onChange={event=>changeRequirementType(event.target.value)}>{!requirementTypes.includes(type as never)?<option value={type}>{requirementTypeLabel(type)}</option>:null}{requirementTypes.map(value=><option key={value} value={value}>{requirementTypeLabel(value)}</option>)}</select></label>
  <label className="field"><span>交易</span><select className="select" value={tx} onChange={event=>set("transaction_type",event.target.value)}><option value="buy">購買</option><option value="rent">承租</option></select></label>
  <label className="field full"><span>物件類型（至少一項）</span><div className="actions">{availableCategories.map(value=><label key={value}><input type="checkbox" checked={selectedCategories.includes(value)} onChange={event=>set("property_categories",event.target.checked?[...selectedCategories,value]:selectedCategories.filter(selected=>selected!==value))}/>{propertyCategoryLabel(value)}</label>)}</div>{errors.property_categories?<small className="field-error">{errors.property_categories}</small>:null}</label>
  {field("cities","縣市（頓號分隔）")}{field("districts","行政區（頓號分隔）")}{field("area_note","區域備註")}
  {tx==="buy"?<>{field("sale_budget_min","最低預算（萬元）","number")}{field("sale_budget_max","最高預算（萬元）","number")}</>:<>{field("rent_budget_min","最低月租（萬元）","number")}{field("rent_budget_max","最高月租（萬元）","number")}</>}
  {(residential||land||factory)&&<>{field("land_area_min","最低地坪（坪）","number")}{field("building_area_min","最低建坪（坪）","number")}</>}
  {residential&&<>{field("bedrooms_min","最少房數","number")}{field("bedrooms_max","最多房數","number")}{choice("elevator_required","電梯")}{choice("parking_required","車位")}</>}
  {(land||commercial)&&<>{field("frontage_min","最小面寬（公尺）","number")}{field("depth_min","最小深度（公尺）","number")}{field("road_width_min","最小路寬（公尺）","number")}</>}
  {land&&<>{choice("needs_water","需要水")}{choice("needs_electricity","需要電")}</>}
  {factory&&<>{choice("needs_three_phase_power","三相電")}{choice("needs_large_vehicle_access","大車進出")}{choice("needs_office","辦公室")}</>}
  {field("must_have","必要條件（頓號分隔）")}{field("nice_to_have","偏好條件（頓號分隔）")}{field("unacceptable","不可接受（頓號分隔）")}
  <label className="field"><span>急迫程度</span><select className="select" value={String(values.urgency)} onChange={event=>set("urgency",event.target.value)}>{urgencyLevels.map(value=><option key={value} value={value}>{urgencyLabels[value]}</option>)}</select></label>
  <label className="field"><span>購買時程</span><select className="select" value={String(values.purchase_timeline)} onChange={event=>set("purchase_timeline",event.target.value)}><option value="immediate">立即</option><option value="within_1_month">一個月內</option><option value="within_3_months">三個月內</option><option value="within_6_months">六個月內</option><option value="within_1_year">一年內</option><option value="undecided">未決定</option></select></label>
  <label className="field"><span>資金方式</span><select className="select" value={String(values.funding_status)} onChange={event=>set("funding_status",event.target.value)}><option value="cash">現金</option><option value="loan">貸款</option><option value="cash_and_loan">現金＋貸款</option><option value="asset_sale">出售資產</option><option value="undecided">未決定</option></select></label>
  {field("financing_status","貸款狀況")}
  <label className="field"><span>負責人</span><select className="select" value={String(values.assigned_user_id||"")} onChange={event=>set("assigned_user_id",event.target.value||null)}><option value="">未指定</option>{assignees.map(value=><option key={value.id} value={value.id}>{value.label}</option>)}</select></label>
  <label className="field full"><span>備註</span><textarea className="textarea" value={String(values.notes)} onChange={event=>set("notes",event.target.value)}/></label>
  {formError?<div className="notice full" role="alert">{formError}</div>:null}
  <div className="actions full"><button className="button" disabled={busy}>{busy?"儲存中…":"儲存客需"}</button></div>
 </form>;
}
