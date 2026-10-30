"use server";
import {revalidatePath} from "next/cache";
import {requireRole} from "@/lib/auth";
import {createSupabaseServerClient} from "@/lib/supabase/server";

const MIME:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
export async function uploadSocialPostImage(id:string,formData:FormData):Promise<{ok:boolean;message:string}>{
 const user=await requireRole(["editor","admin","owner"]);
 const file=formData.get("image");
 if(!(file instanceof File)||!MIME[file.type]||file.size<=0||file.size>5*1024*1024)
  return {ok:false,message:"請選擇 5MB 以下的 JPG、PNG 或 WebP 圖片。"};
 const db=await createSupabaseServerClient();
 const {data:post}=await db.from("social_posts").select("id,status").eq("id",id).eq("author_id",user.user.id).single();
 if(!post||!["draft","ready"].includes(post.status))return {ok:false,message:"只能為自己的未發布草稿新增圖片。"};
 const {data:existing,error:listError}=await db.from("social_post_images").select("id").eq("post_id",id);
 if(listError)return {ok:false,message:"圖片資料表尚未就緒。"};
 if((existing?.length||0)>=10)return {ok:false,message:"每篇貼文最多 10 張圖片。"};
 const buffer=new Uint8Array(await file.arrayBuffer());
 const valid=file.type==="image/jpeg"?(buffer[0]===255&&buffer[1]===216&&buffer[2]===255):
 file.type==="image/png"?(buffer[0]===137&&buffer[1]===80&&buffer[2]===78&&buffer[3]===71):
 (buffer[0]===82&&buffer[1]===73&&buffer[2]===70&&buffer[3]===70&&buffer[8]===87&&buffer[9]===69&&buffer[10]===66&&buffer[11]===80);
 if(!valid)return {ok:false,message:"圖片內容與檔案格式不一致。"};
 const path=user.user.id+"/"+id+"/"+crypto.randomUUID()+"."+MIME[file.type];
 const {error:storageError}=await db.storage.from("social-post-images").upload(path,buffer,{contentType:file.type,cacheControl:"3600",upsert:false});
 if(storageError)return {ok:false,message:"圖片儲存失敗，請檢查 Preview 儲存空間權限。"};
 const {error:recordError}=await db.from("social_post_images").insert({post_id:id,owner_id:user.user.id,storage_path:path,position:existing?.length||0});
 if(recordError){await db.storage.from("social-post-images").remove([path]);return {ok:false,message:"圖片紀錄未儲存。"};}
 revalidatePath("/admin/social-posts");
 return {ok:true,message:"圖片已上傳至測試素材庫；尚未公開發布到 Facebook。"};
}
