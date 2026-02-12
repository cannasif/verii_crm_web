import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  executeSalesmenRecommendedAction,
  getSalesmenCohort,
  getSalesmenOverview,
  getSalesmenAnalyticsSummary,
  getSalesmenAnalyticsCharts,
} from '../api/salesmen360Api';
import type { ExecuteRecommendedActionDto } from '../types/salesmen360.types';

const OVERVIEW_STALE_MS = 30_000;
const SUMMARY_STALE_MS = 30_000;
const CHARTS_STALE_MS = 45_000;
const COHORT_STALE_MS = 300_000;

export function useSalesmenOverviewQuery(userId: number, currency?: string) {
  return useQuery({
    queryKey: ['salesmen360', 'overview', userId, currency ?? 'ALL'],
    queryFn: ({ signal }) =>
      getSalesmenOverview({ userId, currency: currency && currency !== 'ALL' ? currency : undefined, signal }),
    staleTime: OVERVIEW_STALE_MS,
    enabled: userId > 0,
  });
}

export function useSalesmenAnalyticsSummaryQuery(userId: number, currency?: string) {
  return useQuery({
    queryKey: ['salesmen360', 'summary', userId, currency ?? 'ALL'],
    queryFn: ({ signal }) =>
      getSalesmenAnalyticsSummary({
        userId,
        currency: currency && currency !== 'ALL' ? currency : undefined,
        signal,
      }),
    staleTime: SUMMARY_STALE_MS,
    enabled: userId > 0,
  });
}

export function useSalesmenAnalyticsChartsQuery(
  userId: number,
  months = 12,
  currency?: string
) {
  return useQuery({
    queryKey: ['salesmen360', 'charts', userId, months, currency ?? 'ALL'],
    queryFn: ({ signal }) =>
      getSalesmenAnalyticsCharts({
        userId,
        months,
        currency: currency && currency !== 'ALL' ? currency : undefined,
        signal,
      }),
    staleTime: CHARTS_STALE_MS,
    enabled: userId > 0,
  });
}

export function useSalesmenCohortQuery(userId: number, months = 12) {
  return useQuery({
    queryKey: ['salesmen360', 'cohort', userId, months],
    queryFn: ({ signal }) => getSalesmenCohort({ userId, months, signal }),
    staleTime: COHORT_STALE_MS,
    enabled: userId > 0,
  });
}

export function useExecuteSalesmenActionMutation(userId: number) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ExecuteRecommendedActionDto) =>
      executeSalesmenRecommendedAction({ userId, payload }),
    onSuccess: () => {
      toast.success(t('common.actionExecuted'));
      queryClient.invalidateQueries({ queryKey: ['salesmen360', 'overview', userId] });
      queryClient.invalidateQueries({ queryKey: ['salesmen360', 'cohort', userId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('common.actionExecutionFailed'));
    },
  });
}
