import type { SalesPlanStatus, SalesTargetMetric } from '@/features/sales-planning';

export const SalesForecastHealthStatus = {
  NoTarget: 0,
  Achieved: 1,
  OnTrack: 2,
  AtRisk: 3,
  Critical: 4,
} as const;

export type SalesForecastHealthStatus =
  (typeof SalesForecastHealthStatus)[keyof typeof SalesForecastHealthStatus];

export const SalesForecastProbabilitySource = {
  Calculated: 0,
  Manual: 1,
} as const;

export type SalesForecastProbabilitySource =
  (typeof SalesForecastProbabilitySource)[keyof typeof SalesForecastProbabilitySource];

export interface SalesForecastSummaryDto {
  targetValue: number;
  actualValue: number;
  remainingTarget: number;
  grossPipeline: number;
  committedPipeline: number;
  weightedPipeline: number;
  forecastValue: number;
  gap: number;
  coverageRatio: number;
  weightedCoverageRatio: number;
  forecastAttainmentRate: number;
  openQuotationCount: number;
  expiredQuotationCount: number;
  staleQuotationCount: number;
  manualOverrideCount: number;
  healthStatus: SalesForecastHealthStatus;
}

export interface SalesForecastSalespersonDto extends SalesForecastSummaryDto {
  userId: number;
  userName: string;
  historicalWinRate: number;
}

export interface SalesForecastPipelineItemDto {
  quotationId: number;
  documentNumber: string;
  userId: number;
  userName: string;
  customerName: string;
  quotationStatus?: number | null;
  offerDate: string;
  validUntil?: string | null;
  suggestedCloseDate: string;
  expectedCloseDate: string;
  amount: number;
  suggestedProbability: number;
  appliedProbability: number;
  weightedAmount: number;
  historicalWinRate: number;
  probabilitySource: SalesForecastProbabilitySource;
  daysOpen: number;
  daysUntilClose: number;
  isExpired: boolean;
  isStale: boolean;
  isCloseDateInferred: boolean;
  overrideNotes?: string | null;
  overrideRowVersion?: string | null;
}

export interface SalesForecastDto {
  planId: number;
  planName: string;
  planYear: number;
  month: number;
  currency: string;
  planStatus: SalesPlanStatus;
  targetMetric: SalesTargetMetric;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  isHistoricalPeriod: boolean;
  notice?: string | null;
  summary: SalesForecastSummaryDto;
  salespeople: SalesForecastSalespersonDto[];
  pipeline: SalesForecastPipelineItemDto[];
}

export interface UpsertSalesForecastOverrideDto {
  expectedCloseDate: string;
  probability: number;
  notes?: string | null;
  rowVersion?: string | null;
}

export interface SalesForecastOverrideDto {
  quotationId: number;
  expectedCloseDate: string;
  probability: number;
  notes?: string | null;
  rowVersion: string;
  updatedAt: string;
}
