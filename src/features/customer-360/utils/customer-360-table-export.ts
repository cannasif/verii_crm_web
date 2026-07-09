import type { GridExportColumn } from '@/lib/grid-export';
import { fetchAllPagedData } from '@/lib/fetch-all-paged-data';
import { fetchPagedDocumentList } from '@/features/approval/utils/fetch-paged-document-list';
import { quotationApi } from '@/features/quotation/api/quotation-api';
import { orderApi } from '@/features/order/api/order-api';
import { activityApi } from '@/features/activity-management/api/activity-api';
import type { QuotationGetDto } from '@/features/quotation/types/quotation-types';
import type { OrderGetDto } from '@/features/order/types/order-types';
import type { ActivityDto } from '@/features/activity-management/types/activity-types';
import type { NetsisOrderHeader } from '@/features/order/types/erp-order-types';
import type { CohortRetentionDto } from '../types/customer360.types';
import type { PagedFilter } from '@/types/api';
import {
  activityBelongsToCustomer,
  buildCustomerActivityFilters,
  didServerIgnoreActivityCustomerFilter,
} from './activity-customer-scope';

type TranslateFn = (key: string, opts?: Record<string, unknown>) => string;

export function sanitizeCustomer360ExportFileName(prefix: string, customerId: number, customerCode?: string | null): string {
  const code = (customerCode ?? `musteri-${customerId}`).trim().replace(/[^\w.-]+/g, '_') || `musteri-${customerId}`;
  return `${prefix}-${code}`;
}

function formatExportDate(language: string, value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(language);
}

