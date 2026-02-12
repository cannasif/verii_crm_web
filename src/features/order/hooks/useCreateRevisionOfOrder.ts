import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ApiResponse } from '@/types/api';
import { orderApi } from '../api/order-api';
import { queryKeys } from '../utils/query-keys';
import type { OrderGetDto } from '../types/order-types';

export const useCreateRevisionOfOrder = (): UseMutationResult<ApiResponse<OrderGetDto>, Error, number, unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (orderId: number) => orderApi.createRevisionOfOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      toast.success(t('order.revision.success'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('order.revision.error'));
    },
  });
};
