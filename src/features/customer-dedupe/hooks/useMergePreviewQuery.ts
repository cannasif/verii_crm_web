import { useQuery } from '@tanstack/react-query';
import { customerDedupeApi } from '../api/customerDedupeApi';

export function useMergePreviewQuery(firstCustomerId: number, secondCustomerId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['customer-dedupe', 'preview', firstCustomerId, secondCustomerId],
    queryFn: () => customerDedupeApi.getMergePreview(firstCustomerId, secondCustomerId),
    enabled: enabled && firstCustomerId > 0 && secondCustomerId > 0,
    staleTime: 30_000,
  });
}
