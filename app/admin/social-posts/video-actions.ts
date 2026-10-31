"use server";
import {revalidatePath} from "next/cache";
import {requireRole} from "@/lib/auth";
import {createSupabaseServerClient} from "@/lib/supabase/server";

const BUCKET="social-post-videos";
const MAX_BYTES=20*1024*1024;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function ownDraft(id:string){
 if(!UUID.test(id))throw new Error("草稿編號無效");
 const current=await requireRole(["editor","admin","owner"]);
 const db=await createSupabaseServerClient();
 const {data:post,error}=await db.from("social_posts").select("id,status")
  .eq("id",id).eq("author_id",current.user.id).single();
 if(error||!post||!["draft","ready"].includes(post.status))throw new Error("僅可修改自己的未發布草稿");
 return {db,uid:current.user.id};
}

export async function prepareSocialVideoUpload(id:string, filename:string, size:number, mime:string):
 Promise<{ok:boolean;message:string;url?:string;path?:string}>{
 if(mime!=="video/mp4"||!Number.isInteger(size)||size<1||size>MAX_BYTES||!filename.toLowerCase().endsWith(".mp4"))
  return {ok:false,message:"僅支援 20MB 以下的 MP4 影片"};
 const {db,uid}=await ownDraft(id);
 const {data:videos,error:videoError}=await db.from("social_post_videos").select("post_id").eq("post_id",id).limit(1);
 const {data:photos,error:photoError}=await db.from("social_post_images").select("id").eq("post_id",id).limit(1);
 if(videoError||photoError)return {ok:false,message:"媒體資料表尚未就緒，請先套用 Preview migration"};
 if(videos?.length||photos?.length)return {ok:false,message:"每篇僅限一段影片，且不能與圖片同篇上傳"};
 const path=uid+"/"+id+"/"+crypto.randomUUID()+".mp4";
 const {data,error}=await db.storage.from(BUCKET).createSignedUploadUrl(path);
 if(error||!data?.signedUrl)return {ok:false,message:"無法建立安全上傳連結，請確認 Preview bucket/RLS"};
 return {ok:true,message:"請開始上傳",url:data.signedUrl,path};
}

export async function confirmSocialVideoUpload(id:string,path:string):
 Promise<{ok:boolean;message:string}>{
 const {db,uid}=await ownDraft(id);
 if(!path.startsWith(uid+"/"+id+"/")||!/^([0-9a-f-]+)\.mp4$/i.test(path.split("/").pop()||""))
  return {ok:false,message:"影片路徑不符"};
 const folder=uid+"/"+id;
 const filename=path.slice(folder.length+1);
 const {data:files,error:listError}=await db.storage.from(BUCKET).list(folder,{limit:100,search:filename});
 const file=files?.find(f=>f.name===filename);
 const fileSize=Number(file?.metadata?.size||0);
 if(listError||!file||fileSize<1||fileSize>MAX_BYTES)
  return {ok:false,message:"未找到完整影片或影片大小不符，請勿發布"};
 const {data:photos,error:photoError}=await db.from("social_post_images").select("id").eq("post_id",id).limit(1);
 if(photoError||photos?.length)return {ok:false,message:"已有圖片，影片不能與圖片並存"};
 const {error:insertError}=await db.from("social_post_videos").insert({post_id:id,owner_id:uid,storage_path:path});
 if(insertError)return {ok:false,message:"影片紀錄未建立；請勿再次上傳，請管理者檢查"};
 revalidatePath("/admin/social-posts");
 return {ok:true,message:"影片已存入 Preview 草稿；尚未發布 Facebook。"};
}

export async function removeSocialVideoDraft(id:string):
 Promise<{ok:boolean;message:string}>{
 const {db}=await ownDraft(id);
 const {data:video,error}=await db.from("social_post_videos").select("storage_path").eq("post_id",id).maybeSingle();
 if(error)return {ok:false,message:"讀取影片失敗"};
 if(!video)return {ok:true,message:"目前沒有影片"};
 const {error:removeError}=await db.storage.from(BUCKET).remove([video.storage_path]);
 if(removeError)return {ok:false,message:"影片儲存空間刪除失敗，紀錄未更動"};
 const {error:dbError}=await db.from("social_post_videos").delete().eq("post_id",id);
 if(dbError)return {ok:false,message:"檔案已移除，但資料庫紀錄未更新，請管理者處理"};
 revalidatePath("/admin/social-posts");
 return {ok:true,message:"已移除草稿影片"};
}
