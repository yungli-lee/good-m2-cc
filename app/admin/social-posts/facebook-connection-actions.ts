"use server";
import { requireRole } from "@/lib/auth";
import { resolveFacebookPageToken, FACEBOOK_PAGE_ID } from "./facebook-page-token";

const GRAPH="https://graph.facebook.com/v26.0/";
const REQUIRED=["pages_manage_posts","pages_read_engagement","pages_show_list"];
type Diagnostic={ok:boolean;message:string;permissions?:string;pageTasks?:string};
type PermissionReply={data?:{permission?:string;status?:string}[];error?:{code?:number}};
type PageReply={id?:string;tasks?:string[];error?:{code?:number}};
async function readOnlyMeta<T>(token:string,path:string):Promise<{value?:T;reason?:string}>{
 try{
  const response=await fetch(GRAPH+path,{headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(10000)});
  const json=await response.json() as T & {error?:{code?:number}};
  if(!response.ok||json.error)return {reason:"Meta HTTP "+response.status+" / API "+(json.error?.code??"unknown")};
  return {value:json};
 }catch{return {reason:"讀取失敗或逾時"};}
}
export async function checkFacebookPageConnection():Promise<Diagnostic>{
 await requireRole(["admin","owner"]);
 try{
  const token=await resolveFacebookPageToken();
  const [permissions,page]=await Promise.all([
   readOnlyMeta<PermissionReply>(token,"me/permissions?limit=100"),
   readOnlyMeta<PageReply>(token,FACEBOOK_PAGE_ID+"?fields=id,tasks")
  ]);
  let permissionsText:string;
  if(permissions.value?.data){
   const granted=new Set(permissions.value.data.filter(x=>x.status==="granted").map(x=>x.permission));
   permissionsText=REQUIRED.map(p=>p+": "+(granted.has(p)?"已授權":"未在清單確認")).join("；");
  }else permissionsText="無法讀取權限清單（"+(permissions.reason??"回應無資料")+"），不能據此認定缺少權限";
  let tasksText:string;
  if(page.value?.id===FACEBOOK_PAGE_ID&&Array.isArray(page.value.tasks))
   tasksText=page.value.tasks.length?page.value.tasks.join("、"):"Meta 未回傳任何粉專任務";
  else tasksText="無法確認粉專 CREATE_CONTENT 任務（"+(page.reason??"回應未包含 tasks")+"）";
  return {ok:true,message:"已確認 Page Token 身分符合指定粉專；這不代表具有影片發布權限。以下為唯讀診斷，不會發文或顯示 Token。",permissions:permissionsText,pageTasks:tasksText};
 }catch(error){
  return {ok:false,message:error instanceof Error?error.message:"Facebook 粉專驗證失敗，未送出貼文。"};
 }
}
