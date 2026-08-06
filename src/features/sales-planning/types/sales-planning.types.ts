export const SalesPlanStatus = {
  Draft: 0,
  Submitted: 1,
  Approved: 2,
  Locked: 3,
} as const;

export type SalesPlanStatus = (typeof SalesPlanStatus)[keyof typeof SalesPlanStatus];

export const SalesTargetMetric = {
  NetOrderAmount: 1,
  ErpOrderAmount: 2,
  NetQuotationAmount: 3,
  QuotationCount: 4,
  OrderCount: 5,
  NewCustomerCount: 6,
  CompletedActivityCount: 7,
} as const;

export type SalesTargetMetric = (typeof SalesTargetMetric)[keyof typeof SalesTargetMetric];

export const SalesTargetProgressStatus = {
  NoTarget: 0,
  NotStarted: 1,
  AtRisk: 2,
  OnTrack: 3,
  Achieved: 4,
} as const;

export type SalesTargetProgressStatus =
  (typeof SalesTargetProgressStatus)[keyof typeof SalesTargetProgressStatus];

export interface SalesPlanActionAvailability {
  canEdit: boolean;
  canDelete: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  canLock: boolean;
}

export interface SalesPlanSummaryDto extends SalesPlanActionAvailability {
  id: number;
  name: string;
  planYear: number;
  currency: string;
  description?: string | null;
  version: number;
  status: SalesPlanStatus;
  targetCount: number;
  salespersonCount: number;
  createdDate: string;
  updatedDate?: string | null;
  rowVersion: string;
}

export interface SalesPlanTargetDto {
  id: number;
  userId: number;
  userName: string;
  month: number;
  metric: SalesTargetMetric;
  targetValue: number;
  notes?: string | null;
}

export interface SalesPlanDto extends SalesPlanActionAvailability {
  id: number;
  name: string;
  planYear: number;
  currency: string;
  description?: string | null;
  version: number;
  status: SalesPlanStatus;
  submittedByUserId?: number | null;
  submittedAt?: string | null;
  approvedByUserId?: number | null;
  approvedAt?: string | null;
  lockedByUserId?: number | null;
  lockedAt?: string | null;
  rowVersion: string;
  targets: SalesPlanTargetDto[];
}

export interface SalesPlanTargetWriteDto {
  userId: number;
  month: number;
  metric: SalesTargetMetric;
  targetValue: number;
  notes?: string | null;
}

export interface CreateSalesPlanDto {
  name: string;
  planYear: number;
  currency: string;
  description?: string | null;
  targets: SalesPlanTargetWriteDto[];
}

export interface UpdateSalesPlanDto {
  name: string;
  currency: string;
  description?: string | null;
  rowVersion: string;
  targets: SalesPlanTargetWriteDto[];
}

export interface SalesPlanTransitionDto {
  rowVersion: string;
  reason?: string | null;
}

export interface SalesPlanUserOptionDto {
  id: number;
  fullName: string;
  username: string;
}

export interface SalesPlanTargetAttainmentDto {
  targetId: number;
  userId: number;
  userName: string;
  metric: SalesTargetMetric;
  targetValue: number;
  actualValue: number;
  remainingValue: number;
  achievementRate: number;
  expectedProgressRate: number;
  progressStatus: SalesTargetProgressStatus;
  notes?: string | null;
}

export interface SalesPlanMetricAttainmentDto {
  metric: SalesTargetMetric;
  targetValue: number;
  actualValue: number;
  achievementRate: number;
}

export interface SalesPlanAttainmentDto {
  planId: number;
  planName: string;
  planYear: number;
  month: number;
  currency: string;
  planStatus: SalesPlanStatus;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  targetCount: number;
  salespersonCount: number;
  achievedCount: number;
  onTrackCount: number;
  atRiskCount: number;
  notStartedCount: number;
  noTargetCount: number;
  metrics: SalesPlanMetricAttainmentDto[];
  targets: SalesPlanTargetAttainmentDto[];
}
