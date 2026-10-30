"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PAGE_ID = "284090174797562";
const API_VERSION = "v26.0";
function getPageToken() {
  // Preview-only server secret. NEVER use NEXT_PUBLIC or log the credential.
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (process.env.FACEBOOK_PUBLISH_ENABLED !== "true" || !token) {
    throw new Error("Facebook 尚未完成 Preview 伺服器端授權設定；沒有送出貼文。");
  }
  return token;
}
async function callFacebook(method: "POST" | "DELETE", route: string, token: string, body?: URLSearchParams) {
  const response = await fetch("https://graph.facebook.com/" + API_VERSION + "/" + route, {
    method, headers: {
      Authorization: "Bearer " + token,
      ...(body ? {"Content-Type":"application/x-www-form-urlencoded"} : {})
    }, body: body?.toString(), cache:"no-store"
  });
  const result = await response.json() as {id?:string;success?:boolean;error?:{code?:number;message?:string}};
  if (!response.ok || result.error) throw new Error("Facebook API 未完成操作：" + (result.error?.code || response.status));
  return result;
}
export async function publishFacebookPost(id: string) {
  const current = await requireRole(["editor","admin","owner"]);
  const token = getPageToken();
  const db = await createSupabaseServerClient();
  const {data: post, error} = await db.from("social_posts").select("id,body,link_url,status,facebook_post_id")
    .eq("id",id).eq("author_id",current.user.id).single();
  if (error || !post || !post.body.trim() || post.facebook_post_id || !["draft","ready"].includes(post.status)) {
    throw new Error("貼文無法發布：內容為空、狀態不正確或已發布。");
  }
  // Claim before calling Facebook to reduce accidental double posting.
  const {data: claimed,error: claimError} = await db.from("social_posts").update({status:"publishing",updated_at:new Date().toISOString()})
    .eq("id",id).eq("author_id",current.user.id).eq("status",post.status).is("facebook_post_id",null).select("id").maybeSingle();
  if (claimError || !claimed) throw new Error("貼文正在處理中，請勿重複送出。");
  let result: {id?:string};
  try {
    const body = new URLSearchParams({message:post.body});
    if (post.link_url) body.set("link",post.link_url);
    result = await callFacebook("POST",PAGE_ID+"/feed",token,body);
  } catch {
    // Unknown outcome: never automatically retry POST (could duplicate a successful publish).
    await db.from("social_posts").update({status:"publish_unknown",facebook_error:"請先到 Facebook 核對是否已發文；禁止直接重試。"})
      .eq("id",id).eq("author_id",current.user.id).eq("status","publishing");
    revalidatePath("/admin/social-posts");
    throw new Error("Facebook 回應未確認。請檢查粉專是否已有貼文，再處理，不要重複發布。");
  }
  if (!result.id || !result.id.startsWith(PAGE_ID+"_")) throw new Error("Facebook 未回傳預期貼文編號，請人工確認。");
  const {error: updateError} = await db.from("social_posts").update({
    status:"posted",facebook_post_id:result.id,facebook_page_id:PAGE_ID,
    facebook_published_at:new Date().toISOString(),facebook_error:null,posted_at:new Date().toISOString()
  }).eq("id",id).eq("author_id",current.user.id).eq("status","publishing");
  if (updateError) throw new Error("Facebook 已發文，但後台紀錄更新失敗；請勿重送。");
  revalidatePath("/admin/social-posts");
}
export async function deleteFacebookPost(id: string) {
  const current = await requireRole(["admin","owner"]);
  const token = getPageToken();
  const db = await createSupabaseServerClient();
  const {data:post,error} = await db.from("social_posts").select("facebook_post_id,facebook_page_id,facebook_deleted_at")
    .eq("id",id).eq("author_id",current.user.id).single();
  if(error || !post || post.facebook_page_id!==PAGE_ID || !post.facebook_post_id ||
     post.facebook_deleted_at || !/^284090174797562_[0-9]+$/.test(post.facebook_post_id)) throw new Error("無法刪除：缺少有效的粉專貼文紀錄。");
  let result: {success?:boolean};
  try {
    result = await callFacebook("DELETE",post.facebook_post_id,token);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("190")) return {ok:false,message:"Facebook 粉專權杖無效或已過期（190）。請更新 Preview 的 Page Token，並確認原文還在；尚未刪除，也不會更改後台紀錄。"};
    return {ok:false,message:"Facebook 刪文未確認成功。請先至粉專核對原文狀態，再檢查 Cloudflare 後端錯誤；後台紀錄未更改。"};
  }
  if (result.success !== true) return {ok:false,message:"Facebook 沒有確認刪除成功，請先核對原文。"};
  const {error:updateError}=await db.from("social_posts").update({
    status:"archived",facebook_deleted_at:new Date().toISOString(),updated_at:new Date().toISOString()
  }).eq("id",id).eq("author_id",current.user.id);
  if(updateError) return {ok:false,message:"Facebook 已刪除，但後台紀錄更新失敗；請勿重複刪除，需人工核對紀錄。"};
  revalidatePath("/admin/social-posts");
  return {ok:true,message:"Facebook 原文已刪除，後台紀錄已更新。"};
}

