import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ApiResponse } from '@/types/api';
import { demandApi } from '../api/demand-api';
import { queryKeys } from '../utils/query-keys';

export const useStartApprovalFlow = (): UseMutationResult<ApiResponse<boolean>, Error, { entityId: number; documentType: number; totalAmount: number }, unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['demand', 'common']);

  return useMutation({
    mutationFn: (data: { entityId: number; documentType: number; totalAmount: number }) => 
      demandApi.startApprovalFlow(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.demands() });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.demand(variables.entityId),
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.waitingApprovals() });
      toast.success(t('demand.approval.startSuccess'));
    },
    onError: (error: Error) => {
      let errorMessage = t('demand.approval.startError');
      
      if (error.message) {
        try {
          const parsedError = JSON.parse(error.message);
          if (parsedError?.errors && Array.isArray(parsedError.errors) && parsedError.errors.length > 0) {
            errorMessage = parsedError.errors.join(', ');
          } else if (parsedError?.message) {
            errorMessage = parsedError.message;
          } else if (parsedError?.exceptionMessage) {
            errorMessage = parsedError.exceptionMessage;
          } else {
            errorMessage = error.message;
          }
        } catch {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    },
  });
};
