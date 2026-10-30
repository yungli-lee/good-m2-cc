"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PAGE_ID="284090174797562";
export async function syncFacebookPostStatus(postId:string):Promise<{ok:boolean;message:string}>{
  const user=await requireRole(["editor","admin","owner"]);
  const db=await createSupabaseServerClient();
  const {data:post,error}=await db.from("social_posts")
    .select("id,status,facebook_post_id,facebook_page_id,facebook_deleted_at")
    .eq("id",postId).eq("author_id",user.user.id).single();
  if(error||!post||post.facebook_page_id!==PAGE_ID||!post.facebook_post_id||post.facebook_deleted_at)
    return {ok:false,message:"沒有可同步的 Facebook 貼文紀錄。"};
  const token=process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if(!token)return {ok:false,message:"Preview 尚未設定 Facebook Page Token。"};
  let response:Response;
  try{
    response=await fetch("https://graph.facebook.com/v26.0/"+encodeURIComponent(post.facebook_post_id)+"?fields=id,is_published,updated_time,permalink_url",{
      headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(10000)
    });
  }catch{return {ok:false,message:"暫時無法連線 Facebook；原有狀態不變。"};}
  const data=await response.json() as {id?:string;is_published?:boolean;error?:{code?:number}};
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
