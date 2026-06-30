export function formatPrice(value?: number | null) {
  if (!value) return "洽詢";
  if (value >= 10000) return `${Math.round(value / 10000).toLocaleString("zh-TW")} 萬`;
  return `${value.toLocaleString("zh-TW")} 元`;
}

export function formatPing(value?: number | null) {
  if (value == null) return "-";
  return `${Number(value).toLocaleString("zh-TW", { maximumFractionDigits: 3 })} 坪`;
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Taipei"
  }).format(new Date(value));
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
