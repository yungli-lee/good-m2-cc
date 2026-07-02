export function normalizeEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

export function normalizePhone(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const hasLeadingPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  return hasLeadingPlus ? `+${digits}` : digits;
}

export function normalizeLineId(value: string | null | undefined) {
  const normalized = value?.trim().replace(/^@+/, "").toLowerCase();
  return normalized || null;
}
