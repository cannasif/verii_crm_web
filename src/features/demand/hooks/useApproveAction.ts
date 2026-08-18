import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { ApiResponse } from '@/types/api';
import { demandApi } from '../api/demand-api';
import { queryKeys } from '../utils/query-keys';
import type { ApproveActionDto } from '../types/demand-types';

type ApproveActionVariables = ApproveActionDto & { operationKey?: string };

export const useApproveAction = (): UseMutationResult<ApiResponse<boolean>, Error, ApproveActionVariables, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ operationKey, ...data }: ApproveActionVariables) => demandApi.approve(data, operationKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.waitingApprovals() });
      queryClient.invalidateQueries({ queryKey: queryKeys.demands() });
    },
  });
};
