import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { demandApi } from '../api/demand-api';
import { queryKeys } from '../utils/query-keys';
import type { ApprovalActionGetDto } from '../types/demand-types';

export const useWaitingApprovals = (): UseQueryResult<ApprovalActionGetDto[], Error> => {
  return useQuery({
    queryKey: queryKeys.waitingApprovals(),
    queryFn: () => demandApi.getWaitingApprovals(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  });
};
