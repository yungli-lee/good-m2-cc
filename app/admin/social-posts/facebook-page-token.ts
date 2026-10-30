const PAGE_ID = "284090174797562";
const GRAPH = "https://graph.facebook.com/v26.0";

type MetaResult = {
  id?: string;
  name?: string;
  access_token?: string;
  error?: { code?: number; error_subcode?: number };
};

export class FacebookAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FacebookAuthError";
  }
}

export function configuredFacebookToken(): string {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (process.env.FACEBOOK_PUBLISH_ENABLED !== "true" || !token) {
    throw new FacebookAuthError("Preview 尚未啟用 Facebook 發布，或缺少伺服器端權杖。");
  }
  return token;
}

async function inspectToken(token: string, route: string): Promise<MetaResult> {
  let response: Response;
  try {
    response = await fetch(GRAPH + "/" + route, {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
      signal: AbortSignal.timeout(10000)
    });
  } catch {
    throw new FacebookAuthError("Meta 身分驗證連線失敗，未送出貼文。");
  }
  let result: MetaResult;
  try {
    result = await response.json() as MetaResult;
  } catch {
    throw new FacebookAuthError("Meta 身分驗證回應無法解析，未送出貼文。");
  }
  if (!response.ok || result.error) {
    const code = result.error?.code ?? response.status;
    const subcode = result.error?.error_subcode;
    throw new FacebookAuthError("Meta 身分驗證失敗（HTTP " + response.status +
      "，API " + code + (subcode ? "，子碼 " + subcode : "") + "），未送出貼文。");
  }
  return result;
}

/**
 * Accept a direct Page token or a system-user token assigned to this Page.
 * Never send a post until /me confirms the effective credential is the Page.
 * The credential is kept entirely server-side and never logged or returned.
 */
export async function resolveFacebookPageToken(): Promise<string> {
  const token = configuredFacebookToken();
  const identity = await inspectToken(token, "me?fields=id,name");
  if (identity.id === PAGE_ID) return token;

  // A system-user token is not itself a Page token. Request the Page's
  // access_token using the system user's assigned Page permissions.
  const page = await inspectToken(token, PAGE_ID + "?fields=id,name,access_token");
  if (page.id !== PAGE_ID || !page.access_token) {
    throw new FacebookAuthError("目前權杖不是指定粉專，且無法取得該粉專的 Page Access Token。請確認系統使用者已獲指派粉專「內容」權限；未送出貼文。");
  }
  const pageIdentity = await inspectToken(page.access_token, "me?fields=id,name");
  if (pageIdentity.id !== PAGE_ID) {
    throw new FacebookAuthError("取得的 Page Access Token 身分不符，未送出貼文。");
  }
  return page.access_token;
}

export const FACEBOOK_PAGE_ID = PAGE_ID;