export async function scheduleFacebookPost(id:string, scheduledLocal:string) {
  const current=await requireRole(["editor","admin","owner"]);
  const ms=Date.parse(scheduledLocal);
  if(!Number.isFinite(ms) || ms-Date.now()<11*60*1000 || ms-Date.now()>29*24*3600*1000) {
    return {ok:false,message:"請選擇至少 11 分鐘後、29 天內的預約時間（使用台灣時間）。"};
  }
  const token=getPageToken();
  const db=await createSupabaseServerClient();
  const {data:post,error}=await db.from("social_posts").select("id,body,link_url,status,facebook_post_id")
    .eq("id",id).eq("author_id",current.user.id).single();
  if(error || !post || (!post.body?.trim()&&!post.link_url) || post.facebook_post_id || !["draft","ready"].includes(post.status))
    return {ok:false,message:"此草稿不符合預約條件，或已送出。"};
  const {data:claim,error:claimError}=await db.from("social_posts").update({status:"publishing",updated_at:new Date().toISOString()})
    .eq("id",id).eq("author_id",current.user.id).eq("status",post.status).is("facebook_post_id",null).select("id").maybeSingle();
  if(claimError || !claim)return {ok:false,message:"這篇草稿已在處理，請勿重複預約。"};
  let fb:{id?:string};
  try{
    const body=new URLSearchParams({message:post.body||"",published:"false",
      scheduled_publish_time:String(Math.floor(ms/1000))});
    if(post.link_url)body.set("link",post.link_url);
    fb=await callFacebook("POST",PAGE_ID+"/feed",token,body);
  }catch{
    await db.from("social_posts").update({status:"publish_unknown",facebook_error:"預約結果待核對，禁止直接重試"})
      .eq("id",id).eq("author_id",current.user.id).eq("status","publishing");
    revalidatePath("/admin/social-posts");
    return {ok:false,message:"Meta 預約結果不明，請先到粉專排程區核對，勿重複送出。"};
  }
  if(!fb.id || !fb.id.startsWith(PAGE_ID+"_"))return {ok:false,message:"未取得 Meta 排程貼文 ID，請人工核對。"};
  const {error:updateError}=await db.from("social_posts").update({status:"scheduled",facebook_post_id:fb.id,
    facebook_page_id:PAGE_ID,facebook_scheduled_for:new Date(ms).toISOString(),facebook_error:null,
    updated_at:new Date().toISOString()}).eq("id",id).eq("author_id",current.user.id).eq("status","publishing");
  if(updateError)return {ok:false,message:"Meta 可能已預約成功，但後台儲存失敗，請勿再次預約。"};
  revalidatePath("/admin/social-posts");
  return {ok:true,message:"Facebook 已接受預約發文，請到粉專排程區確認。"};
}
