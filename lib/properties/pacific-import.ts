const ALLOWED_HOSTS = new Set(["pacific.com.tw", "www.pacific.com.tw"]);

function decodeHtml(value: string) {
  const entities: Record<string, string> = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " "
  };
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => entities[name.toLowerCase()] ?? match);
}

function stripHtml(html: string) {
  return decodeHtml(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|li|tr|h[1-6]|section|article)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractMeta(html: string, key: string) {
  const patterns = [
    new RegExp('<meta[^>]+property=["\\\']' + key + '["\\\'][^>]+content=["\\\']([^"\\\']+)["\\\'][^>]*>', "i"),
    new RegExp('<meta[^>]+content=["\\\']([^"\\\']+)["\\\'][^>]+property=["\\\']' + key + '["\\\'][^>]*>', "i"),
    new RegExp('<meta[^>]+name=["\\\']' + key + '["\\\'][^>]+content=["\\\']([^"\\\']+)["\\\'][^>]*>', "i")
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]).trim();
  }
  return "";
}

function extractTitle(html: string) {
  const ogTitle = extractMeta(html, "og:title");
  if (ogTitle) return ogTitle;
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
  return decodeHtml(title.replace(/\s+/g, " ")).trim();
}

export function normalizePacificPropertyUrl(input: string) {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("網址格式不正確");
  }
  if (url.protocol !== "https:") throw new Error("僅支援 https 網址");
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) throw new Error("目前只支援太平洋房屋 pacific.com.tw");
  if (!url.pathname.toLowerCase().startsWith("/object/objectdetail/")) throw new Error("這不是太平洋房屋物件詳細頁網址");
  const saleId = url.searchParams.get("saleID") || url.searchParams.get("saleid");
  if (!saleId) throw new Error("網址缺少 saleID");
  url.hash = "";
  return url.toString();
}

export function extractPacificPropertyText(html: string, sourceUrl: string) {
  const title = extractTitle(html)
    .replace(/\s*[|｜-]\s*太平洋房屋.*$/i, "")
    .trim();
  const description = extractMeta(html, "description") || extractMeta(html, "og:description");
  const visibleText = stripHtml(html);

  const chunks = [
    title ? `案名：${title}` : "",
    description ? `推薦特色：${description}` : "",
    visibleText,
    `內部備註：來源網址：${sourceUrl}`
  ].filter(Boolean);

  return Array.from(new Set(chunks)).join("\n").slice(0, 50000);
}
