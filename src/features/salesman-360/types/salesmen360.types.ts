export interface Salesmen360CurrencyAmountDto {
  currency: string;
  demandAmount: number;
  quotationAmount: number;
  orderAmount: number;
}

export interface Salesmen360VisibleUserDto {
  userId: number;
  fullName: string;
  email?: string | null;
  isSelf: boolean;
}

export interface Salesmen360ErpMovementDto {
  cariKod: string;
  tarih?: string | null;
  vadeTarihi?: string | null;
  belgeNo?: string | null;
  aciklama?: string | null;
  dovizTuru?: number | null;
  paraBirimi?: string | null;
  borc: number;
  alacak: number;
  tarihSiraliTlBakiye: number;
  vadeSiraliTlBakiye: number;
  dovizBorc: number;
  dovizAlacak: number;
  tarihSiraliDovizBakiye: number;
  vadeSiraliDovizBakiye: number;
}

export type Salesmen360PeriodKey = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface Salesmen360PeriodDto {
  period: Salesmen360PeriodKey | string;
  startDate: string;
  endDate: string;
  label: string;
}

export interface Salesmen360PeriodParams {
  period?: Salesmen360PeriodKey;
  startDate?: string;
  endDate?: string;
}

export interface Salesmen360KpiDto {
  currency?: string | null;
  totalDemands: number;
  totalQuotations: number;
  totalOrders: number;
  totalActivities: number;
  totalDemandAmount: number;
  totalQuotationAmount: number;
  totalOrderAmount: number;
  totalsByCurrency?: Salesmen360CurrencyAmountDto[];
}

export interface RevenueQualityDto {
  cohortKey?: string | null;
  retentionRate?: number | null;
  rfmSegment?: string | null;
  ltv?: number | null;
  churnRiskScore?: number | null;
  upsellPropensityScore?: number | null;
  paymentBehaviorScore?: number | null;
  dataQualityNote?: string | null;
  healthScore?: number | null;
  daysSinceLastOrder?: number | null;
  avgDelayDays?: number | null;
}

export interface RecommendedActionDto {
  actionCode: string;
  title: string;
  priority: number;
  reason?: string | null;
  dueDate?: string | null;
  targetEntityType?: string | null;
  targetEntityId?: number | null;
  sourceRuleCode?: string | null;
  key?: string;
  actionType?: string;
  payloadJson?: string | null;
}

export interface CohortRetentionPointDto {
  periodIndex: number;
  periodMonth: string;
  retainedCount: number;
  retentionRate: number;
}

export interface CohortRetentionDto {
  cohortKey: string;
  cohortSize: number;
  points: CohortRetentionPointDto[];
}

export interface ExecuteRecommendedActionDto {
  actionCode: string;
  title?: string;
  reason?: string;
  dueInDays?: number;
  priority?: string;
  assignedUserId?: number;
}

export interface ActivityDto {
  id: number;
  subject: string;
  description?: string | null;
  status: string;
  isCompleted: boolean;
  priority?: string | null;
  activityDate?: string | null;
  assignedUserId?: number | null;
  potentialCustomerId?: number | null;
}

export interface Salesmen360OverviewDto {
  userId: number;
  fullName: string;
  email?: string | null;
  period?: Salesmen360PeriodDto | null;
  kpis: Salesmen360KpiDto;
  revenueQuality?: RevenueQualityDto | null;
  recommendedActions?: RecommendedActionDto[] | null;
}

export interface Salesmen360AnalyticsSummaryDto {
  period?: Salesmen360PeriodDto | null;
  currency?: string | null;
  last12MonthsOrderAmount: number;
  openQuotationAmount: number;
  openOrderAmount: number;
  lastActivityDate?: string | null;
  activityCount: number;
  totalsByCurrency?: Salesmen360CurrencyAmountDto[];
}

export interface Salesmen360MonthlyTrendItemDto {
  month: string;
  demandCount: number;
  quotationCount: number;
  orderCount: number;
}

export interface Salesmen360DistributionDto {
  demandCount: number;
  quotationCount: number;
  orderCount: number;
}

export interface Salesmen360AmountComparisonDto {
  currency?: string | null;
  last12MonthsOrderAmount: number;
  openQuotationAmount: number;
  openOrderAmount: number;
}

export interface Salesmen360AnalyticsChartsDto {
  period?: Salesmen360PeriodDto | null;
  monthlyTrend: Salesmen360MonthlyTrendItemDto[];
  distribution: Salesmen360DistributionDto;
  amountComparison: Salesmen360AmountComparisonDto;
  amountComparisonByCurrency?: Salesmen360AmountComparisonDto[];
}
