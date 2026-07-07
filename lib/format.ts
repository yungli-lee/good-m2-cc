export function formatPrice(value?: number | null) {
  if (!value) return "洽詢";
  return `${value.toLocaleString("zh-TW")} 萬元`;
}

export function formatPing(value?: number | null) {
  if (value == null) return "-";
  return `${Number(value).toLocaleString("zh-TW", { maximumFractionDigits: 3 })} 坪`;
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return formatTaipeiDateTime(value);
}

export function formatTaipeiDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Taipei"
  }).format(date);
}

export function formatTaipeiDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeZone: "Asia/Taipei"
  }).format(date);
}

export function toTaipeiDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function taipeiDateTimeLocalToUtcIso(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(normalized)) return null;
  const date = new Date(`${normalized}+08:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function propertyTypeLabel(value: string) {
  const labels: Record<string, string> = {
    townhouse: "房屋",
    apartment: "公寓",
    building: "大廈",
    land: "土地",
    farmland: "農林漁牧地",
    building_land: "建地",
    industrial_land: "工業用地",
    storefront: "店面",
    factory: "廠房",
    other: "其他"
  };
  return labels[value] || value;
}
