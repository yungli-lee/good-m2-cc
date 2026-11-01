"use server";
import {revalidatePath} from "next/cache";
import {requireRole} from "@/lib/auth";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {resolveFacebookPageToken,FACEBOOK_PAGE_ID} from "./facebook-page-token";

const GRAPH="https://graph.facebook.com/v26.0/";
const MAX_BYTES=20*1024*1024;
const DIAG_VERSION="VIDEO-DIAG-2";
type Result={ok:boolean;message:string};
type MetaVideoReply={id?:unknown;error?:{code?:number;error_subcode?:number;type?:string;message?:string}};
/** Keep only allowlisted diagnostic fields; never persist signed file URLs or credentials. */
function metaVideoFailure(httpStatus:number,reply:MetaVideoReply):string{
 const err=reply.error;
 if(err)return "META_API_ERROR http="+httpStatus+" code="+(err.code??"unknown")+" subcode="+(err.error_subcode??"none")+" type="+(err.type??"unknown").slice(0,40);
 if(!Number.isInteger(httpStatus)||httpStatus<200||httpStatus>=300)return "META_HTTP_"+httpStatus;
 if(typeof reply.id!=="string"||!/^\d+$/.test(reply.id))return "META_MISSING_VIDEO_ID http="+httpStatus+" id_type="+typeof reply.id;
 return "META_UNEXPECTED_RESPONSE http="+httpStatus;
}
export async function publishFacebookVideo(id:string,scheduledIso?:string):Promise<Result>{
 const user=await requireRole(["editor","admin","owner"]);
 const db=await createSupabaseServerClient();
 let scheduledMs:number|undefined;
 if(scheduledIso!==undefined){
   scheduledMs=Date.parse(scheduledIso);
   if(!Number.isFinite(scheduledMs)||scheduledMs-Date.now()<11*60*1000||scheduledMs-Date.now()>29*24*3600*1000)
     return {ok:false,message:"請選擇 11 分鐘後至 29 天內的時間（台灣時間）。"};
 }
 const {data:post,error:postError}=await db.from("social_posts")
   .select("id,title,body,link_url,status,facebook_post_id")
   .eq("id",id).eq("author_id",user.user.id).single();
 if(postError||!post||!["draft","ready"].includes(post.status)||post.facebook_post_id)
   return {ok:false,message:"草稿狀態不符或已送出，請先重新整理。"};
 const {data:video,error:videoError}=await db.from("social_post_videos")
   .select("storage_path").eq("post_id",id).maybeSingle();
 if(videoError||!video)return {ok:false,message:"尚未找到已確認上傳的影片。"};
 const {data:photos,error:photoError}=await db.from("social_post_images").select("id").eq("post_id",id).limit(1);
 if(photoError||photos?.length)return {ok:false,message:"同篇不能同時包含圖片與影片，未送出。"};
 const {data:files,error:listError}=await db.storage.from("social-post-videos")
   .list(user.user.id+"/"+id,{limit:100});
 const name=video.storage_path.split("/").pop();
 const file=files?.find(f=>f.name===name);
 if(listError||!file||Number(file.metadata?.size)<1||Number(file.metadata?.size)>MAX_BYTES)
   return {ok:false,message:"影片檔案不存在或大小異常，未送出。"};
 // Resolve the credential before claiming: authentication failures must not lock the draft.
 const token=await resolveFacebookPageToken();
 const {data:claim,error:claimError}=await db.from("social_posts")
   .update({status:"publishing",updated_at:new Date().toISOString()})
   .eq("id",id).eq("author_id",user.user.id).eq("status",post.status)
   .is("facebook_post_id",null).select("id").maybeSingle();
 if(claimError||!claim)return {ok:false,message:"貼文已在處理，請勿重複送出。"};
 // From here, never retry automatically: Meta may accept a video even if the response is lost.
 try{
   const {data:signed,error:signedError}=await db.storage.from("social-post-videos")
     .createSignedUrl(video.storage_path,3600);
   if(signedError||!signed?.signedUrl)throw new Error("SIGNED_URL");
   const description=[post.body||"",post.link_url||""].filter(Boolean).join("\n");
   const params=new URLSearchParams({file_url:signed.signedUrl,title:post.title,
     description,published:scheduledMs?"false":"true"});
   if(scheduledMs){
     params.set("scheduled_publish_time",String(Math.floor(scheduledMs/1000)));
     params.set("unpublished_content_type","SCHEDULED");
   }
   const response=await fetch(GRAPH+FACEBOOK_PAGE_ID+"/videos",{
     method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/x-www-form-urlencoded"},
     body:params.toString(),cache:"no-store"
   });
   let result:MetaVideoReply;
   try { result=await response.json() as MetaVideoReply; }
   catch { throw new Error("META_INVALID_JSON http="+response.status); }
   if(!response.ok||result.error||typeof result.id!=="string"||!/^\d+$/.test(result.id))
     throw new Error(metaVideoFailure(response.status,result));
   // Video endpoint returns a numeric video ID, not the page_post feed ID.
   const {error:updateError}=await db.from("social_posts").update({
     status:scheduledMs?"scheduled":"posted",facebook_post_id:result.id,
     facebook_page_id:FACEBOOK_PAGE_ID,
     facebook_scheduled_for:scheduledMs?new Date(scheduledMs).toISOString():null,
     facebook_published_at:scheduledMs?null:new Date().toISOString(),
     posted_at:scheduledMs?null:new Date().toISOString(),
     facebook_error:null,updated_at:new Date().toISOString()
   }).eq("id",id).eq("author_id",user.user.id).eq("status","publishing");
   if(updateError)throw new Error("DB_UPDATE code="+(updateError.code||"unknown"));
   revalidatePath("/admin/social-posts");
   return {ok:true,message:scheduledMs?
     "Meta 已接受影片預約。請至 Facebook 排程區核對，並等待實際發布。":
     "Meta 已接受影片，可能仍在轉碼處理；請至粉專確認公開顯示。"};
 }catch(error){
   const code=error instanceof Error?error.message:"UNKNOWN";
   await db.from("social_posts").update({status:"publish_unknown",
     facebook_error:"["+DIAG_VERSION+"] 影片送往 Meta 結果待核對 ("+code.slice(0,160)+")；禁止直接重試",
     updated_at:new Date().toISOString()})
     .eq("id",id).eq("author_id",user.user.id).eq("status","publishing");
   revalidatePath("/admin/social-posts");
   return {ok:false,message:"["+DIAG_VERSION+"] 影片送出結果無法確認（診斷："+code.slice(0,160)+"）。請先查看 Facebook 粉專與排程區，勿重複發布。"};
 }
}
