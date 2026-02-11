import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { orderApi } from '../api/order-api';
import { queryKeys } from '../utils/query-keys';
import type { ApprovalActionGetDto } from '../types/order-types';

export const useWaitingApprovals = (): UseQueryResult<ApprovalActionGetDto[], Error> => {
  return useQuery({
    queryKey: queryKeys.waitingApprovals(),
    queryFn: () => orderApi.getWaitingApprovals(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  });
};
