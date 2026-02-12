import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { orderApi } from '../api/order-api';
import { queryKeys } from '../utils/query-keys';
import type { CreateOrderLineDto, OrderLineGetDto } from '../types/order-types';

export const useCreateOrderLines = (
  orderId: number
): UseMutationResult<OrderLineGetDto[], Error, CreateOrderLineDto[], unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (dtos: CreateOrderLineDto[]) => orderApi.createOrderLines(dtos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orderLines(orderId) });
      toast.success(t('order.lines.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('order.lines.createError'));
    },
  });
};
