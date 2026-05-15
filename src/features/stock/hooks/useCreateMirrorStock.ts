import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { stockApi } from '../api/stock-api';
import type { StockCreateDto } from '../types';
import { STOCK_QUERY_KEYS } from '../utils/query-keys';

export const useCreateMirrorStock = () => {
  const { t } = useTranslation(['stock', 'common']);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: StockCreateDto) => stockApi.createMirrorStock(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [STOCK_QUERY_KEYS.LIST] });
      await queryClient.invalidateQueries({ queryKey: [STOCK_QUERY_KEYS.LIST_WITH_IMAGES] });
      toast.success(t('messages.mirrorCreateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('messages.mirrorCreateError'));
    },
  });
};
