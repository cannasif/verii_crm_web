import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { stockApi } from '../api/stock-api';
import { STOCK_QUERY_KEYS } from '../utils/query-keys';

export const useCreateErpStock = () => {
  const { t } = useTranslation(['stock', 'common']);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => stockApi.createErpStock(id),
    onSuccess: async (stock) => {
      await queryClient.invalidateQueries({ queryKey: [STOCK_QUERY_KEYS.LIST] });
      await queryClient.invalidateQueries({ queryKey: [STOCK_QUERY_KEYS.LIST_WITH_IMAGES] });
      await queryClient.invalidateQueries({ queryKey: [STOCK_QUERY_KEYS.DETAIL, stock.id] });
      toast.success(t('messages.erpCreateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('messages.erpCreateError'));
    },
  });
};
