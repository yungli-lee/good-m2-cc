"use server";
import {requireRole} from "@/lib/auth";
import {configuredFacebookToken,resolveFacebookPageToken,FACEBOOK_PAGE_ID} from "./facebook-page-token";
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

type DebugReply={data?:{app_id?:string;type?:string;is_valid?:boolean;scopes?:string[];granular_scopes?:{scope?:string;target_ids?:string[]}[]};error?:{code?:number}};
async function debugExistingToken(token:string):Promise<string>{
 const appId=process.env.FACEBOOK_APP_ID;
 const appSecret=process.env.FACEBOOK_APP_SECRET;
 if(!appId||!appSecret)return "未執行：Preview 尚未設定 FACEBOOK_APP_ID 與 FACEBOOK_APP_SECRET。請勿將密鑰貼入聊天或前台。";
 try{
  const params=new URLSearchParams({input_token:token});
  const response=await fetch(GRAPH+"debug_token?"+params.toString(),{
   headers:{Authorization:"Bearer "+appId+"|"+appSecret},cache:"no-store",signal:AbortSignal.timeout(10000)
  });
  const json=await response.json() as DebugReply;
  if(!response.ok||json.error||!json.data)return "無法檢查（HTTP "+response.status+" / Meta "+(json.error?.code??"unknown")+"）";
  const data=json.data;
  const wanted=["pages_manage_posts","pages_read_engagement","pages_show_list","pages_manage_engagement"];
  const scopes=new Set(data.scopes||[]);
  return "有效："+(data.is_valid===true?"是":data.is_valid===false?"否":"未知")+
   "；類型："+(data.type||"未知").slice(0,35)+
   "；所屬 App："+(data.app_id===appId?"符合":"不符合或未回傳")+
   "；授權："+wanted.map(x=>x+" "+(scopes.has(x)?"有":"未列出")).join("、");
 }catch{return "偵錯請求失敗或逾時";}
}
export async function checkFacebookPageConnection():Promise<Result>{
 await requireRole(["admin","owner"]);
 try{
  const token=await resolveFacebookPageToken();
  const [page,videoRead,systemTokenDebug,pageTokenDebug]=await Promise.all([
   probe(token,FACEBOOK_PAGE_ID+"?fields=id,name"),
   probe(token,FACEBOOK_PAGE_ID+"/videos?fields=id&limit=1"),
   debugExistingToken(configuredFacebookToken()),
   debugExistingToken(token)
  ]);
  return {ok:true,
   message:"Page Token 身分正確。已停止以 Page Token 查詢不適用的 /me/permissions 與 tasks 欄位；那些 HTTP 400 / API 100 不是缺權限的證據。",
   permissions:"粉專基本資料："+page+"；影片列表（唯讀）："+videoRead+"。讀取成功仍不代表具有影片發布權限。",
   pageTasks:"目前 Cloudflare 設定的原始 Token："+systemTokenDebug+"。實際用於發布的 Page Token："+pageTokenDebug+"。CREATE_CONTENT 任務仍須在 Meta Business 後台核對。"
  };
 }catch(error){return {ok:false,message:error instanceof Error?error.message:"粉專驗證失敗，未送出貼文。"};}
}
