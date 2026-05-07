import type { ApiResponse } from '@/types/api';
import type {
  ActivityDto,
  CohortRetentionDto,
  Salesmen360OverviewDto,
  Salesmen360AnalyticsSummaryDto,
  Salesmen360AnalyticsChartsDto,
  Salesmen360VisibleUserDto,
  ExecuteRecommendedActionDto,
} from '../types/salesmen360.types';
import { api } from '@/lib/axios';

function ensureData<T>(response: ApiResponse<T | null>, fallbackMessage: string): T {
  if (!response.success || response.data == null) {
    throw new Error(response.message ?? response.exceptionMessage ?? fallbackMessage);
  }
  return response.data;
}

export async function getSalesmenOverview(params: {
  userId: number;
  currency?: string;
  signal?: AbortSignal;
}): Promise<Salesmen360OverviewDto> {
  const { userId, currency, signal } = params;
  const url =
    currency != null && currency !== ''
      ? `/api/salesmen/${userId}/overview?currency=${encodeURIComponent(currency)}`
      : `/api/salesmen/${userId}/overview`;
  const headers: Record<string, string> = {};
  if (currency != null && currency !== '') {
    headers['X-Currency'] = currency;
    headers['Currency'] = currency;
  }
  const response = await api.get<ApiResponse<Salesmen360OverviewDto | null>>(url, {
    signal,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  });
  return ensureData(response, 'Overview could not be loaded');
}

export async function getVisibleSalesmen(params?: {
  signal?: AbortSignal;
}): Promise<Salesmen360VisibleUserDto[]> {
  const response = await api.get<ApiResponse<Salesmen360VisibleUserDto[] | null>>('/api/salesmen/visible-users', {
    signal: params?.signal,
  });
  return ensureData(response, 'Visible salesmen could not be loaded');
}

export async function getSalesmenAnalyticsSummary(params: {
  userId: number;
  currency?: string;
  signal?: AbortSignal;
}): Promise<Salesmen360AnalyticsSummaryDto> {
  const { userId, currency, signal } = params;
  const url =
    currency != null && currency !== ''
      ? `/api/salesmen/${userId}/analytics/summary?currency=${encodeURIComponent(currency)}`
      : `/api/salesmen/${userId}/analytics/summary`;
  const headers: Record<string, string> = {};
  if (currency != null && currency !== '') {
    headers['X-Currency'] = currency;
    headers['Currency'] = currency;
  }
  const response = await api.get<ApiResponse<Salesmen360AnalyticsSummaryDto | null>>(url, {
    signal,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  });
  return ensureData(response, 'Analytics summary could not be loaded');
}

export async function getSalesmenAnalyticsCharts(params: {
  userId: number;
  months?: number;
  currency?: string;
  signal?: AbortSignal;
}): Promise<Salesmen360AnalyticsChartsDto> {
  const { userId, months = 12, currency, signal } = params;
  const search = new URLSearchParams({ months: String(months) });
  if (currency != null && currency !== '') {
    search.set('currency', currency);
  }
  const url = `/api/salesmen/${userId}/analytics/charts?${search.toString()}`;
  const headers: Record<string, string> = {};
  if (currency != null && currency !== '') {
    headers['X-Currency'] = currency;
    headers['Currency'] = currency;
  }
  const response = await api.get<ApiResponse<Salesmen360AnalyticsChartsDto | null>>(url, {
    signal,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  });
  return ensureData(response, 'Analytics charts could not be loaded');
}

export async function getSalesmenCohort(params: {
  userId: number;
  months?: number;
  signal?: AbortSignal;
}): Promise<CohortRetentionDto[]> {
  const { userId, months = 12, signal } = params;
  const url = `/api/salesmen/${userId}/analytics/cohort?months=${encodeURIComponent(String(months))}`;
  const response = await api.get<ApiResponse<CohortRetentionDto[] | null>>(url, { signal });
  return ensureData(response, 'Cohort analytics could not be loaded');
}

export async function executeSalesmenRecommendedAction(params: {
  userId: number;
  payload: ExecuteRecommendedActionDto;
  signal?: AbortSignal;
}): Promise<ActivityDto> {
  const { userId, payload, signal } = params;
  const url = `/api/salesmen/${userId}/recommended-actions/execute`;
  const response = await api.post<ApiResponse<ActivityDto | null>>(url, payload, { signal });
  return ensureData(response, 'Recommended action could not be executed');
}
