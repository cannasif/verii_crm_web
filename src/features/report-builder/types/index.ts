export type ChartType = 'table' | 'bar' | 'stackedBar' | 'line' | 'pie' | 'donut' | 'kpi' | 'matrix';
export type ReportLifecycleStatus = 'draft' | 'published' | 'archived';

export type DateGrouping = 'day' | 'week' | 'month' | 'year';

export type Aggregation = 'sum' | 'count' | 'avg' | 'min' | 'max';
export type DataSourceParameterBindingType = 'literal' | 'currentUserId' | 'currentUserEmail' | 'today' | 'now';
export type WidgetTone = 'neutral' | 'soft' | 'bold';
export type WidgetTableDensity = 'comfortable' | 'compact';
export type WidgetThemePreset = 'executive' | 'operations' | 'performance';
export type WidgetTitleAlign = 'left' | 'center';
export type WidgetKpiFormat = 'number' | 'currency' | 'percent';
export type WidgetBackgroundStyle = 'card' | 'glass' | 'gradient' | 'muted';
export type WidgetKpiLayout = 'split' | 'spotlight' | 'compact';
export type WidgetValueFormat = 'default' | 'number' | 'currency' | 'percent';
export type WidgetTableColumnAlign = 'left' | 'center' | 'right';
export type WidgetTableColumnWidth = 'auto' | 'sm' | 'md' | 'lg';
export type WidgetSeriesVisibilityMode = 'auto' | 'limited' | 'all';
export type WidgetSeriesOverflowMode = 'hide' | 'others';

export interface ReportWidgetTableColumnSetting {
  key: string;
  align?: WidgetTableColumnAlign;
  width?: WidgetTableColumnWidth;
  valueFormat?: WidgetValueFormat;
  decimalPlaces?: number;
}

export interface ReportWidgetAppearance {
  subtitle?: string;
  accentColor?: string;
  tone?: WidgetTone;
  showStats?: boolean;
  tableDensity?: WidgetTableDensity;
  hiddenColumns?: string[];
  tableColumnOrder?: string[];
  tableColumnSettings?: ReportWidgetTableColumnSetting[];
  themePreset?: WidgetThemePreset;
  titleAlign?: WidgetTitleAlign;
  sectionLabel?: string;
  sectionDescription?: string;
  kpiFormat?: WidgetKpiFormat;
  backgroundStyle?: WidgetBackgroundStyle;
  kpiLayout?: WidgetKpiLayout;
  valueFormat?: WidgetValueFormat;
  decimalPlaces?: number;
  seriesVisibilityMode?: WidgetSeriesVisibilityMode;
  maxVisibleSeries?: number;
  seriesOverflowMode?: WidgetSeriesOverflowMode;
}

export interface ReportConfigAxis {
  field: string;
  label?: string;
  dateGrouping?: DateGrouping;
}

export interface ReportConfigValue {
  field: string;
  label?: string;
  aggregation: Aggregation;
}

export interface ReportConfigLegend {
  field: string;
  label?: string;
}

export interface ReportConfigSorting {
  by: 'axis' | 'value';
  direction: 'asc' | 'desc';
  valueField?: string;
}

export interface ReportConfigFilter {
  field: string;
  operator: string;
  value?: unknown;
  values?: unknown[];
  from?: unknown;
  to?: unknown;
}

export interface DataSourceParameter {
  name: string;
  displayName?: string;
  semanticType?: string;
  sqlType: string;
  dotNetType: string;
  isNullable: boolean;
}

export interface DataSourceParameterBinding {
  name: string;
  source: DataSourceParameterBindingType;
  value?: string;
  allowViewerOverride?: boolean;
  viewerLabel?: string;
}

export type CalculatedFieldOperation = 'add' | 'subtract' | 'multiply' | 'divide';

export interface CalculatedField {
  name: string;
  label?: string;
  leftField: string;
  rightField: string;
  operation: CalculatedFieldOperation;
}

export interface ReportLifecycleMetadata {
  status: ReportLifecycleStatus;
  version: number;
  publishedAt?: string;
  releaseNote?: string;
}

export interface ReportHistoryEntry {
  version: number;
  status: ReportLifecycleStatus;
  publishedAt?: string;
  releaseNote?: string;
  snapshotAt: string;
  configSnapshot: string;
}

export interface ReportGovernanceMetadata {
  category?: string;
  tags?: string[];
  audience?: 'private' | 'team' | 'organization';
  refreshCadence?: 'manual' | 'hourly' | 'daily' | 'weekly';
  favorite?: boolean;
  sharedWith?: string[];
  subscriptionEnabled?: boolean;
  subscriptionChannel?: 'email' | 'inbox' | 'webhook';
  subscriptionFrequency?: 'manual' | 'daily' | 'weekly' | 'monthly';
  owner?: string;
  certified?: boolean;
  lastReviewedAt?: string;
}

export interface AssignedUserSummary {
  id: number;
  email: string;
  fullName?: string;
}

export interface ReportConfig {
  chartType: ChartType;
  axis?: ReportConfigAxis;
  values: ReportConfigValue[];
  legend?: ReportConfigLegend;
  sorting?: ReportConfigSorting;
  filters: ReportConfigFilter[];
  datasetParameters?: DataSourceParameterBinding[];
  calculatedFields?: CalculatedField[];
  lifecycle?: ReportLifecycleMetadata;
  history?: ReportHistoryEntry[];
  governance?: ReportGovernanceMetadata;
  widgets?: ReportWidget[];
  activeWidgetId?: string;
}

export interface ReportWidget {
  id: string;
  title: string;
  size?: 'third' | 'half' | 'full';
  height?: 'sm' | 'md' | 'lg';
  appearance?: ReportWidgetAppearance;
  chartType: ChartType;
  axis?: ReportConfigAxis;
  values: ReportConfigValue[];
  legend?: ReportConfigLegend;
  sorting?: ReportConfigSorting;
  filters: ReportConfigFilter[];
}

export interface Field {
  name: string;
  displayName?: string;
  semanticType?: string;
  defaultAggregation?: Aggregation | 'count';
  sqlType: string;
  dotNetType: string;
  isNullable: boolean;
}

export interface DataSourceCheckResponseDto {
  exists?: boolean;
  message?: string;
  schema?: Field[];
  parameters?: DataSourceParameter[];
}

export interface ConnectionDto {
  key: string;
  label?: string;
}

export interface DataSourceCatalogItem {
  schemaName: string;
  objectName: string;
  fullName: string;
  type: string;
  displayName: string;
}

export interface ReportDto {
  id: number;
  name: string;
  description?: string;
  connectionKey: string;
  dataSourceType: string;
  dataSourceName: string;
  configJson: string;
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
  canManage?: boolean;
  accessLevel?: 'owner' | 'shared' | 'organization' | 'none';
  assignedUserIds?: number[];
}

export interface ReportPreviewRequest {
  connectionKey: string;
  dataSourceType: string;
  dataSourceName: string;
  configJson: string;
}

export interface ReportPreviewResponse {
  columns: string[];
  rows: unknown[][];
}

export interface PreviewColumnDto {
  name: string;
  sqlType?: string;
  dotNetType?: string;
  isNullable?: boolean;
}

export interface PreviewDataDto {
  columns: PreviewColumnDto[];
  rows: Record<string, unknown>[];
}
