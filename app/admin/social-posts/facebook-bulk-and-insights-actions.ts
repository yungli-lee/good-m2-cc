"use server";
import {requireRole} from "@/lib/auth";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {resolveFacebookPageToken,FACEBOOK_PAGE_ID} from "./facebook-page-token";
import {revalidatePath} from "next/cache";

type Check={id:string;title:string;facebookId:string;state:"exists"|"published"|"scheduled"|"suspected"|"unverified";message:string};
type Meta={id?:string;is_published?:boolean;error?:{code?:number;error_subcode?:number};data?:Array<{id?:string}>;paging?:{next?:string}};
const GRAPH="https://graph.facebook.com/v26.0/";
async function getMeta(path:string,token:string):Promise<{ok:boolean;data:Meta;status:number}>{
 const response=await fetch(GRAPH+path,{headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(9000)});
 let data:Meta;try{data=await response.json() as Meta;}catch{data={};}
 return {ok:response.ok&&!data.error,data,status:response.status};
}
export async function syncAllFacebookPosts():Promise<{ok:boolean;message:string;results:Check[]}>{
 const user=await requireRole(["admin","owner"]);
 const db=await createSupabaseServerClient();
 const {data:posts,error}=await db.from("social_posts")
  .select("id,title,status,facebook_post_id,facebook_page_id,facebook_scheduled_for")
  .eq("author_id",user.user.id).eq("facebook_page_id",FACEBOOK_PAGE_ID)
  .is("facebook_deleted_at",null).in("status",["posted","scheduled"])
  .order("created_at",{ascending:false}).limit(100);
 if(error)return {ok:false,message:"讀取後台貼文失敗。",results:[]};
 if(!posts?.length)return {ok:true,message:"沒有需要同步的 Facebook 貼文。",results:[]};
 let token:string;try{token=await resolveFacebookPageToken();}
 catch{return {ok:false,message:"Facebook 粉專授權無法驗證，未變更紀錄。",results:[]};}
 // Page published_posts can establish published status without requiring the is_published field.
 // Absence from a bounded list is never evidence of deletion.
 const published=new Set<string>();
 try{
  let next:string|undefined=FACEBOOK_PAGE_ID+"/published_posts?fields=id&limit=100";
  for(let page=0;page<5&&next;page++){
   const r=await getMeta(next,token);if(!r.ok||!r.data.data)break;
   for(const item of r.data.data)if(item.id)published.add(item.id);
   const url=r.data.paging?.next;
   next=url?.startsWith(GRAPH)?url.slice(GRAPH.length):undefined;
  }
 }catch{/* permission or timeout: individual checks still run */}
 const results:Check[]=new Array(posts.length);
 let cursor=0;
 async function worker(){
  while(cursor<posts!.length){
   const i=cursor++,p=posts![i];
   const facebookId=p.facebook_post_id as string;
   const entry:Check={id:p.id,title:p.title,facebookId,state:"unverified",message:"Meta 無法確認；請人工核對"};
   results[i]=entry;
   if(!facebookId){entry.message="缺少 Facebook 貼文 ID";continue;}
   if(published.has(facebookId)){
    entry.state="published";entry.message="已在粉專公開貼文清單確認";
    if(p.status==="scheduled"){
     const {error:updateError}=await db.from("social_posts").update({status:"posted",facebook_published_at:new Date().toISOString(),updated_at:new Date().toISOString()})
      .eq("id",p.id).eq("author_id",user.user.id).eq("status","scheduled").eq("facebook_post_id",facebookId);
     if(updateError){entry.state="unverified";entry.message="Facebook 已公開，但後台更新失敗";}
    }
    continue;
   }
   try{
    // Only request id. is_published and permalink_url may trigger Meta permission error 10.
    const r=await getMeta(encodeURIComponent(facebookId)+"?fields=id",token);
    if(r.ok&&r.data.id===facebookId){
     entry.state=p.status==="scheduled"?"scheduled":"exists";
     entry.message=p.status==="scheduled"?"貼文存在，尚未確認公開狀態":"Meta 確認原文存在";
    }else{
     const c=r.data.error?.code;
     entry.state=(c===100||c===803)?"suspected":"unverified";
     entry.message=c===190?"權杖失效（190）；不能判定刪文":
      c===10?"權限限制（10）；不能判定刪文":
      (c===100||c===803)?"Meta 無法找到原文（"+c+"），疑似站外刪除，請人工核對":
      "Meta 查詢失敗（"+(c||r.status)+"），請人工核對";
    }
   }catch{entry.message="Meta 連線逾時，不能判定刪文";}
  }
 }
 await Promise.all(Array.from({length:Math.min(4,posts.length)},()=>worker()));
 if(results.some(r=>r.state==="published"))revalidatePath("/admin/social-posts");
 const suspects=results.filter(r=>r.state==="suspected").length;
 const uncertain=results.filter(r=>r.state==="unverified").length;
 return {ok:true,message:"檢查 "+results.length+" 筆；疑似刪文 "+suspects+" 筆，無法確認 "+uncertain+" 筆。沒有自動刪除任何紀錄。",results};
}

