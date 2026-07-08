import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { demandApi } from '../api/demand-api';
import { queryKeys } from '../utils/query-keys';
import type { ApprovalActionGetDto } from '../types/demand-types';
import type { PagedFilter, PagedResponse } from '@/types/api';
import type { DataTableSortDirection } from '@/components/shared';

interface UseWaitingApprovalsParams {
  pageNumber: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortDirection?: DataTableSortDirection;
  filters?: PagedFilter[];
  filterLogic?: 'and' | 'or';
}

export const useWaitingApprovals = (
  params: UseWaitingApprovalsParams
): UseQueryResult<PagedResponse<ApprovalActionGetDto>, Error> => {
  return useQuery({
    queryKey: queryKeys.waitingApprovals(params),
    queryFn: () => demandApi.getWaitingApprovals(params),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  });
};
