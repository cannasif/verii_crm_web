export interface Customer360ProfileDto {
  id: number;
  name: string;
  customerCode?: string | null;
}

export interface Customer360KpiDto {
  totalDemands: number;
  totalQuotations: number;
  totalOrders: number;
  openQuotations: number;
  openOrders: number;
  lastActivityDate?: string | null;
}

export interface Customer360SimpleItemDto {
  id: number;
  title: string;
  subtitle?: string | null;
  status?: string | null;
  amount?: number | null;
  date?: string | null;
}

export interface Customer360TimelineItemDto {
  itemId: number;
  date: string;
  type?: string | null;
  title: string;
  status?: string | null;
  amount?: number | null;
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

export interface Customer360OverviewDto {
  profile: Customer360ProfileDto;
  kpis: Customer360KpiDto;
  contacts: Customer360SimpleItemDto[];
  shippingAddresses: Customer360SimpleItemDto[];
  recentDemands: Customer360SimpleItemDto[];
  recentQuotations: Customer360SimpleItemDto[];
  recentOrders: Customer360SimpleItemDto[];
  recentActivities: Customer360SimpleItemDto[];
  timeline: Customer360TimelineItemDto[];
  revenueQuality?: RevenueQualityDto | null;
  recommendedActions?: RecommendedActionDto[] | null;
}

export interface Customer360CurrencyAmountDto {
  currency: string;
  demandAmount: number;
  quotationAmount: number;
  orderAmount: number;
}

export interface Customer360AnalyticsSummaryDto {
  currency?: string | null;
  last12MonthsOrderAmount: number;
  openQuotationAmount: number;
  openOrderAmount: number;
  lastActivityDate?: string | null;
  activityCount: number;
  totalsByCurrency: Customer360CurrencyAmountDto[];
}

export interface Customer360MonthlyTrendItemDto {
  month: string;
  demandCount: number;
  quotationCount: number;
  orderCount: number;
}

export interface Customer360DistributionDto {
  demandCount: number;
  quotationCount: number;
  orderCount: number;
}

export interface Customer360AmountComparisonDto {
  currency?: string | null;
  last12MonthsOrderAmount: number;
  openQuotationAmount: number;
  openOrderAmount: number;
}

export interface Customer360AnalyticsChartsDto {
  monthlyTrend: Customer360MonthlyTrendItemDto[];
  distribution: Customer360DistributionDto;
  amountComparison: Customer360AmountComparisonDto;
  amountComparisonByCurrency: Customer360AmountComparisonDto[];
}

export interface CustomerImageDto {
  id: number;
  customerId: number;
  customerName?: string | null;
  imageUrl: string;
  imageDescription?: string | null;
  createdDate?: string;
  updatedDate?: string | null;
  deletedDate?: string | null;
  isDeleted?: boolean;
  createdByFullUser?: string | null;
  updatedByFullUser?: string | null;
  deletedByFullUser?: string | null;
}
