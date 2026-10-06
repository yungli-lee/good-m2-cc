// Search the customer's actual topic before broad real-estate keywords.
export function knowledgeTerms(message: string): string[] {
  if (/買房(?:之)?後|買屋(?:之)?後|買完房|交屋|入住|點交/.test(message)) return ["點交", "交屋", "過戶"];
  if (/農保|農民保險/.test(message)) return ["農保", "農地"];
  if (/貸款/.test(message)) return ["貸款"];
  if (/稅/.test(message)) return ["稅"];
  if (/斡旋/.test(message)) return ["斡旋"];
  if (/委託|賣房|出售/.test(message)) return ["委託"];
  if (/農地/.test(message)) return ["農地"];
  if (/買房|買屋/.test(message)) return ["買房"];
  return [];
}
export function knowledgeExcerpt(body: string | null | undefined): string {
  return String(body || "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ").replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\s+/g, " ").trim().slice(0, 2200);
}
