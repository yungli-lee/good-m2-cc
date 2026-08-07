export const analyticsRangePresets = ["today", "7d", "30d", "90d"] as const;

export type AnalyticsRangePreset = (typeof analyticsRangePresets)[number];
export type DashboardEnvironment = "production" | "preview";

export type AnalyticsPeriod = {
  start: string;
  end: string;
  previousStart: string;
  previousEnd: string;
};

export type SummaryMetric = {
  current: number;
  previous: number;
  changePercent: number | null;
  numerator?: number;
  denominator?: number;
};

export type AnalyticsSummary = {
  range: AnalyticsRangePreset;
  timezone: "Asia/Taipei";
  environment: DashboardEnvironment;
  period: AnalyticsPeriod;
  metrics: {
    visitors: SummaryMetric;
    sessions: SummaryMetric;
    propertyViews: SummaryMetric;
    lineClicks: SummaryMetric;
    phoneClicks: SummaryMetric;
    inquiries: SummaryMetric;
    inquiryConversionRate: SummaryMetric;
  };
  meta: {
    generatedAt: string;
    lowData: boolean;
  };
};

export type TrendGranularity = "hour" | "day";

export type AnalyticsTrendPoint = {
  bucket: string;
  bucketStart: string;
  visitors: number;
  propertyViews: number;
  inquiries: number;
};

export type AnalyticsTrend = {
  range: AnalyticsRangePreset;
  timezone: "Asia/Taipei";
  environment: DashboardEnvironment;
  granularity: TrendGranularity;
  series: AnalyticsTrendPoint[];
  meta: {
    generatedAt: string;
    lowData: boolean;
  };
};

export type SourcePerformanceRow = {
  source: string;
  medium: string;
  campaign: string;
  visitors: number;
  sessions: number;
  propertyViews: number;
  lineClicks: number;
  phoneClicks: number;
  inquiries: number;
  conversionRate: number | null;
};

export type AnalyticsSources = {
  range: AnalyticsRangePreset;
  timezone: "Asia/Taipei";
  environment: DashboardEnvironment;
  rows: SourcePerformanceRow[];
  meta: {
    generatedAt: string;
    lowData: boolean;
    attributionModel: "event_source";
  };
};

export type PropertyPerformanceRow = {
  propertyId: string;
  title: string | null;
  slug: string | null;
  status: string | null;
  firstPublishedAt: string | null;
  views: number;
  visitors: number;
  sessions: number;
  mediaViews: number;
  lineClicks: number;
  phoneClicks: number;
  shares: number;
  mapOpens: number;
  inquiryStarts: number;
  inquiries: number;
  viewInquiryConversionRate: number | null;
  ctaRate: number | null;
};

export type AnalyticsProperties = {
  range: AnalyticsRangePreset;
  timezone: "Asia/Taipei";
  environment: DashboardEnvironment;
  rows: PropertyPerformanceRow[];
  meta: { generatedAt: string; sampleGuardViews: 5 };
};

export type PropertyInsightSignal = "HIGH_VIEW_LOW_INQUIRY" | "HIGH_VIEW_LOW_CTA" | "HIGH_CTA_NO_INQUIRY";
export type PropertyInsightSeverity = "high" | "medium";

export type LowConversionInsight = {
  property: PropertyPerformanceRow;
  reasonCode: "HIGH_VIEWS_LOW_CONVERSION" | "HIGH_CTA_ZERO_INQUIRY";
  signal: PropertyInsightSignal;
  severity: PropertyInsightSeverity;
  reason: string;
  cohortSize: number;
  minimumViews: number;
  viewPercentileThreshold: number;
  conversionPercentileThreshold: number;
};

export type AnalyticsInsights = {
  range: AnalyticsRangePreset;
  timezone: "Asia/Taipei";
  environment: DashboardEnvironment;
  rows: LowConversionInsight[];
  thresholds: {
    minimumPublishedDays: number;
    minimumCohortSize: number;
    configuredMinimumViews: number;
    effectiveMinimumViews: number | null;
    viewPercentileThreshold: number | null;
    conversionPercentileThreshold: number | null;
  };
  meta: { generatedAt: string; insufficientCohort: boolean };
};
