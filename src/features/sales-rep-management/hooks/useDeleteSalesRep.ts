import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { salesRepApi } from '../api/sales-rep-api';
import { SALES_REP_QUERY_KEYS } from '../utils/query-keys';

export const useDeleteSalesRep = (): UseMutationResult<void, Error, number> => {
  const { t } = useTranslation('sales-rep-management');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => salesRepApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALES_REP_QUERY_KEYS.LIST], exact: false });
      toast.success(t('messages.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('messages.deleteError'));
    },
  });
};
