import {
  SalesPlanStatus,
  SalesTargetMetric,
  SalesTargetProgressStatus,
} from '../types/sales-planning.types';

export const SALES_PLAN_STATUSES = [
  SalesPlanStatus.Draft,
  SalesPlanStatus.Submitted,
  SalesPlanStatus.Approved,
  SalesPlanStatus.Locked,
] as const;

export const SALES_TARGET_METRICS = [
  SalesTargetMetric.NetOrderAmount,
  SalesTargetMetric.ErpOrderAmount,
  SalesTargetMetric.NetQuotationAmount,
  SalesTargetMetric.QuotationCount,
  SalesTargetMetric.OrderCount,
  SalesTargetMetric.NewCustomerCount,
  SalesTargetMetric.CompletedActivityCount,
] as const;

export const COUNT_METRICS = new Set<SalesTargetMetric>([
  SalesTargetMetric.QuotationCount,
  SalesTargetMetric.OrderCount,
  SalesTargetMetric.NewCustomerCount,
  SalesTargetMetric.CompletedActivityCount,
]);

export function getStatusKey(status: SalesPlanStatus): string {
  const entry = Object.entries(SalesPlanStatus).find(([, value]) => value === status);
  return entry?.[0].replace(/^./, (value) => value.toLowerCase()) ?? 'draft';
}

export function getMetricKey(metric: SalesTargetMetric): string {
  const entry = Object.entries(SalesTargetMetric).find(([, value]) => value === metric);
  return entry?.[0].replace(/^./, (value) => value.toLowerCase()) ?? 'netOrderAmount';
}

export function getProgressStatusKey(status: SalesTargetProgressStatus): string {
  const entry = Object.entries(SalesTargetProgressStatus).find(([, value]) => value === status);
  return entry?.[0].replace(/^./, (value) => value.toLowerCase()) ?? 'notStarted';
}

export function getMonthLabel(month: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(Date.UTC(2027, month - 1, 1)));
}