export type FacebookEngagement={
 reactions:number|null;comments:number|null;shares:number|null;
 impressions:number|null;videoViews:number|null;note:string;
 diagnostics:Record<string,string>;
};
type MetaEngagementResponse=Meta & {
 reactions?:{summary?:{total_count?:number}};
 comments?:{summary?:{total_count?:number}};
 shares?:{count?:number};
 views?:number;
 summary?:{total_count?:number};
 data?:Array<{name?:string;values?:Array<{value?:number}>;total_value?:{value?:number}}>;
};
function apiFailure(r:{ok:boolean;data:Meta;status:number}):string{
 const code=r.data.error?.code;
 return "Meta API "+(code??"HTTP "+r.status)+(r.data.error?.error_subcode?"（子碼 "+r.data.error.error_subcode+"）":"");
}
export async function getFacebookPostEngagement(postId:string):Promise<FacebookEngagement>{
 const user=await requireRole(["editor","admin","owner"]);
 const db=await createSupabaseServerClient();
 const {data:p,error}=await db.from("social_posts")
  .select("facebook_post_id,facebook_page_id,facebook_deleted_at,status")
  .eq("id",postId).eq("author_id",user.user.id).single();
 if(error||!p||!p.facebook_post_id||p.facebook_page_id!==FACEBOOK_PAGE_ID||
    p.facebook_deleted_at||p.status!=="posted")
  throw new Error("此筆尚未公開或已封存，無法取得即時成效。");
 const token=await resolveFacebookPageToken();
 const id=encodeURIComponent(p.facebook_post_id);
 const isVideo=/^[0-9]+$/.test(p.facebook_post_id);
 const values:FacebookEngagement={
  reactions:null,comments:null,shares:null,impressions:null,videoViews:null,
  note:"只顯示 Meta API 實際回傳的數字；無法取得不代表 0。曝光與影片觀看屬於不同指標。",
  diagnostics:{}
 };
 async function readMetric(key:string,paths:string[],parse:(raw:MetaEngagementResponse)=>number|undefined):Promise<number|null>{
  const errors:string[]=[];
  for(const path of paths){
   try{
    const r=await getMeta(path,token);
    if(!r.ok){errors.push(apiFailure(r));continue;}
    const n=parse(r.data as MetaEngagementResponse);
    if(typeof n==="number"&&Number.isFinite(n)){values.diagnostics[key]="已取得";return n;}
    errors.push("API 未回傳此指標");
   }catch{errors.push("連線逾時或暫時失敗");}
  }
  values.diagnostics[key]=[...new Set(errors)].join("；")||"無法取得";
  return null;
 }
 // Query individual fields so a rejected metric never suppresses other metrics.
 // Some video objects use a different Graph edge from Page post objects.
 const reactionPaths=[
  id+"?fields="+encodeURIComponent("reactions.limit(0).summary(true)"),
  id+"/reactions?limit=0&summary=true"
 ];
 const commentPaths=[
  id+"?fields="+encodeURIComponent("comments.limit(0).summary(true)"),
  id+"/comments?limit=0&summary=true"
 ];
 const jobs:Promise<void>[]=[
  readMetric("心情反應",reactionPaths,r=>r.reactions?.summary?.total_count??r.summary?.total_count)
   .then(v=>{values.reactions=v;}),
  readMetric("留言",commentPaths,r=>r.comments?.summary?.total_count??r.summary?.total_count)
   .then(v=>{values.comments=v;})
 ];
 if(!isVideo){
  jobs.push(readMetric("分享",[id+"?fields=shares"],r=>r.shares?.count).then(v=>{values.shares=v;}));
  // Do not substitute media views for impressions: they measure different things.
  jobs.push(readMetric("貼文曝光",[
   id+"/insights?metric=post_impressions"
  ],r=>{
   const metric=r.data?.[0];
   return metric?.values?.[0]?.value??metric?.total_value?.value;
  }).then(v=>{values.impressions=v;}));
 }else{
  values.diagnostics["分享"]="影片物件未支援此查詢";
  values.diagnostics["貼文曝光"]="影片物件未支援此查詢";
  jobs.push(readMetric("影片觀看",[
   id+"?fields=views",
   id+"/video_insights?metric=total_video_views"
  ],r=>r.views??r.data?.[0]?.values?.[0]?.value??r.data?.[0]?.total_value?.value)
   .then(v=>{values.videoViews=v;}));
 }
 await Promise.all(jobs);
 return values;
}
