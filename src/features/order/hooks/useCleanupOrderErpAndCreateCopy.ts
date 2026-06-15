import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ApiResponse } from '@/types/api';
import { orderApi } from '../api/order-api';
import { queryKeys } from '../utils/query-keys';
import type { OrderErpCleanupRecreateDto, OrderGetDto } from '../types/order-types';

interface CleanupOrderErpVariables {
  orderId: number;
  data: OrderErpCleanupRecreateDto;
}

export const useCleanupOrderErpAndCreateCopy = (): UseMutationResult<
  ApiResponse<OrderGetDto>,
  Error,
  CleanupOrderErpVariables,
  unknown
> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['order', 'common']);

  return useMutation({
    mutationFn: ({ orderId, data }) => orderApi.cleanupErpAndCreateCopy(orderId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      toast.success(t('list.erpCleanupSuccess', { defaultValue: 'ERP kaydı temizlendi ve yeni sipariş kopyası oluşturuldu.' }));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('list.erpCleanupError', { defaultValue: 'ERP kaydı temizlenemedi.' }));
    },
  });
};
