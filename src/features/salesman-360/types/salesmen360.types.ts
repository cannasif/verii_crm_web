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

export interface Salesmen360PerformanceTotalsDto {
  totalDemands: number;
  convertedDemands: number;
  demandConversionRate: number;
  totalQuotations: number;
  convertedQuotations: number;
  quotationConversionRate: number;
  totalOrders: number;
  draftOrders: number;
  pendingApprovalOrders: number;
  approvedOrders: number;
  rejectedOrClosedOrders: number;
  erpIntegratedOrders: number;
  erpIntegrationRate: number;
  totalActivities: number;
  completedActivities: number;
  plannedActivities: number;
  cancelledActivities: number;
  totalCustomers: number;
  erpIntegratedCustomers: number;
  businessCardCustomers: number;
}

export interface Salesmen360DocumentFunnelDto {
  totalDemands: number;
  convertedDemands: number;
  demandToQuotationRate: number;
  totalQuotations: number;
  convertedQuotations: number;
  quotationToOrderRate: number;
  totalOrders: number;
  erpIntegratedOrders: number;
  orderToErpRate: number;
}

export interface Salesmen360DocumentStatusDto {
  documentType: 'demand' | 'quotation' | 'order' | string;
  total: number;
  draft: number;
  waiting: number;
  approved: number;
  rejected: number;
  closed: number;
  customerCancelled: number;
  revision: number;
}

export interface Salesmen360FinancialSummaryDto {
  currency: string;
  demandAmount: number;
  quotationAmount: number;
  convertedQuotationAmount: number;
  orderAmount: number;
  erpOrderAmount: number;
  averageOrderAmount: number;
}

export interface Salesmen360ActivityInsightsDto {
  total: number;
  completed: number;
  scheduled: number;
  cancelled: number;
  overdue: number;
  dueNextSevenDays: number;
  highPriorityOpen: number;
  customerLinked: number;
  completionRate: number;
  customerLinkRate: number;
  averageCompletedDurationMinutes: number;
}

export interface Salesmen360CustomerInsightsDto {
  total: number;
  erpIntegrated: number;
  businessCard: number;
  withContactInfo: number;
  withActivity: number;
  withQuotation: number;
  withOrder: number;
  withoutActivity: number;
  erpIntegrationRate: number;
  engagementRate: number;
}

export interface Salesmen360AttentionSummaryDto {
  total: number;
  overdueActivities: number;
  expiredOpenQuotations: number;
  stalePendingOrders: number;
  customersWithoutActivity: number;
}

export interface Salesmen360OrderStatusItemDto {
  status: 'draft' | 'pendingApproval' | 'approved' | 'rejectedOrClosed' | string;
  count: number;
}

export interface Salesmen360ActivityTypeItemDto {
  activityTypeId: number;
  activityTypeName: string;
  count: number;
  completedCount: number;
}

export interface Salesmen360CustomerPerformanceDto {
  salesmanId: number;
  salesmanName: string;
  customerId?: number | null;
  customerCode: string;
  customerName: string;
  currency: string;
  demandCount: number;
  demandAmount: number;
  quotationCount: number;
  quotationAmount: number;
  orderCount: number;
  orderAmount: number;
  erpOrderCount: number;
  erpOrderAmount: number;
}

export interface Salesmen360StockPerformanceDto {
  salesmanId: number;
  salesmanName: string;
  stockCode: string;
  stockName: string;
  currency: string;
  demandDocumentCount: number;
  demandQuantity: number;
  demandAmount: number;
  quotationDocumentCount: number;
  quotationQuantity: number;
  quotationAmount: number;
  orderDocumentCount: number;
  orderQuantity: number;
  orderAmount: number;
  erpOrderDocumentCount: number;
  erpOrderQuantity: number;
  erpOrderAmount: number;
}

export interface Salesmen360PerformanceTrendItemDto {
  periodKey: string;
  demandCount: number;
  quotationCount: number;
  orderCount: number;
  erpOrderCount: number;
  activityCount: number;
  completedActivityCount: number;
  customerCount: number;
}

export interface Salesmen360SalesmanPerformanceDto extends Salesmen360PerformanceTotalsDto {
  userId: number;
  fullName: string;
  email?: string | null;
  financialsByCurrency: Salesmen360FinancialSummaryDto[];
  documentStatuses: Salesmen360DocumentStatusDto[];
  activityTypes: Salesmen360ActivityTypeItemDto[];
  erpConvertedQuotations: number;
  overdueActivities: number;
  activityCompletionRate: number;
  customerEngagementRate: number;
}

export interface Salesmen360WorkItemDto {
  kind: 'demand' | 'quotation' | 'order' | 'activity' | 'customer' | string;
  entityId: number;
  title: string;
  salesmanId: number;
  salesmanName: string;
  customerId?: number | null;
  customerName?: string | null;
  date: string;
  status: string;
  typeName?: string | null;
  amount?: number | null;
  currency?: string | null;
  isErpIntegrated: boolean;
  isOverdue: boolean;
}

export interface Salesmen360WorkFeedDto {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  items: Salesmen360WorkItemDto[];
}

export interface Salesmen360AttentionItemDto {
  kind: 'overdueActivity' | 'expiredQuotation' | 'stalePendingOrder' | 'customerWithoutActivity' | string;
  entityId: number;
  title: string;
  salesmanId: number;
  salesmanName: string;
  customerName?: string | null;
  date: string;
  ageDays: number;
}

export interface Salesmen360PerformanceDto {
  period: Salesmen360PeriodDto;
  isTeamView: boolean;
  salesmanCount: number;
  currency?: string | null;
  totals: Salesmen360PerformanceTotalsDto;
  funnel: Salesmen360DocumentFunnelDto;
  activityInsights: Salesmen360ActivityInsightsDto;
  customerInsights: Salesmen360CustomerInsightsDto;
  attention: Salesmen360AttentionSummaryDto;
  orderStatuses: Salesmen360OrderStatusItemDto[];
  documentStatuses: Salesmen360DocumentStatusDto[];
  financialsByCurrency: Salesmen360FinancialSummaryDto[];
  activityTypes: Salesmen360ActivityTypeItemDto[];
  customerBreakdown: Salesmen360CustomerPerformanceDto[];
  stockBreakdown: Salesmen360StockPerformanceDto[];
  trend: Salesmen360PerformanceTrendItemDto[];
  salesmen: Salesmen360SalesmanPerformanceDto[];
  recentWork: Salesmen360WorkItemDto[];
  attentionItems: Salesmen360AttentionItemDto[];
}
