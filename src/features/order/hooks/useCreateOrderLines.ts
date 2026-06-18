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
    onSuccess: (created) => {
      queryClient.setQueryData<OrderLineGetDto[]>(
        queryKeys.orderLines(orderId),
        (current) => {
          const existing = current ?? [];
          const createdIds = new Set(
            created.map((line) => line.id).filter((id): id is number => Number.isFinite(id) && id > 0)
          );
          const withoutReplaced = existing.filter((line) => !createdIds.has(line.id));
          return [...withoutReplaced, ...created];
        },
      );
      toast.success(t('order.lines.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('order.lines.createError'));
    },
  });
};
