import { useQuery } from '@tanstack/react-query';
import type { PagedParams } from '@/types/api';
import { googleIntegrationApi } from '../api/google-integration.api';

export const GOOGLE_LOGS_QUERY_KEY = ['google-integration', 'logs'] as const;

type GoogleLogsParams = Omit<PagedParams, 'filters'> & {
  filters?: PagedParams['filters'] | Record<string, unknown>;
  errorsOnly?: boolean;
};

export function useGoogleLogsQuery(params: GoogleLogsParams) {
  return useQuery({
    queryKey: [...GOOGLE_LOGS_QUERY_KEY, params],
    queryFn: () => googleIntegrationApi.getLogs(params),
    staleTime: 15 * 1000,
  });
}
