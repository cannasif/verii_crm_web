import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ApiResponse } from '@/types/api';
import { quotationApi } from '../api/quotation-api';
import { queryKeys } from '../utils/query-keys';

export const useStartApprovalFlow = (): UseMutationResult<ApiResponse<boolean>, Error, { entityId: number; documentType: number; totalAmount: number }, unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['quotation', 'common']);

  return useMutation({
    mutationFn: (data: { entityId: number; documentType: number; totalAmount: number }) => 
      quotationApi.startApprovalFlow(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations() });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.quotation(variables.entityId),
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.waitingApprovals() });
      toast.success(t('approval.startSuccess'));
    },
    onError: (error: Error) => {
      let errorMessage = t('approval.startError');
      
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
