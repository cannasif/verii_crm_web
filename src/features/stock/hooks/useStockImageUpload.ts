import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { stockApi } from '../api/stock-api';
import { queryKeys } from '../utils/query-keys';
import type { StockImageDto } from '../types';

export const useStockImageUpload = (): UseMutationResult<StockImageDto[], Error, { stockId: number; files: File[]; altTexts?: string[] }> => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stockId, files, altTexts }: { stockId: number; files: File[]; altTexts?: string[] }): Promise<StockImageDto[]> => {
      return await stockApi.uploadImages(stockId, files, altTexts);
    },
    onSuccess: (_, variables: { stockId: number; files: File[]; altTexts?: string[] }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.images(variables.stockId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(variables.stockId) });
      toast.success(t('stock.messages.uploadSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('stock.messages.error'));
    },
  });
};
