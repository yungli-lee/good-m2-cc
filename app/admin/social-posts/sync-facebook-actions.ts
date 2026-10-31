"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {resolveFacebookPageToken} from "./facebook-page-token";

const PAGE_ID="284090174797562";
export async function syncFacebookPostStatus(postId:string):Promise<{ok:boolean;message:string}>{
  const user=await requireRole(["editor","admin","owner"]);
  const db=await createSupabaseServerClient();
  const {data:post,error}=await db.from("social_posts")
    .select("id,status,facebook_post_id,facebook_page_id,facebook_deleted_at")
    .eq("id",postId).eq("author_id",user.user.id).single();
  if(error||!post||post.facebook_page_id!==PAGE_ID||!post.facebook_post_id||post.facebook_deleted_at)
    return {ok:false,message:"沒有可同步的 Facebook 貼文紀錄。"};
  if(/^\d+$/.test(post.facebook_post_id)) return {ok:false,message:"影片已取得 Meta 影片 ID；目前請至粉專確認轉碼及發布狀態，影片自動同步尚待驗證。"};
  let token:string;
  try{token=await resolveFacebookPageToken();}
  catch{return {ok:false,message:"Facebook 粉專權杖無法驗證；後台狀態不變。"};}
  let response:Response;
  try{
    response=await fetch("https://graph.facebook.com/v26.0/"+encodeURIComponent(post.facebook_post_id)+"?fields=id,is_published,updated_time,permalink_url",{
      headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(10000)
    });
  }catch{return {ok:false,message:"暫時無法連線 Facebook；原有狀態不變。"};}
  let data:{id?:string;is_published?:boolean;error?:{code?:number}};
  try{data=await response.json() as typeof data;}catch{return {ok:false,message:"Meta 回應無法解析，原有狀態不變。"};}
  if((!response.ok||data.error)&&data.error?.code===10&&post.status==="scheduled"){
    // Meta may reject is_published on Page posts. Verify against published_posts instead.
    // A scheduled/unpublished post must never be treated as published from its ID alone.
    try{
      let url="https://graph.facebook.com/v26.0/"+PAGE_ID+"/published_posts?fields=id&limit=100";
      for(let page=0;page<5;page++){
        const check=await fetch(url,{headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(10000)});
        const list=await check.json() as {data?:Array<{id?:string}>;paging?:{next?:string};error?:{code?:number}};
        if(!check.ok||list.error)break;
        if(list.data?.some(item=>item.id===post.facebook_post_id)){
          const {error:updateError}=await db.from("social_posts").update({status:"posted",facebook_published_at:new Date().toISOString(),updated_at:new Date().toISOString()})
            .eq("id",postId).eq("author_id",user.user.id).eq("status","scheduled").eq("facebook_post_id",post.facebook_post_id);
          if(updateError)return {ok:false,message:"已在粉專公開貼文清單找到原文，但後台更新失敗。"};
          revalidatePath("/admin/social-posts");
          return {ok:true,message:"已在 Facebook 公開貼文清單確認原文，後台更新為「已發布」。"};
        }
        if(!list.paging?.next||!list.paging.next.startsWith("https://graph.facebook.com/"))break;
        url=list.paging.next;
      }
    }catch{/* Keep status unchanged if published_posts cannot be verified. */}
    return {ok:false,message:"Meta 不允許讀取貼文發布狀態（10），也未能從公開貼文清單確認。請由管理者核對 Facebook 原文後手動確認；原有狀態不變。"};
  }
  if(!response.ok||data.error){
    return {ok:false,message:data.error?.code===190?
      "Facebook 授權已過期（190），請重新授權；原有狀態不變。" :
      "Meta 無法確認這篇貼文的狀態（"+(data.error?.code||response.status)+"），不能推定已刪除；請人工核對。"};
  }
  if(data.id!==post.facebook_post_id)return {ok:false,message:"Facebook 回傳的貼文 ID 不符，已停止同步。"};
  if(data.is_published===true && post.status==="scheduled"){
    const {error:updateError}=await db.from("social_posts").update({
      status:"posted",facebook_published_at:new Date().toISOString(),updated_at:new Date().toISOString()
    }).eq("id",postId).eq("author_id",user.user.id).eq("status","scheduled").eq("facebook_post_id",post.facebook_post_id);
    if(updateError)return {ok:false,message:"Facebook 已發布，但後台更新失敗。"};
    revalidatePath("/admin/social-posts");
    return {ok:true,message:"已確認 Facebook 公開發布，後台狀態更新為「已發布」。"};
  }
  if(data.is_published===false && post.status==="scheduled")
    return {ok:true,message:"Facebook 仍顯示尚未公開，保留「已預約」。"};
  return {ok:true,message:"已查詢 Facebook。沒有需要變更的後台狀態。"};
}

