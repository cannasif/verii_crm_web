import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { orderApi } from '../api/order-api';
import { queryKeys } from '../utils/query-keys';

export const useDeleteOrderLine = (
  orderId: number
): UseMutationResult<void, Error, number, unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: number) => orderApi.deleteOrderLine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orderLines(orderId) });
      toast.success(t('order.lines.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('order.lines.deleteError'));
    },
  });
};
