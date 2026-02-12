import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ApiResponse } from '@/types/api';
import { orderApi } from '../api/order-api';
import { queryKeys } from '../utils/query-keys';
import type { OrderBulkCreateDto, OrderGetDto } from '../types/order-types';

export const useUpdateOrderBulk = (): UseMutationResult<ApiResponse<OrderGetDto>, Error, { id: number; data: OrderBulkCreateDto }, unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: OrderBulkCreateDto }) => orderApi.updateBulk(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      toast.success(t('order.update.success'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('order.update.error'));
    },
  });
};
