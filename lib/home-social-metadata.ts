import { absoluteHomeSocialFallback, validHomeSocialSetting } from "./home-social-image.ts";

export async function resolveHomeSocialImage(input: {
  load: () => Promise<unknown>;
  fallbackOrigin?: string;
  supabaseOrigin?: string | null;
  timeoutMs?: number;
}) {
  const fallback = absoluteHomeSocialFallback(input.fallbackOrigin);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), input.timeoutMs ?? 1500); });
    const value = await Promise.race([input.load(), timeout]);
    return validHomeSocialSetting(value, input.supabaseOrigin) || fallback;
  } catch {
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
