import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { stockApi } from '../api/stock-api';
import { queryKeys } from '../utils/query-keys';
import type { StockRelationCreateDto, StockRelationDto } from '../types';

export const useStockRelationCreate = (): UseMutationResult<StockRelationDto, Error, StockRelationCreateDto> => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: StockRelationCreateDto): Promise<StockRelationDto> => {
      return await stockApi.createRelation(data);
    },
    onSuccess: (data: StockRelationDto) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.relations(data.stockId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(data.stockId) });
      toast.success(t('stock.messages.relationCreateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('stock.messages.error'));
    },
  });
};
