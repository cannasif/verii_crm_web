import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { ApiResponse } from '@/types/api';
import { quotationApi } from '../api/quotation-api';
import { queryKeys } from '../utils/query-keys';

export interface StartApprovalFlowVariables {
  entityId: number;
  documentType: number;
  totalAmount: number;
  operationKey: string;
}

export const useStartApprovalFlow = (): UseMutationResult<ApiResponse<boolean>, Error, StartApprovalFlowVariables, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ operationKey, ...data }: StartApprovalFlowVariables) =>
      quotationApi.startApprovalFlow(data, operationKey),
    onSuccess: (_, variables) => {
      queryClient.setQueryData<{ status?: number } | undefined>(
        queryKeys.quotation(variables.entityId),
        (current) => current ? { ...current, status: 1 } : current,
      );
      queryClient.setQueryData(queryKeys.approvalStatus(variables.entityId), 1);
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations() });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.quotation(variables.entityId),
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvalStatus(variables.entityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvalFlowReport(variables.entityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.waitingApprovals() });
    },
  });
};
