const moneyFormatter = new Intl.NumberFormat("zh-TW", {
  maximumFractionDigits: 0
});

export function formatTwd(value: number) {
  return `$${moneyFormatter.format(Math.round(value))}`;
}

export function formatWan(value: number) {
  return `${moneyFormatter.format(Math.round(value))} 萬`;
}

export function formatWanDecimal(value: number) {
  return `${new Intl.NumberFormat("zh-TW", {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1
  }).format(value)} 萬`;
}
