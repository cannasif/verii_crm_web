import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ApiResponse } from '@/types/api';
import { orderApi } from '../api/order-api';
import { queryKeys } from '../utils/query-keys';
import { resolveStartApprovalFlowErrorMessage } from '@/lib/resolve-start-approval-flow-error-message';

export const useStartApprovalFlow = (): UseMutationResult<ApiResponse<boolean>, Error, { entityId: number; documentType: number; totalAmount: number }, unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (data: { entityId: number; documentType: number; totalAmount: number }) => 
      orderApi.startApprovalFlow(data),
    onSuccess: (_, variables) => {
      queryClient.setQueryData<{ status?: number } | undefined>(
        queryKeys.order(variables.entityId),
        (current) => current ? { ...current, status: 1 } : current,
      );
      queryClient.setQueryData(queryKeys.approvalStatus(variables.entityId), 1);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.order(variables.entityId),
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvalStatus(variables.entityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvalFlowReport(variables.entityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.waitingApprovals() });
      toast.success(t('order.approval.startSuccess'));
    },
    onError: (error: Error) => {
      toast.error(
        resolveStartApprovalFlowErrorMessage(error, (key) => t(key), 'order.approval'),
      );
    },
  });
};
