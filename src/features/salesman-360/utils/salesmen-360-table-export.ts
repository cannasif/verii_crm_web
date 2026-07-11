import type { GridExportColumn } from '@/lib/grid-export';
import type { Salesmen360AmountComparisonDto } from '../types/salesmen360.types';

type TranslateFn = (key: string, opts?: Record<string, unknown>) => string;

export function sanitizeSalesmen360ExportFileName(prefix: string, userId: number): string {
  const suffix = userId > 0 ? String(userId) : 'tum-temsilciler';
  return `${prefix}-${suffix}`;
}

export function buildSalesmenAmountComparisonExportColumns(t: TranslateFn): GridExportColumn[] {
  return [
    { key: 'currency', label: t('salesman360.currencyTotals.currency') },
    { key: 'last12MonthsOrderAmount', label: t('salesman360.analyticsCharts.last12MonthsOrderAmount') },
    { key: 'openQuotationAmount', label: t('salesman360.analyticsCharts.openQuotationAmount') },
    { key: 'openOrderAmount', label: t('salesman360.analyticsCharts.openOrderAmount') },
  ];
}

export function buildSalesmenAmountComparisonExportRows(
  rows: Salesmen360AmountComparisonDto[]
): Record<string, unknown>[] {
  return rows.map((row) => ({
    currency: row.currency ?? '',
    last12MonthsOrderAmount: row.last12MonthsOrderAmount ?? 0,
    openQuotationAmount: row.openQuotationAmount ?? 0,
    openOrderAmount: row.openOrderAmount ?? 0,
  }));
}
