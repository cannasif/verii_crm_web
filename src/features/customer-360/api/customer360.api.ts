import type { ApiResponse } from '@/types/api';
import type {
  ActivityDto,
  CohortRetentionDto,
  CustomerImageDto,
  Customer360QuickQuotationDto,
  Customer360AnalyticsChartsDto,
  Customer360AnalyticsSummaryDto,
  Customer360OverviewDto,
  Customer360ErpBalanceDto,
  Customer360ErpMovementDto,
  ExecuteRecommendedActionDto,
} from '../types/customer360.types';
import { api } from '@/lib/axios';

function ensureData<T>(response: ApiResponse<T | null>, fallbackMessage: string): T {
  if (!response.success || response.data == null) {
    throw new Error(response.message ?? response.exceptionMessage ?? fallbackMessage);
  }
  return response.data;
}

export async function getCustomer360Overview(params: {
  id: number;
  currency?: string;
  signal?: AbortSignal;
}): Promise<Customer360OverviewDto> {
  const { id, currency, signal } = params;
  const url =
    currency != null && currency !== ''
      ? `/api/customers/${id}/overview?currency=${encodeURIComponent(currency)}`
      : `/api/customers/${id}/overview`;
  const headers: Record<string, string> = {};
  if (currency != null && currency !== '') {
    headers['X-Currency'] = currency;
    headers['Currency'] = currency;
  }
  const response = await api.get<ApiResponse<Customer360OverviewDto | null>>(url, {
    signal,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  });
  return ensureData(response, 'Overview could not be loaded');
}

export async function getCustomer360AnalyticsSummary(params: {
  id: number;
  currency?: string;
  signal?: AbortSignal;
}): Promise<Customer360AnalyticsSummaryDto> {
  const { id, currency, signal } = params;
  const url =
    currency != null && currency !== ''
      ? `/api/customers/${id}/analytics/summary?currency=${encodeURIComponent(currency)}`
      : `/api/customers/${id}/analytics/summary`;
  const headers: Record<string, string> = {};
  if (currency != null && currency !== '') {
    headers['X-Currency'] = currency;
    headers['Currency'] = currency;
  }
  const response = await api.get<ApiResponse<Customer360AnalyticsSummaryDto | null>>(url, {
    signal,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  });
  return ensureData(response, 'Analytics summary could not be loaded');
}

export async function getCustomer360AnalyticsCharts(params: {
  id: number;
  months?: number;
  currency?: string;
  signal?: AbortSignal;
}): Promise<Customer360AnalyticsChartsDto> {
  const { id, months = 12, currency, signal } = params;
  const search = new URLSearchParams({ months: String(months) });
  if (currency != null && currency !== '') {
    search.set('currency', currency);
  }
  const url = `/api/customers/${id}/analytics/charts?${search.toString()}`;
  const headers: Record<string, string> = {};
  if (currency != null && currency !== '') {
    headers['X-Currency'] = currency;
    headers['Currency'] = currency;
  }
  const response = await api.get<ApiResponse<Customer360AnalyticsChartsDto | null>>(url, {
    signal,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  });
  return ensureData(response, 'Analytics charts could not be loaded');
}

export async function getCustomer360Cohort(params: {
  id: number;
  months?: number;
  signal?: AbortSignal;
}): Promise<CohortRetentionDto[]> {
  const { id, months = 12, signal } = params;
  const url = `/api/customers/${id}/analytics/cohort?months=${encodeURIComponent(String(months))}`;
  const response = await api.get<ApiResponse<CohortRetentionDto[] | null>>(url, { signal });
  return ensureData(response, 'Cohort analytics could not be loaded');
}

export async function executeCustomer360RecommendedAction(params: {
  id: number;
  payload: ExecuteRecommendedActionDto;
  signal?: AbortSignal;
}): Promise<ActivityDto> {
  const { id, payload, signal } = params;
  const url = `/api/customers/${id}/recommended-actions/execute`;
  const response = await api.post<ApiResponse<ActivityDto | null>>(url, payload, { signal });
  return ensureData(response, 'Recommended action could not be executed');
}

export async function getCustomerImages(params: {
  id: number;
  signal?: AbortSignal;
}): Promise<CustomerImageDto[]> {
  const { id, signal } = params;
  const url = `/api/CustomerImage/by-customer/${id}`;
  const response = await api.get<ApiResponse<CustomerImageDto[] | null>>(url, { signal });
  return ensureData(response, 'Customer images could not be loaded');
}

export async function getCustomer360QuickQuotations(params: {
  id: number;
  signal?: AbortSignal;
}): Promise<Customer360QuickQuotationDto[]> {
  const { id, signal } = params;
  const response = await api.get<ApiResponse<Customer360QuickQuotationDto[] | null>>(
    `/api/customers/${id}/quick-quotations`,
    { signal }
  );
  return ensureData(response, 'Quick quotations could not be loaded');
}

export async function getCustomer360ErpMovements(params: {
  id: number;
  signal?: AbortSignal;
}): Promise<Customer360ErpMovementDto[]> {
  const { id, signal } = params;
  const response = await api.get<ApiResponse<Customer360ErpMovementDto[] | null>>(
    `/api/customers/${id}/erp-movements`,
    { signal }
  );
  return ensureData(response, 'ERP hareketleri yüklenemedi');
}

export async function getCustomer360ErpBalance(params: {
  id: number;
  signal?: AbortSignal;
}): Promise<Customer360ErpBalanceDto> {
  const { id, signal } = params;
  const response = await api.get<ApiResponse<Customer360ErpBalanceDto | null>>(
    `/api/customers/${id}/erp-balance`,
    { signal }
  );
  return ensureData(response, 'ERP bakiye özeti yüklenemedi');
}
