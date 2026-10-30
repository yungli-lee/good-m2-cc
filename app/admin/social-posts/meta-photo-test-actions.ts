"use server";
import {requireRole} from "@/lib/auth";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {resolveFacebookPageToken} from "./facebook-page-token";
const PAGE="284090174797562";
export async function testMetaPhoto(id:string):Promise<{ok:boolean;message:string}>{
 const user=await requireRole(["admin","owner"]);
 let token:string;
 try{token=await resolveFacebookPageToken();}catch(e){return {ok:false,message:e instanceof Error?e.message:"粉專權杖驗證失敗"};}
 const db=await createSupabaseServerClient();
 const {data:post}=await db.from("social_posts").select("id").eq("id",id).eq("author_id",user.user.id).single();
 if(!post)return {ok:false,message:"無法讀取這篇貼文"};
 const {data:photos,error}=await db.from("social_post_images").select("storage_path").eq("post_id",id).order("position",{ascending:true}).limit(1);
 if(error||!photos?.length)return {ok:false,message:"沒有可測試的圖片"};
 const {data}=db.storage.from("social-post-images").getPublicUrl(photos[0].storage_path);
 const payload=new URLSearchParams({url:data.publicUrl,published:"false"});
 try{
  const res=await fetch("https://graph.facebook.com/v26.0/"+PAGE+"/photos",{
   method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/x-www-form-urlencoded"},
   body:payload.toString(),cache:"no-store",signal:AbortSignal.timeout(20000)
  });
  const raw=await res.json() as {id?:string;error?:{message?:string;code?:number;error_subcode?:number;type?:string}};
  if(!res.ok||raw.error)return {ok:false,message:"Meta 圖片 API 回應 "+res.status+"，錯誤碼 "+(raw.error?.code??"未知")+"，子碼 "+(raw.error?.error_subcode??"無")+"："+String(raw.error?.message||"無訊息").slice(0,300)};
  if(!raw.id)return {ok:false,message:"Meta 回應成功但沒有 Photo ID"};
  return {ok:true,message:"Meta 已接收未公開圖片。Photo ID："+raw.id+"。未建立公開貼文。"};
 }catch(e){return {ok:false,message:"Meta 圖片 API 連線失敗："+(e instanceof Error?e.name:"未知連線錯誤")};}
}
