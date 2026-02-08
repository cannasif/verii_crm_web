import { useQuery } from '@tanstack/react-query';
import { customerDedupeApi } from '../api/customerDedupeApi';

const CANDIDATES_QUERY_KEY = ['customer-dedupe', 'candidates'] as const;

export interface UseDuplicateCandidatesQueryParams {
  enabled?: boolean;
}

export function useDuplicateCandidatesQuery(
  params?: UseDuplicateCandidatesQueryParams
): ReturnType<typeof useQuery<Awaited<ReturnType<typeof customerDedupeApi.getDuplicateCandidates>>>> {
  return useQuery({
    queryKey: CANDIDATES_QUERY_KEY,
    queryFn: () => customerDedupeApi.getDuplicateCandidates(),
    staleTime: 60_000,
    retry: 1,
    enabled: params?.enabled ?? true,
  });
}

export { CANDIDATES_QUERY_KEY };
