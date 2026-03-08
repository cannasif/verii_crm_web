import { useQuery } from '@tanstack/react-query';
import type { PagedParams } from '@/types/api';
import { outlookIntegrationApi } from '../api/outlook-integration.api';

export const OUTLOOK_LOGS_QUERY_KEY = ['outlook-integration', 'logs'] as const;

type OutlookLogsParams = Omit<PagedParams, 'filters'> & {
  filters?: PagedParams['filters'] | Record<string, unknown>;
  errorsOnly?: boolean;
};

export function useOutlookLogsQuery(params: OutlookLogsParams) {
  return useQuery({
    queryKey: [...OUTLOOK_LOGS_QUERY_KEY, params],
    queryFn: () => outlookIntegrationApi.getLogs(params),
    staleTime: 15 * 1000,
  });
}
