import type { AnalyticsRangePreset, LowConversionInsight, PropertyInsightSeverity, PropertyPerformanceRow } from "./contracts.ts";

export const MIN_PROPERTY_PUBLISHED_DAYS = 14;
export const MIN_INSIGHT_COHORT_SIZE = 5;
export const MIN_PROPERTY_VIEWS: Record<AnalyticsRangePreset, number> = { today: 5, "7d": 10, "30d": 20, "90d": 50 };

function percentile(values: number[], fraction: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(fraction * sorted.length) - 1)];
}

function taipeiCalendarDay(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value);
  return Date.UTC(part("year"), part("month") - 1, part("day"));
}

export function publishedDays(publishedAt: string, now = new Date()) {
  return Math.floor((taipeiCalendarDay(now) - taipeiCalendarDay(publishedAt)) / 86_400_000);
}

function severity(row: PropertyPerformanceRow): PropertyInsightSeverity {
  return row.inquiries === 0 && row.lineClicks + row.phoneClicks === 0 ? "high" : "medium";
}

function compareInsights(a: LowConversionInsight, b: LowConversionInsight) {
  const rank = { high: 0, medium: 1 } as const;
  return rank[a.severity] - rank[b.severity] || b.property.views - a.property.views || b.property.visitors - a.property.visitors || a.property.propertyId.localeCompare(b.property.propertyId);
}

export function classifyLowConversionInsights(rows: PropertyPerformanceRow[], range: AnalyticsRangePreset, now = new Date()) {
  const cohort = rows.filter((row) => row.status === "published" && Boolean(row.firstPublishedAt) && publishedDays(row.firstPublishedAt!, now) >= MIN_PROPERTY_PUBLISHED_DAYS && row.views > 0);
  const configuredMinimumViews = MIN_PROPERTY_VIEWS[range];
  if (cohort.length < MIN_INSIGHT_COHORT_SIZE) return {
    rows: [] as LowConversionInsight[],
    thresholds: { minimumPublishedDays: MIN_PROPERTY_PUBLISHED_DAYS, minimumCohortSize: MIN_INSIGHT_COHORT_SIZE, configuredMinimumViews, effectiveMinimumViews: null, viewPercentileThreshold: null, conversionPercentileThreshold: null },
    insufficientCohort: true
  };
  const p25Views = percentile(cohort.map((row) => row.views), 0.25)!;
  const p75Views = percentile(cohort.map((row) => row.views), 0.75)!;
  const p25Conversion = percentile(cohort.map((row) => row.viewInquiryConversionRate ?? 0), 0.25)!;
  const p25Cta = percentile(cohort.map((row) => row.ctaRate ?? 0), 0.25)!;
  const effectiveMinimumViews = Math.max(configuredMinimumViews, p25Views);
  const insights = cohort.flatMap((property): LowConversionInsight[] => {
    const conversion = property.viewInquiryConversionRate ?? 0;
    const popular = property.views >= effectiveMinimumViews && property.views >= p75Views;
    const lowInquiry = property.inquiries === 0 || conversion < p25Conversion;
    if (!popular || !lowInquiry) return [];
    const hasCta = property.lineClicks + property.phoneClicks > 0;
    const signal = hasCta && property.inquiries === 0 ? "HIGH_CTA_NO_INQUIRY" as const
      : (property.ctaRate ?? 0) <= p25Cta ? "HIGH_VIEW_LOW_CTA" as const : "HIGH_VIEW_LOW_INQUIRY" as const;
    const reasonCode = signal === "HIGH_CTA_NO_INQUIRY" ? "HIGH_CTA_ZERO_INQUIRY" as const : "HIGH_VIEWS_LOW_CONVERSION" as const;
    const reason = signal === "HIGH_CTA_NO_INQUIRY"
      ? `已有 ${property.lineClicks + property.phoneClicks} 次 LINE／電話互動，但尚未形成網站詢問，值得檢查。`
      : signal === "HIGH_VIEW_LOW_CTA"
        ? `有 ${property.views} 次瀏覽、${property.visitors} 位訪客，但 LINE／電話互動相對偏低，值得檢查。`
        : `有 ${property.views} 次瀏覽、${property.visitors} 位訪客，但詢問轉換低於同期間門檻，值得檢查。`;
    return [{ property, reasonCode, signal, severity: severity(property), reason, cohortSize: cohort.length, minimumViews: effectiveMinimumViews, viewPercentileThreshold: p75Views, conversionPercentileThreshold: p25Conversion }];
  }).sort(compareInsights);
  return {
    rows: insights,
    thresholds: { minimumPublishedDays: MIN_PROPERTY_PUBLISHED_DAYS, minimumCohortSize: MIN_INSIGHT_COHORT_SIZE, configuredMinimumViews, effectiveMinimumViews, viewPercentileThreshold: p75Views, conversionPercentileThreshold: p25Conversion },
    insufficientCohort: false
  };
}