/** Explicit operator confirmation when Meta denies read permission. Never inferred from elapsed time. */
export async function confirmFacebookScheduledPublished(postId:string):Promise<{ok:boolean;message:string}>{
 const user=await requireRole(["admin","owner"]);
 const db=await createSupabaseServerClient();
 const {data:post,error}=await db.from("social_posts")
   .select("status,facebook_post_id,facebook_page_id,facebook_scheduled_for,facebook_deleted_at")
   .eq("id",postId).eq("author_id",user.user.id).single();
 if(error||!post||post.status!=="scheduled"||post.facebook_page_id!==PAGE_ID||
    !post.facebook_post_id||post.facebook_deleted_at||!post.facebook_scheduled_for||
    Date.parse(post.facebook_scheduled_for)>Date.now()||
    !(/^284090174797562_[0-9]+$/.test(post.facebook_post_id)||/^[0-9]+$/.test(post.facebook_post_id)))
   return {ok:false,message:"此筆不符合人工確認條件，未變更紀錄。"};
 const {data:updated,error:updateError}=await db.from("social_posts").update({
   status:"posted",facebook_published_at:new Date().toISOString(),
   facebook_error:"由管理者於 Facebook 粉專確認已公開（人工核對，非 API 自動驗證）",
   updated_at:new Date().toISOString()
 }).eq("id",postId).eq("author_id",user.user.id).eq("status","scheduled")
   .eq("facebook_post_id",post.facebook_post_id).select("id").maybeSingle();
 if(updateError||!updated)return {ok:false,message:"更新失敗或狀態已變更，請重新整理。"};
 revalidatePath("/admin/social-posts");
 return {ok:true,message:"已依管理者人工核對結果更新為「已發布」；不會再次送出 Facebook。"};
}

/**
 * Facebook-side deletion: operator attests that the original is absent.
 * Meta error codes 10/100/190, missing search results, and inaccessible URLs
 * are NOT proof of deletion. This only archives the local record; no Graph DELETE.
 */
export async function confirmFacebookDeletedExternally(postId:string):Promise<{ok:boolean;message:string}>{
 const user=await requireRole(["admin","owner"]);
 const db=await createSupabaseServerClient();
 const {data:post,error}=await db.from("social_posts")
   .select("status,facebook_post_id,facebook_page_id,facebook_deleted_at")
   .eq("id",postId).eq("author_id",user.user.id).single();
 if(error||!post||post.facebook_page_id!==PAGE_ID||!post.facebook_post_id||
    post.facebook_deleted_at||!["posted","scheduled"].includes(post.status)||
    !(/^284090174797562_[0-9]+$/.test(post.facebook_post_id)||/^[0-9]+$/.test(post.facebook_post_id)))
   return {ok:false,message:"此筆沒有可確認的 Facebook 原文紀錄，或已經封存。"};
 const {data:updated,error:updateError}=await db.from("social_posts").update({
   status:"archived",
   facebook_deleted_at:new Date().toISOString(),
   facebook_error:"Facebook 端已刪除（管理者人工核對；非 Meta API 自動判定）",
   updated_at:new Date().toISOString()
 }).eq("id",postId).eq("author_id",user.user.id).eq("status",post.status)
   .eq("facebook_post_id",post.facebook_post_id).is("facebook_deleted_at",null)
   .select("id").maybeSingle();
 if(updateError||!updated)return {ok:false,message:"紀錄已變更或更新失敗，請重新整理後確認。"};
 revalidatePath("/admin/social-posts");
 return {ok:true,message:"已標記為「Facebook 端已刪除」，並保留原始貼文 ID、文案與發布紀錄；沒有向 Facebook 發送刪除要求。"};
}
