import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { stockApi } from '../api/stock-api';
import { queryKeys } from '../utils/query-keys';
import type { StockDetailCreateDto, StockDetailGetDto } from '../types';

export const useStockDetailCreate = (): UseMutationResult<StockDetailGetDto, Error, StockDetailCreateDto> => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: StockDetailCreateDto): Promise<StockDetailGetDto> => {
      return await stockApi.createDetail(data);
    },
    onSuccess: (data: StockDetailGetDto) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.detailByStock(data.stockId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(data.stockId) });
      toast.success(t('stock.messages.detailCreateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('stock.messages.error'));
    },
  });
};