function formatExportAmount(
  language: string,
  amount?: number | null,
  display?: string | null,
  currency?: string | null
): string {
  if (display && display.trim()) return display;
  if (amount == null) return '';
  const formatted = new Intl.NumberFormat(language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return currency ? `${formatted} ${currency}` : formatted;
}

function activityStatusLabel(status: unknown, tc: TranslateFn): string {
  const value = Number(status);
  if (value === 1) return tc('related.activityStatus.completed');
  if (value === 2) return tc('related.activityStatus.cancelled');
  return tc('related.activityStatus.scheduled');
}

export function buildCohortExportColumns(tc: TranslateFn): GridExportColumn[] {
  return [
    { key: 'cohortKey', label: tc('cohort.cohortKey') },
    { key: 'periodMonth', label: tc('cohort.columns.period', { defaultValue: 'Dönem' }) },
    { key: 'retainedCount', label: tc('cohort.columns.retainedCount', { defaultValue: 'Kalan Sayı' }) },
    { key: 'retentionRate', label: tc('cohort.columns.retentionRate', { defaultValue: 'Tutma Oranı (%)' }) },
  ];
}

export function buildCohortExportRows(rows: CohortRetentionDto[] | undefined): Record<string, unknown>[] {
  const first = rows?.[0];
  if (!first?.points?.length) return [];

  return first.points.map((point) => ({
    cohortKey: first.cohortKey,
    periodMonth: point.periodMonth,
    retainedCount: point.retainedCount,
    retentionRate: point.retentionRate,
  }));
}

export function buildDocumentListExportColumns(tc: TranslateFn): GridExportColumn[] {
  return [
    { key: 'offerNo', label: tc('related.columns.offerNo') },
    { key: 'date', label: tc('related.columns.date') },
    { key: 'representative', label: tc('related.columns.representative') },
    { key: 'total', label: tc('related.columns.total') },
  ];
}

export function buildQuotationExportRows(rows: QuotationGetDto[], language: string): Record<string, unknown>[] {
  return rows.map((row) => ({
    offerNo: row.offerNo || `#${row.id}`,
    date: formatExportDate(language, row.offerDate),
    representative: row.representativeName || '',
    total: formatExportAmount(language, row.grandTotal, row.grandTotalDisplay, row.currencyCode ?? row.currency),
  }));
}

export function buildOrderExportRows(rows: OrderGetDto[], language: string): Record<string, unknown>[] {
  return rows.map((row) => ({
    offerNo: row.offerNo || `#${row.id}`,
    date: formatExportDate(language, row.offerDate),
    representative: row.representativeName || '',
    total: formatExportAmount(language, row.grandTotal, row.grandTotalDisplay, row.currencyCode ?? row.currency),
  }));
}

export function buildActivityExportColumns(tc: TranslateFn): GridExportColumn[] {
  return [
    { key: 'subject', label: tc('related.columns.subject') },
    { key: 'type', label: tc('related.columns.type') },
    { key: 'date', label: tc('related.columns.date') },
    { key: 'assignee', label: tc('related.columns.assignee') },
    { key: 'status', label: tc('related.columns.status') },
  ];
}

export function buildActivityExportRows(rows: ActivityDto[], language: string, tc: TranslateFn): Record<string, unknown>[] {
  return rows.map((row) => ({
    subject: row.subject || `#${row.id}`,
    type: row.activityType?.name || '',
    date: formatExportDate(language, row.startDateTime),
    assignee: row.assignedUser?.fullName || '',
    status: activityStatusLabel(row.status, tc),
  }));
}

export function buildErpOrderExportColumns(tc: TranslateFn): GridExportColumn[] {
  return [
    { key: 'branch', label: tc('erpOrders.columns.branch') },
    { key: 'orderNo', label: tc('erpOrders.columns.orderNo') },
    { key: 'date', label: tc('erpOrders.columns.date') },
    { key: 'deliveryDate', label: tc('erpOrders.columns.deliveryDate') },
    { key: 'gross', label: tc('erpOrders.columns.gross') },
    { key: 'vat', label: tc('erpOrders.columns.vat') },
    { key: 'total', label: tc('erpOrders.columns.total') },
    { key: 'salesRep', label: tc('erpOrders.columns.salesRep') },
  ];
}

export function buildErpOrderExportRows(rows: NetsisOrderHeader[], language: string): Record<string, unknown>[] {
  const formatNumber = (value: number | null | undefined): number | string => {
    if (value == null || !Number.isFinite(Number(value))) return '';
    return Number(value);
  };

  return rows.map((row) => ({
    branch: row.subeKodu ?? '',
    orderNo: row.fatirsNo || '',
    date: formatExportDate(language, row.tarih),
    deliveryDate: formatExportDate(language, row.teslimTarihi),
    gross: formatNumber(row.brutTutar),
    vat: formatNumber(row.kdv),
    total: formatNumber(row.genelToplam),
    salesRep: row.plasiyerKodu || '',
  }));
}

export async function fetchAllCustomerQuotations(filters: PagedFilter[]): Promise<QuotationGetDto[]> {
  return fetchAllPagedData({
    pageSize: 250,
    fetchPage: (pageNumber, pageSize) =>
      fetchPagedDocumentList<QuotationGetDto>(
        { pageNumber, pageSize, sortBy: 'Id', sortDirection: 'desc', filters },
        (queryParams) => quotationApi.getList(queryParams)
      ),
  });
}

export async function fetchAllCustomerOrders(filters: PagedFilter[]): Promise<OrderGetDto[]> {
  return fetchAllPagedData({
    pageSize: 250,
    fetchPage: (pageNumber, pageSize) =>
      fetchPagedDocumentList<OrderGetDto>(
        { pageNumber, pageSize, sortBy: 'Id', sortDirection: 'desc', filters },
        (queryParams) => orderApi.getList(queryParams)
      ),
  });
}

async function fetchActivitiesClientSideAll(params: {
  customerId: number;
  customerCode?: string | null;
  customerName?: string | null;
  activityFilters: PagedFilter[];
}): Promise<ActivityDto[]> {
  const { customerId, customerCode, customerName, activityFilters } = params;

  const fetchPage = async (page: number, size: number) => {
    try {
      return await activityApi.getList({
        pageNumber: page,
        pageSize: size,
        sortBy: 'StartDateTime',
        sortDirection: 'desc',
        filters: activityFilters.length > 0 ? activityFilters : undefined,
      });
    } catch {
      return activityApi.getList({
        pageNumber: page,
        pageSize: size,
        sortBy: 'StartDateTime',
        sortDirection: 'desc',
      });
    }
  };

  const all = await fetchAllPagedData({ fetchPage, pageSize: 250 });
  return all
    .filter((row) => activityBelongsToCustomer(row, customerId, customerCode, customerName))
    .sort((a, b) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime());
}

export async function fetchAllCustomerActivities(params: {
  customerId: number;
  customerCode?: string | null;
  customerName?: string | null;
}): Promise<ActivityDto[]> {
  const { customerId, customerCode, customerName } = params;
  const activityFilters = buildCustomerActivityFilters(customerId, customerCode, customerName);

  if (activityFilters.length > 0) {
    try {
      const response = await activityApi.getList({
        pageNumber: 1,
        pageSize: 250,
        sortBy: 'StartDateTime',
        sortDirection: 'desc',
        filters: activityFilters,
      });
      const raw = response.data ?? [];

      if (didServerIgnoreActivityCustomerFilter(raw, customerId, customerCode, customerName)) {
        return fetchActivitiesClientSideAll({ customerId, customerCode, customerName, activityFilters });
      }

      return raw
        .filter((row) => activityBelongsToCustomer(row, customerId, customerCode, customerName))
        .sort((a, b) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime());
    } catch {
      return fetchActivitiesClientSideAll({ customerId, customerCode, customerName, activityFilters });
    }
  }

  return fetchActivitiesClientSideAll({ customerId, customerCode, customerName, activityFilters });
}
