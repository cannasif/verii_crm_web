import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { quotationApi } from '../api/quotation-api';
import { queryKeys } from '../utils/query-keys';
import type { ApprovalActionGetDto } from '../types/quotation-types';

export const useWaitingApprovals = (): UseQueryResult<ApprovalActionGetDto[], Error> => {
  return useQuery({
    queryKey: queryKeys.waitingApprovals(),
    queryFn: () => quotationApi.getWaitingApprovals(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  });
};
