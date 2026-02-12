import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { stockApi } from '../api/stock-api';
import { queryKeys } from '../utils/query-keys';
import type { StockDetailUpdateDto, StockDetailGetDto } from '../types';

export const useStockDetailUpdate = (): UseMutationResult<StockDetailGetDto, Error, { id: number; data: StockDetailUpdateDto }> => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: StockDetailUpdateDto }): Promise<StockDetailGetDto> => {
      return await stockApi.updateDetail(id, data);
    },
    onSuccess: (data: StockDetailGetDto) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.detailByStock(data.stockId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(data.stockId) });
      toast.success(t('stock.messages.detailUpdateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('stock.messages.error'));
    },
  });
};
