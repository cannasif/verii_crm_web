import { useQuery } from '@tanstack/react-query';
import { approvalApi } from '../api/approval-api';
import { queryKeys } from '../utils/query-keys';
import type { ApprovalQueueGetDto } from '../types/approval-types';

export const usePendingApprovals = () => {
  return useQuery<ApprovalQueueGetDto[]>({
    queryKey: queryKeys.pending(),
    queryFn: () => approvalApi.getPending(),
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    staleTime: 5 * 60 * 1000,
  });
};
