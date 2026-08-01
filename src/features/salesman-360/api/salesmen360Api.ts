import type { ApiResponse } from '@/types/api';
import type {
  ActivityDto,
  CohortRetentionDto,
  Salesmen360OverviewDto,
  Salesmen360AnalyticsSummaryDto,
  Salesmen360AnalyticsChartsDto,
  Salesmen360VisibleUserDto,
  Salesmen360ErpMovementDto,
  ExecuteRecommendedActionDto,
  Salesmen360PeriodParams,
  Salesmen360PerformanceDto,
  Salesmen360WorkFeedDto,
} from '../types/salesmen360.types';
import { api } from '@/lib/axios';

function ensureData<T>(response: ApiResponse<T | null>, fallbackMessage: string): T {
  if (!response.success || response.data == null) {
    throw new Error(response.message ?? response.exceptionMessage ?? fallbackMessage);
  }
  return response.data;
}

function appendPeriodParams(search: URLSearchParams, periodParams?: Salesmen360PeriodParams): void {
  const period = periodParams?.period ?? 'month';
  search.set('period', period);
  if (period === 'custom') {
    if (periodParams?.startDate) search.set('startDate', periodParams.startDate);
    if (periodParams?.endDate) search.set('endDate', periodParams.endDate);
  }
}

export async function getSalesmenOverview(params: {
  userId: number;
  currency?: string;
  periodParams?: Salesmen360PeriodParams;
  signal?: AbortSignal;
}): Promise<Salesmen360OverviewDto> {
  const { userId, currency, periodParams, signal } = params;
  const search = new URLSearchParams();
  appendPeriodParams(search, periodParams);
  if (currency != null && currency !== '') {
    search.set('currency', currency);
  }
  const url = userId === 0 ? `/api/salesmen/overview?${search.toString()}` : `/api/salesmen/${userId}/overview?${search.toString()}`;
  const response = await api.get<ApiResponse<Salesmen360OverviewDto | null>>(url, {
    signal,
  });
  return ensureData(response, 'Overview could not be loaded');
}

export async function getVisibleSalesmen(params?: { signal?: AbortSignal }): Promise<Salesmen360VisibleUserDto[]> {
  const response = await api.get<ApiResponse<Salesmen360VisibleUserDto[] | null>>('/api/salesmen/visible-users', {
    signal: params?.signal,
  });
  return ensureData(response, 'Visible salesmen could not be loaded');
}

export async function getSalesmenErpMovements(params: { userId: number; signal?: AbortSignal }): Promise<Salesmen360ErpMovementDto[]> {
  const { userId, signal } = params;
  const response = await api.get<ApiResponse<Salesmen360ErpMovementDto[] | null>>(`/api/salesmen/${userId}/erp-movements`, {
    signal,
  });
  return ensureData(response, 'ERP movements could not be loaded');
}

export async function getSalesmenAnalyticsSummary(params: {
  userId: number;
  currency?: string;
  periodParams?: Salesmen360PeriodParams;
  signal?: AbortSignal;
}): Promise<Salesmen360AnalyticsSummaryDto> {
  const { userId, currency, periodParams, signal } = params;
  const search = new URLSearchParams();
  appendPeriodParams(search, periodParams);
  if (currency != null && currency !== '') {
    search.set('currency', currency);
  }
  const url = `/api/salesmen/${userId}/analytics/summary?${search.toString()}`;
  const response = await api.get<ApiResponse<Salesmen360AnalyticsSummaryDto | null>>(url, {
    signal,
  });
  return ensureData(response, 'Analytics summary could not be loaded');
}

export async function getSalesmenAnalyticsCharts(params: {
  userId: number;
  months?: number;
  currency?: string;
  periodParams?: Salesmen360PeriodParams;
  signal?: AbortSignal;
}): Promise<Salesmen360AnalyticsChartsDto> {
  const { userId, months = 12, currency, periodParams, signal } = params;
  const search = new URLSearchParams({ months: String(months) });
  appendPeriodParams(search, periodParams);
  if (currency != null && currency !== '') {
    search.set('currency', currency);
  }
  const url = `/api/salesmen/${userId}/analytics/charts?${search.toString()}`;
  const response = await api.get<ApiResponse<Salesmen360AnalyticsChartsDto | null>>(url, {
    signal,
  });
  return ensureData(response, 'Analytics charts could not be loaded');
}

export async function getSalesmenPerformance(params: {
  userId: number;
  userIds?: number[];
  currency?: string;
  periodParams?: Salesmen360PeriodParams;
  signal?: AbortSignal;
}): Promise<Salesmen360PerformanceDto> {
  const { userId, userIds, currency, periodParams, signal } = params;
  const search = new URLSearchParams();
  appendPeriodParams(search, periodParams);
  if (currency != null && currency !== '') {
    search.set('currency', currency);
  }
  userIds?.forEach((selectedUserId) => search.append('userIds', String(selectedUserId)));
  const response = await api.get<ApiResponse<Salesmen360PerformanceDto | null>>(
    `/api/salesmen/${userId}/performance?${search.toString()}`,
    { signal },
  );
  return ensureData(response, 'Sales performance could not be loaded');
}

export async function getSalesmenPerformanceWorkFeed(params: {
  userId: number;
  userIds?: number[];
  page?: number;
  pageSize?: number;
  kind?: string;
  search?: string;
  currency?: string;
  periodParams?: Salesmen360PeriodParams;
  signal?: AbortSignal;
}): Promise<Salesmen360WorkFeedDto> {
  const { userId, userIds, page = 1, pageSize = 20, kind, search: searchTerm, currency, periodParams, signal } = params;
  const search = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  appendPeriodParams(search, periodParams);
  if (kind) search.set('kind', kind);
  if (searchTerm?.trim()) search.set('search', searchTerm.trim());
  if (currency) search.set('currency', currency);
  userIds?.forEach((selectedUserId) => search.append('userIds', String(selectedUserId)));

  const response = await api.get<ApiResponse<Salesmen360WorkFeedDto | null>>(
    `/api/salesmen/${userId}/performance/work-items?${search.toString()}`,
    { signal },
  );
  return ensureData(response, 'Sales performance work items could not be loaded');
}

export async function getSalesmenCohort(params: { userId: number; months?: number; signal?: AbortSignal }): Promise<CohortRetentionDto[]> {
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
