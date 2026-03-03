import { useQuery } from '@tanstack/react-query';
import { googleIntegrationApi } from '../api/google-integration.api';

export const GOOGLE_STATUS_QUERY_KEY = ['google-integration', 'status'] as const;

export function useGoogleStatusQuery() {
  return useQuery({
    queryKey: GOOGLE_STATUS_QUERY_KEY,
    queryFn: () => googleIntegrationApi.getStatus(),
    staleTime: 30 * 1000,
  });
}
