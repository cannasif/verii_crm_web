import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { ApiResponse } from '@/types/api';
import { demandApi } from '../api/demand-api';
import { queryKeys } from '../utils/query-keys';

type StartApprovalFlowVariables = {
  entityId: number;
  documentType: number;
  totalAmount: number;
  operationKey?: string;
};

export const useStartApprovalFlow = (): UseMutationResult<ApiResponse<boolean>, Error, StartApprovalFlowVariables, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ operationKey, ...data }: StartApprovalFlowVariables) =>
      demandApi.startApprovalFlow(data, operationKey),
    onSuccess: (_, variables) => {
      queryClient.setQueryData<{ status?: number } | undefined>(
        queryKeys.demand(variables.entityId),
        (current) => current ? { ...current, status: 1 } : current,
      );
      queryClient.setQueryData(queryKeys.approvalStatus(variables.entityId), 1);
      queryClient.invalidateQueries({ queryKey: queryKeys.demands() });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.demand(variables.entityId),
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvalStatus(variables.entityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvalFlowReport(variables.entityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.waitingApprovals() });
    },
  });
};
