export function formatKnowledgeReadingTime(body?: string | null) {
  const text = String(body || "").replace(/\s+/g, "");
  if (!text) return "1 分鐘";
  return `${Math.max(1, Math.ceil(text.length / 500))} 分鐘`;
}
