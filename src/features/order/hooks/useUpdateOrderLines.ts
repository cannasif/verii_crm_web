import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { orderApi } from '../api/order-api';
import { queryKeys } from '../utils/query-keys';
import type { OrderLineGetDto } from '../types/order-types';

export const useUpdateOrderLines = (
  orderId: number
): UseMutationResult<OrderLineGetDto[], Error, OrderLineGetDto[], unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (dtos: OrderLineGetDto[]) => orderApi.updateOrderLines(dtos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orderLines(orderId) });
      toast.success(t('order.lines.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('order.lines.updateError'));
    },
  });
};
