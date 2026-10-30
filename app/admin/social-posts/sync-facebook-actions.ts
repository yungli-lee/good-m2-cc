"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FACEBOOK_PAGE_ID, resolveFacebookPageToken } from "./facebook-page-token";

type SyncResult = {ok:boolean;message:string;needsManualReview?:boolean};
type GraphPost = {
  id?:string;
  is_published?:boolean;
  error?:{code?:number;error_subcode?:number};
};

/**
 * A successful publish and a later status check are different operations.
 * Never infer deletion from a Graph API failure (including error 10 or 100).
 */
export async function syncFacebookPostStatus(postId:string):Promise<SyncResult> {
  const user=await requireRole(["editor","admin","owner"]);
  const db=await createSupabaseServerClient();
  const {data:post,error}=await db.from("social_posts")
    .select("id,status,facebook_post_id,facebook_page_id,facebook_deleted_at")
    .eq("id",postId).eq("author_id",user.user.id).single();
  if(error||!post||post.facebook_page_id!==FACEBOOK_PAGE_ID||!post.facebook_post_id||post.facebook_deleted_at)
    return {ok:false,message:"沒有可同步的 Facebook 貼文紀錄。"};

  // The configured credential may be a system-user token, not a Page token.
  // Publishing already resolves this; status sync must use the same identity.
  let token:string;
  try {
    token=await resolveFacebookPageToken();
  } catch {
    return {ok:false,message:"無法取得有效的粉專 Page Access Token；原有狀態不變，請先執行粉專連線檢查。"};
  }

  let response:Response;
  try {
    response=await fetch(
      "https://graph.facebook.com/v26.0/"+encodeURIComponent(post.facebook_post_id)+"?fields=id,is_published",
      {headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(10000)}
    );
  } catch {
    return {ok:false,message:"暫時無法連線 Facebook；原有狀態不變。"};
  }

  let data:GraphPost;
  try {
    data=await response.json() as GraphPost;
  } catch {
    return {ok:false,message:"Meta 回應格式異常；原有狀態不變。"};
  }
  if(!response.ok||data.error) {
    const code=data.error?.code??response.status;
    const subcode=data.error?.error_subcode;
    const detail="（HTTP "+response.status+"，API "+code+(subcode?", 子碼 "+subcode:"")+"）";
    return {ok:false,needsManualReview:code===10 || code===100 || code===200,message:
      code===190
        ? "Facebook 授權失效"+detail+"；原有狀態不變。"
        : code===10 || code===200
          ? "Meta 拒絕讀取貼文"+detail+"；請檢查 Page Token 的讀取權限，不能推定貼文已刪除。"
          : "Meta 無法確認貼文"+detail+"；原有狀態不變，不能推定已刪除。"
    };
  }
  if(data.id!==post.facebook_post_id)
    return {ok:false,message:"Facebook 回傳的貼文 ID 不符；原有狀態不變。"};

  if(data.is_published===true&&post.status==="scheduled") {
    const {error:updateError}=await db.from("social_posts").update({
      status:"posted",facebook_published_at:new Date().toISOString(),updated_at:new Date().toISOString()
    }).eq("id",postId).eq("author_id",user.user.id).eq("status","scheduled")
      .eq("facebook_post_id",post.facebook_post_id);
    if(updateError)return {ok:false,message:"Facebook 已公開發布，但後台更新失敗。"};
    revalidatePath("/admin/social-posts");
    return {ok:true,message:"已確認 Facebook 貼文存在且公開發布，後台更新為「已發布」。"};
  }
  if(data.is_published===false&&post.status==="scheduled")
    return {ok:true,message:"已確認 Facebook 貼文存在，但尚未公開；保留「已預約」。"};
  return {ok:true,message:"已確認 Facebook 貼文存在；原有狀態維持不變。"};
}

/**
 * An administrator explicitly confirms a post was already deleted in Meta.
 * This does NOT call the Graph DELETE endpoint. It only archives the local
 * record, preserving the original Facebook ID for audit/history.
 */
export async function confirmFacebookPostDeletedManually(postId:string, confirmation:string):Promise<SyncResult> {
  const user=await requireRole(["admin","owner"]);
  if(confirmation!=="確認已刪除")
    return {ok:false,message:"請先在 Facebook／Meta Business Suite 確認原文已刪除，再輸入指定確認文字。"};
  const db=await createSupabaseServerClient();
  const {data:post,error}=await db.from("social_posts")
    .select("id,facebook_post_id,facebook_page_id,facebook_deleted_at,status")
    .eq("id",postId).eq("author_id",user.user.id).single();
  if(error||!post||post.facebook_page_id!==FACEBOOK_PAGE_ID||!post.facebook_post_id)
    return {ok:false,message:"沒有可核對的 Facebook 貼文紀錄。"};
  if(post.facebook_deleted_at)
    return {ok:true,message:"這篇貼文已經標記為 Facebook 已刪除，無需重複處理。"};
  if(!/^284090174797562_[0-9]+$/.test(post.facebook_post_id))
    return {ok:false,message:"Facebook 貼文 ID 格式不符，請人工核對。"};
  const now=new Date().toISOString();
  const {data:updated,error:updateError}=await db.from("social_posts").update({
    status:"archived",
    facebook_deleted_at:now,
    facebook_error:"由後台管理者人工確認 Facebook 原文已刪除（非 API 刪文）",
    updated_at:now
  }).eq("id",postId).eq("author_id",user.user.id)
    .eq("facebook_post_id",post.facebook_post_id)
    .is("facebook_deleted_at",null).select("id").maybeSingle();
  if(updateError)return {ok:false,message:"Facebook 原文人工確認已送出，但後台資料更新失敗；請重新整理後核對。"};
  if(!updated)return {ok:false,message:"貼文狀態已被其他操作更新，請重新整理後再確認。"};
  revalidatePath("/admin/social-posts");
  return {ok:true,message:"已依人工確認標記 Facebook 原文已刪除，後台清單將隱藏；歷史資料保留。"};
}
