"use server";
import {requireRole} from "@/lib/auth";
import {resolveFacebookPageToken,FACEBOOK_PAGE_ID} from "./facebook-page-token";
const GRAPH="https://graph.facebook.com/v26.0/";
type Result={ok:boolean;message:string;permissions?:string;pageTasks?:string};
type MetaReply={id?:string;name?:string;data?:{id?:string}[];error?:{code?:number;error_subcode?:number}};
async function probe(token:string,path:string):Promise<string>{
 try{
  const response=await fetch(GRAPH+path,{headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(10000)});
  const data=await response.json() as MetaReply;
  if(!response.ok||data.error)return "無法讀取（HTTP "+response.status+" / Meta "+(data.error?.code??"unknown")+"）";
  return "讀取成功";
 }catch{return "讀取失敗或逾時";}
}
export async function checkFacebookPageConnection():Promise<Result>{
 await requireRole(["admin","owner"]);
 try{
  const token=await resolveFacebookPageToken();
  const [page,videoRead]=await Promise.all([
   probe(token,FACEBOOK_PAGE_ID+"?fields=id,name"),
   probe(token,FACEBOOK_PAGE_ID+"/videos?fields=id&limit=1")
  ]);
  return {ok:true,
   message:"Page Token 身分正確。已停止以 Page Token 查詢不適用的 /me/permissions 與 tasks 欄位；那些 HTTP 400 / API 100 不是缺權限的證據。",
   permissions:"粉專基本資料："+page+"；影片列表（唯讀）："+videoRead+"。讀取成功仍不代表具有影片發布權限。",
   pageTasks:"CREATE_CONTENT 與 pages_manage_posts 必須在 Meta App／系統使用者的權限設定中核對；Page Token 無法透過先前兩項查詢可靠判定。"
  };
 }catch(error){return {ok:false,message:error instanceof Error?error.message:"粉專驗證失敗，未送出貼文。"};}
}
