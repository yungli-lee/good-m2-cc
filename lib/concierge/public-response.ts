/** Keep infrastructure HTML and parser details out of the public conversation. */
export async function readPublicJson<T>(response: Response, failureMessage: string): Promise<T> {
  try { return await response.json() as T; }
  catch { throw new Error(failureMessage); }
}

/** Chat is read-only, so one retry is safe; never use this for inquiry submissions. */
export async function requestChatJson<T>(url: string, init: RequestInit): Promise<{ response: Response; data: T }> {
  const message = "對話服務暫時忙碌，您的問題仍保留，請稍後重新送出，或直接加 LINE 諮詢。";
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(url, init);
    if ([502, 503, 504].includes(response.status) && attempt === 0) continue;
    try { return { response, data: await readPublicJson<T>(response, message) }; }
    catch (error) { if (attempt === 1) throw error; }
  }
  throw new Error(message);
}
