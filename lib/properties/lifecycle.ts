export const unpublishReasons = [
  "成交",
  "停止委託",
  "他仲專任",
  "屋主暫停出售",
  "價格因素",
  "資料待補",
  "法拍",
  "自用",
  "其他"
] as const;

export type UnpublishReason = (typeof unpublishReasons)[number];

export function normalizeUnpublishReason(reason: FormDataEntryValue | null, other: FormDataEntryValue | null) {
  const selected = String(reason || "").trim();
  if (!unpublishReasons.includes(selected as UnpublishReason)) return null;
  if (selected !== "其他") return selected;

  const otherReason = String(other || "").trim();
  return otherReason ? `其他：${otherReason.slice(0, 160)}` : null;
}

export function normalizeDeleteReason(value: FormDataEntryValue | null) {
  const reason = String(value || "").trim();
  return reason ? reason.slice(0, 240) : null;
}
