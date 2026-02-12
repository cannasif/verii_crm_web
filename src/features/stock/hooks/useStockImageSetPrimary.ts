import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { stockApi } from '../api/stock-api';
import { queryKeys } from '../utils/query-keys';
import type { StockImageDto } from '../types';

export const useStockImageSetPrimary = (): UseMutationResult<StockImageDto, Error, { id: number; stockId: number }> => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: number; stockId: number }): Promise<StockImageDto> => {
      return await stockApi.setPrimaryImage(id);
    },
    onSuccess: (_, variables: { id: number; stockId: number }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.images(variables.stockId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(variables.stockId) });
      toast.success(t('stock.messages.setPrimarySuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('stock.messages.error'));
    },
  });
};
