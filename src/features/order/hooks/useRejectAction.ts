import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ApiResponse } from '@/types/api';
import { orderApi } from '../api/order-api';
import { queryKeys } from '../utils/query-keys';
import type { RejectActionDto } from '../types/order-types';

export const useRejectAction = (): UseMutationResult<ApiResponse<boolean>, Error, RejectActionDto, unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (data: RejectActionDto) => orderApi.reject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.waitingApprovals() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      toast.success(t('order.approval.rejectSuccess'));
    },
    onError: (error: Error) => {
      let errorMessage = t('order.approval.rejectError');
      
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
