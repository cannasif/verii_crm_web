import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { stockApi } from '../api/stock-api';
import { STOCK_QUERY_KEYS } from '../utils/query-keys';
import type { StockFavoriteToggleDto, StockFavoriteToggleResultDto } from '../types';

type ToggleStockFavoriteVariables = {
  stockId: number;
  data: StockFavoriteToggleDto;
};

export const useToggleStockFavorite = (): UseMutationResult<
  StockFavoriteToggleResultDto,
  Error,
  ToggleStockFavoriteVariables
> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['stock', 'common']);

  return useMutation({
    mutationFn: ({ stockId, data }) => stockApi.toggleFavorite(stockId, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [STOCK_QUERY_KEYS.LIST], exact: false });
      queryClient.invalidateQueries({ queryKey: [STOCK_QUERY_KEYS.LIST_WITH_IMAGES], exact: false });
      queryClient.invalidateQueries({ queryKey: [STOCK_QUERY_KEYS.DETAIL, result.stockId] });
      toast.success(result.isFavorite ? t('messages.favoriteAddSuccess') : t('messages.favoriteRemoveSuccess'));
    },
    onError: (error) => {
      toast.error(error.message || t('messages.favoriteToggleError'));
    },
  });
};
