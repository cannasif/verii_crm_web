import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { quotationApi } from '../api/quotation-api';
import { queryKeys } from '../utils/query-keys';
import type { ApprovalActionGetDto } from '../types/quotation-types';
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
    queryFn: () => quotationApi.getWaitingApprovals(params),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  });
};
