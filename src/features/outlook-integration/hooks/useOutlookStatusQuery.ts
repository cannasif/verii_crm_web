import { useQuery } from '@tanstack/react-query';
import { outlookIntegrationApi } from '../api/outlook-integration.api';

export const OUTLOOK_STATUS_QUERY_KEY = ['outlook-integration', 'status'] as const;

export function useOutlookStatusQuery() {
  return useQuery({
    queryKey: OUTLOOK_STATUS_QUERY_KEY,
    queryFn: () => outlookIntegrationApi.getStatus(),
    staleTime: 30 * 1000,
  });
}
