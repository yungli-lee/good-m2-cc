const moneyFormatter = new Intl.NumberFormat("zh-TW", {
  maximumFractionDigits: 0
});

export function formatTwd(value: number) {
  return `$${moneyFormatter.format(Math.round(value))}`;
}

export function formatWan(value: number) {
  return `${moneyFormatter.format(Math.round(value))} 萬`;
}
