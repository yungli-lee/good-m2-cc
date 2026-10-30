"use server";
import { requireRole } from "@/lib/auth";

const PAGE_ID = "284090174797562";
export async function checkFacebookPageConnection(): Promise<{ok:boolean;message:string}> {
  await requireRole(["admin","owner"]);
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (process.env.FACEBOOK_PUBLISH_ENABLED !== "true" || !token) {
    return {ok:false,message:"Preview 尚未啟用 Facebook 發布，或缺少伺服器端粉專權杖。"};
  }
  try {
    const response = await fetch("https://graph.facebook.com/v26.0/me?fields=id,name",{
      headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(8000)
    });
    const data = await response.json() as {id?:string;name?:string;error?:{code?:number;error_subcode?:number}};
    if (data.error?.code === 190) return {ok:false,message:"Facebook 授權已失效（190）。請由管理者更新 Preview 粉專權杖並重新部署；暫停發布與刪文。"};
    if (!response.ok || data.error) return {ok:false,message:"Facebook 無法驗證授權（API "+(data.error?.code || response.status)+"）。請至 Meta Debugger 檢查，勿重複發文。"};
    if (data.id !== PAGE_ID) return {ok:false,message:"權杖代表的不是「阿勇不動產顧問」，請勿發布或刪文。"};
    return {ok:true,message:"粉專連線正常：阿勇不動產顧問（"+PAGE_ID+"）。目前權杖可讀取粉專身分；實際發文仍依 Meta 授權狀態決定。"};
  } catch {
    return {ok:false,message:"目前無法連接 Facebook，可能為網路異常；請稍後再確認，勿連續發文。"};
  }
}
