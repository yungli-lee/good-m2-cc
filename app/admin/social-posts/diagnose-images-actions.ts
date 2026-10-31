"use server";
import {requireRole} from "@/lib/auth";
import {createSupabaseServerClient} from "@/lib/supabase/server";

export async function diagnoseSocialImages(id:string):Promise<{ok:boolean;message:string}>{
 const current=await requireRole(["editor","admin","owner"]);
 const db=await createSupabaseServerClient();
 const {data:post}=await db.from("social_posts").select("id").eq("id",id).eq("author_id",current.user.id).single();
 if(!post)return {ok:false,message:"無權檢查這篇草稿。"};
 const {data:images,error}=await db.from("social_post_images").select("storage_path").eq("post_id",id).limit(11);
 if(error)return {ok:false,message:"讀取圖片清單失敗（資料庫權限或連線）。"};
 if(!images?.length)return {ok:false,message:"此草稿沒有圖片。"};
 for(let i=0;i<images.length;i++){
   const {data}=db.storage.from("social-post-images").getPublicUrl(images[i].storage_path);
   let response:Response;
   try{response=await fetch(data.publicUrl,{method:"GET",headers:{Range:"bytes=0-31"},cache:"no-store",signal:AbortSignal.timeout(8000)})}
   catch{return {ok:false,message:"第 "+(i+1)+" 張圖片的公開網址無法連線，Meta 可能無法取得圖片。"}}
   const ct=response.headers.get("content-type")||"";
   if(!response.ok||!ct.startsWith("image/"))return {ok:false,message:"第 "+(i+1)+" 張圖片網址回應 "+response.status+"，格式 "+(ct.split(";")[0]||"未知")+"。請檢查公開讀取權限。"};
 }
 return {ok:true,message:"已檢查 "+images.length+" 張圖片：公開網址可取得圖片內容。這只能確認網站端可讀取，不能保證 Meta API 能成功下載或發布。"};
}
