import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { ApiResponse } from '@/types/api';
import { quotationApi } from '../api/quotation-api';
import { queryKeys } from '../utils/query-keys';
import type { ApproveActionDto } from '../types/quotation-types';

export interface ApproveActionVariables extends ApproveActionDto {
  operationKey: string;
}

export const useApproveAction = (): UseMutationResult<ApiResponse<boolean>, Error, ApproveActionVariables, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ operationKey, ...data }: ApproveActionVariables) => quotationApi.approve(data, operationKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.waitingApprovals() });
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations() });
    },
  });
};
