"use server";
import { requireRole } from "@/lib/auth";
import { resolveFacebookPageToken, FACEBOOK_PAGE_ID } from "./facebook-page-token";

export async function checkFacebookPageConnection(): Promise<{ok:boolean;message:string}> {
  await requireRole(["admin","owner"]);
  try {
    await resolveFacebookPageToken();
    return {ok:true,message:"粉專連線正常：阿勇不動產顧問（"+FACEBOOK_PAGE_ID+"）。已驗證實際使用的 Page Access Token 身分；不會發文或刪文。"};
  } catch (error) {
    return {ok:false,message:error instanceof Error ? error.message : "Facebook 粉專驗證失敗，未送出貼文。"};
  }
}
