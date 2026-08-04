import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  executeSalesmenRecommendedAction,
  getSalesmenErpMovements,
  getSalesmenCohort,
  getSalesmenOverview,
  getSalesmenAnalyticsSummary,
  getSalesmenAnalyticsCharts,
  getSalesmenPerformance,
  getSalesmenPerformanceWorkFeed,
  getVisibleSalesmen,
} from '../api/salesmen360Api';
import type {
  ExecuteRecommendedActionDto,
  Salesmen360ErpMovementDto,
  Salesmen360PeriodParams,
  Salesmen360VisibleUserDto,
} from '../types/salesmen360.types';

const OVERVIEW_STALE_MS = 30_000;
const SUMMARY_STALE_MS = 30_000;
const CHARTS_STALE_MS = 45_000;
const COHORT_STALE_MS = 300_000;
const VISIBLE_USERS_STALE_MS = 60_000;
const ERP_MOVEMENTS_STALE_MS = 30_000;
const PERFORMANCE_STALE_MS = 30_000;

export function useVisibleSalesmenQuery() {
  return useQuery<Salesmen360VisibleUserDto[]>({
    queryKey: ['salesmen360', 'visible-users'],
    queryFn: ({ signal }) => getVisibleSalesmen({ signal }),
    staleTime: VISIBLE_USERS_STALE_MS,
  });
}

function getPeriodQueryKey(periodParams?: Salesmen360PeriodParams) {
  return [periodParams?.period ?? 'month', periodParams?.startDate ?? '', periodParams?.endDate ?? ''];
}

export function useSalesmenOverviewQuery(userId: number, currency?: string, periodParams?: Salesmen360PeriodParams, enabled = true) {
  return useQuery({
    queryKey: ['salesmen360', 'overview', userId, currency ?? 'ALL', ...getPeriodQueryKey(periodParams)],
    queryFn: ({ signal }) =>
      getSalesmenOverview({
        userId,
        currency: currency && currency !== 'ALL' ? currency : undefined,
        periodParams,
        signal,
      }),
    staleTime: OVERVIEW_STALE_MS,
    enabled: enabled && userId >= 0,
  });
}

export function useSalesmenAnalyticsSummaryQuery(
  userId: number,
  currency?: string,
  periodParams?: Salesmen360PeriodParams,
  enabled = true,
) {
  return useQuery({
    queryKey: ['salesmen360', 'summary', userId, currency ?? 'ALL', ...getPeriodQueryKey(periodParams)],
    queryFn: ({ signal }) =>
      getSalesmenAnalyticsSummary({
        userId,
        currency: currency && currency !== 'ALL' ? currency : undefined,
        periodParams,
        signal,
      }),
    staleTime: SUMMARY_STALE_MS,
    enabled: userId > 0 && enabled,
  });
}

export function useSalesmenAnalyticsChartsQuery(
  userId: number,
  months = 12,
  currency?: string,
  periodParams?: Salesmen360PeriodParams,
  enabled = true,
) {
  return useQuery({
    queryKey: ['salesmen360', 'charts', userId, months, currency ?? 'ALL', ...getPeriodQueryKey(periodParams)],
    queryFn: ({ signal }) =>
      getSalesmenAnalyticsCharts({
        userId,
        months,
        currency: currency && currency !== 'ALL' ? currency : undefined,
        periodParams,
        signal,
      }),
    staleTime: CHARTS_STALE_MS,
    enabled: userId > 0 && enabled,
  });
}

export function useSalesmenPerformanceQuery(
  userId: number,
  userIds?: number[],
  currency?: string,
  periodParams?: Salesmen360PeriodParams,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      'salesmen360',
      'performance',
      userId,
      userIds?.join(',') ?? 'ALL_VISIBLE',
      currency ?? 'ALL',
      ...getPeriodQueryKey(periodParams),
    ],
    queryFn: ({ signal }) =>
      getSalesmenPerformance({
        userId,
        userIds,
        currency: currency && currency !== 'ALL' ? currency : undefined,
        periodParams,
        signal,
      }),
    staleTime: PERFORMANCE_STALE_MS,
    enabled: enabled && userId >= 0,
  });
}

export function useSalesmenPerformanceWorkFeedQuery(params: {
  userId: number;
  userIds?: number[];
  page: number;
  pageSize?: number;
  kind?: string;
  search?: string;
  searchFields?: string[];
  currency?: string;
  periodParams?: Salesmen360PeriodParams;
  enabled?: boolean;
}) {
  const { userId, userIds, page, pageSize = 20, kind, search, searchFields, currency, periodParams, enabled = true } = params;
  return useQuery({
    queryKey: [
      'salesmen360',
      'performance',
      'work-items',
      userId,
      userIds?.join(',') ?? 'ALL_VISIBLE',
      page,
      pageSize,
      kind ?? 'all',
      search ?? '',
      searchFields?.join(',') ?? '',
      currency ?? 'ALL',
      ...getPeriodQueryKey(periodParams),
    ],
    queryFn: ({ signal }) =>
      getSalesmenPerformanceWorkFeed({
        userId,
        userIds,
        page,
        pageSize,
        kind,
        search,
        searchFields,
        currency: currency && currency !== 'ALL' ? currency : undefined,
        periodParams,
        signal,
      }),
    staleTime: PERFORMANCE_STALE_MS,
    enabled: enabled && userId >= 0,
  });
}

export function useSalesmenCohortQuery(userId: number, months = 12, enabled = true) {
  return useQuery({
    queryKey: ['salesmen360', 'cohort', userId, months],
    queryFn: ({ signal }) => getSalesmenCohort({ userId, months, signal }),
    staleTime: COHORT_STALE_MS,
    enabled: userId > 0 && enabled,
  });
}

export function useSalesmenErpMovementsQuery(userId: number, enabled = true) {
  return useQuery<Salesmen360ErpMovementDto[]>({
    queryKey: ['salesmen360', 'erp-movements', userId],
    queryFn: ({ signal }) => getSalesmenErpMovements({ userId, signal }),
    staleTime: ERP_MOVEMENTS_STALE_MS,
    enabled: enabled && userId > 0,
  });
}

export function useExecuteSalesmenActionMutation(userId: number) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ExecuteRecommendedActionDto) => executeSalesmenRecommendedAction({ userId, payload }),
    onSuccess: () => {
      toast.success(t('common.actionExecuted'));
      queryClient.invalidateQueries({
        queryKey: ['salesmen360', 'overview', userId],
      });
      queryClient.invalidateQueries({
        queryKey: ['salesmen360', 'cohort', userId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('common.actionExecutionFailed'));
    },
  });
}
