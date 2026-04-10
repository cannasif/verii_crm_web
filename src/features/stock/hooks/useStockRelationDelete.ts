import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { stockApi } from '../api/stock-api';
import { queryKeys } from '../utils/query-keys';

export const useStockRelationDelete = (): UseMutationResult<void, Error, { id: number; stockId: number }> => {
  const { t } = useTranslation(['stock', 'common']);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: number; stockId: number }): Promise<void> => {
      return await stockApi.deleteRelation(id);
    },
    onSuccess: (_, variables: { id: number; stockId: number }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.relations(variables.stockId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(variables.stockId) });
      toast.success(t('stock.messages.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('stock.messages.error'));
    },
  });
};
