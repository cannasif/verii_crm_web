import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ApiResponse } from '@/types/api';
import { quotationApi } from '../api/quotation-api';
import { queryKeys } from '../utils/query-keys';
import type { ApproveActionDto } from '../types/quotation-types';

export const useApproveAction = (): UseMutationResult<ApiResponse<boolean>, Error, ApproveActionDto, unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (data: ApproveActionDto) => quotationApi.approve(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.waitingApprovals() });
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations() });
      toast.success(t('quotation.approval.approveSuccess'));
    },
    onError: (error: Error) => {
      let errorMessage = t('quotation.approval.approveError');
      
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
