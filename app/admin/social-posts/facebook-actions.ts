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
  const {data: post, error} = await db.from("social_posts").select("id,body,status,facebook_post_id")
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
  const result = await callFacebook("DELETE",post.facebook_post_id,token);
  if (result.success !== true) throw new Error("Facebook 尚未確認刪除成功。");
  const {error:updateError}=await db.from("social_posts").update({
    status:"archived",facebook_deleted_at:new Date().toISOString(),updated_at:new Date().toISOString()
  }).eq("id",id).eq("author_id",current.user.id);
  if(updateError) throw new Error("Facebook 已刪除，但後台紀錄更新失敗。");
  revalidatePath("/admin/social-posts");
}
