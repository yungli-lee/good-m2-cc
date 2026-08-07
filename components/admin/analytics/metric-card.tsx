import type { SummaryMetric } from "@/lib/analytics-dashboard/contracts";

type Props = {
  label: string;
  metric: SummaryMetric;
  rate?: boolean;
};

function formatValue(value: number, rate: boolean) {
  return rate ? new Intl.NumberFormat("zh-TW", { style: "percent", maximumFractionDigits: 1 }).format(value) : value.toLocaleString("zh-TW");
}

export function MetricCard({ label, metric, rate = false }: Props) {
  const change = metric.changePercent;
  const changeLabel = change === null ? "—" : `${change > 0 ? "+" : ""}${new Intl.NumberFormat("zh-TW", { style: "percent", maximumFractionDigits: 1 }).format(change)}`;
  return (
    <article className="analytics-metric-card">
      <p>{label}</p>
      <strong>{formatValue(metric.current, rate)}</strong>
      <dl>
        <div><dt>上一期</dt><dd>{formatValue(metric.previous, rate)}</dd></div>
        <div><dt>增減</dt><dd>{changeLabel}</dd></div>
      </dl>
      {rate ? <small>本期 {metric.numerator ?? 0} / {metric.denominator ?? 0} 位訪客</small> : null}
    </article>
  );
}
