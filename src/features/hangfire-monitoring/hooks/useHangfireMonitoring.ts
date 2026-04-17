import { useQuery } from '@tanstack/react-query';
import { hangfireMonitoringApi } from '../api/hangfireMonitoring.api';

const REFRESH_INTERVAL_MS = 60_000;

export const HANGFIRE_QUERY_KEYS = {
  STATS: ['hangfire', 'stats'] as const,
  FAILED: (from: number, count: number) => ['hangfire', 'failed', from, count] as const,
  SUCCEEDED: (from: number, count: number) => ['hangfire', 'succeeded', from, count] as const,
  DEAD_LETTER: (from: number, count: number) => ['hangfire', 'dead-letter', from, count] as const,
  RECURRING: ['hangfire', 'recurring-jobs'] as const,
};

export function useHangfireStatsQuery() {
  return useQuery({
    queryKey: HANGFIRE_QUERY_KEYS.STATS,
    queryFn: () => hangfireMonitoringApi.getStats(),
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
}

export function useHangfireFailedJobsQuery(from: number, count: number) {
  return useQuery({
    queryKey: HANGFIRE_QUERY_KEYS.FAILED(from, count),
    queryFn: () => hangfireMonitoringApi.getFailed(from, count),
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
}

export function useHangfireSuccessJobsQuery(from: number, count: number) {
  return useQuery({
    queryKey: HANGFIRE_QUERY_KEYS.SUCCEEDED(from, count),
    queryFn: () => hangfireMonitoringApi.getSuccesses(from, count),
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
}

export function useHangfireDeadLetterQuery(from: number, count: number) {
  return useQuery({
    queryKey: HANGFIRE_QUERY_KEYS.DEAD_LETTER(from, count),
    refetchInterval: REFRESH_INTERVAL_MS,
    queryFn: () => hangfireMonitoringApi.getDeadLetter(from, count),
    refetchIntervalInBackground: false,
  });
}

export function useHangfireRecurringJobsQuery() {
  return useQuery({
    queryKey: HANGFIRE_QUERY_KEYS.RECURRING,
    queryFn: () => hangfireMonitoringApi.getRecurringJobs(),
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
}
