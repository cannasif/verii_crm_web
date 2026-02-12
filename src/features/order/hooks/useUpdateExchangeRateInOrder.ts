import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ApiResponse } from '@/types/api';
import { orderApi } from '../api/order-api';
import { queryKeys } from '../utils/query-keys';
import type { OrderExchangeRateGetDto } from '../types/order-types';

export const useUpdateExchangeRateInOrder = (
  orderId: number
): UseMutationResult<ApiResponse<boolean>, Error, OrderExchangeRateGetDto[], unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (dtos: OrderExchangeRateGetDto[]) =>
      orderApi.updateExchangeRateInOrder(dtos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orderExchangeRates(orderId) });
      toast.success(t('order.exchangeRates.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('order.exchangeRates.updateError'));
    },
  });
};
