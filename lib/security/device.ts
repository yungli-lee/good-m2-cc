export function summarizeDevice(userAgent: string) {
  if (!userAgent.trim()) return "Unknown device";

  const browser = detectBrowser(userAgent);
  const device = detectDevice(userAgent);

  if (!browser || !device) return "Unknown device";
  return `${device} / ${browser}`;
}

function detectDevice(userAgent: string) {
  if (/ipad/i.test(userAgent) || (/macintosh/i.test(userAgent) && /mobile/i.test(userAgent))) return "iPad";
  if (/iphone/i.test(userAgent)) return "iPhone";
  if (/android/i.test(userAgent)) return "Android";
  if (/windows/i.test(userAgent)) return "Windows";
  if (/mac os x|macintosh/i.test(userAgent)) return "Mac";
  return null;
}

function detectBrowser(userAgent: string) {
  if (/edg\//i.test(userAgent)) return "Edge";
  if (/chrome|crios/i.test(userAgent) && !/edg\//i.test(userAgent)) return "Chrome";
  if (/safari/i.test(userAgent) && !/chrome|crios|android/i.test(userAgent)) return "Safari";
  if (/firefox|fxios/i.test(userAgent)) return "Firefox";
  return null;
}
