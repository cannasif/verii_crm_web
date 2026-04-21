export interface ReportSummary {
  widgetCount: number;
  chartTypes: string[];
  status: string;
  version: number;
  publishedAt?: string;
  releaseNote?: string;
  category?: string;
  tags: string[];
  audience?: string;
  refreshCadence?: string;
  favorite: boolean;
  sharedWith: string[];
  subscriptionEnabled: boolean;
  subscriptionChannel?: string;
  subscriptionFrequency?: string;
  owner?: string;
  certified: boolean;
  lastReviewedAt?: string;
}

export function getReportSummary(configJson: string): ReportSummary {
  try {
    const parsed = JSON.parse(configJson) as {
      chartType?: string;
      widgets?: Array<{ chartType?: string }>;
      lifecycle?: { status?: string; version?: number; publishedAt?: string; releaseNote?: string };
      governance?: {
        category?: string;
        tags?: string[];
        audience?: string;
        refreshCadence?: string;
        favorite?: boolean;
        sharedWith?: string[];
        subscriptionEnabled?: boolean;
        subscriptionChannel?: string;
        subscriptionFrequency?: string;
        owner?: string;
        certified?: boolean;
        lastReviewedAt?: string;
      };
    };
    const widgets = Array.isArray(parsed.widgets) ? parsed.widgets : [];
    const chartTypes = widgets.length > 0
      ? widgets.map((widget) => widget.chartType).filter((value): value is string => Boolean(value))
      : parsed.chartType
        ? [parsed.chartType]
        : [];

    return {
      widgetCount: widgets.length > 0 ? widgets.length : 1,
      chartTypes: [...new Set(chartTypes)],
      status: parsed.lifecycle?.status ?? 'draft',
      version: parsed.lifecycle?.version ?? 1,
      publishedAt: parsed.lifecycle?.publishedAt,
      releaseNote: parsed.lifecycle?.releaseNote,
      category: parsed.governance?.category,
      tags: parsed.governance?.tags ?? [],
      audience: parsed.governance?.audience,
      refreshCadence: parsed.governance?.refreshCadence,
      favorite: parsed.governance?.favorite ?? false,
      sharedWith: parsed.governance?.sharedWith ?? [],
      subscriptionEnabled: parsed.governance?.subscriptionEnabled ?? false,
      subscriptionChannel: parsed.governance?.subscriptionChannel,
      subscriptionFrequency: parsed.governance?.subscriptionFrequency,
      owner: parsed.governance?.owner,
      certified: parsed.governance?.certified ?? false,
      lastReviewedAt: parsed.governance?.lastReviewedAt,
    };
  } catch {
    return {
      widgetCount: 1,
      chartTypes: [],
      status: 'draft',
      version: 1,
      tags: [],
      favorite: false,
      sharedWith: [],
      subscriptionEnabled: false,
      certified: false,
    };
  }
}
