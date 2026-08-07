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
