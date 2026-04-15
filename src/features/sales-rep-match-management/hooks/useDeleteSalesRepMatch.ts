import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { salesRepMatchApi } from '../api/sales-rep-match-api';
import { SALES_REP_MATCH_QUERY_KEYS } from '../utils/query-keys';

export const useDeleteSalesRepMatch = (): UseMutationResult<void, Error, number> => {
  const { t } = useTranslation('sales-rep-match-management');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => salesRepMatchApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALES_REP_MATCH_QUERY_KEYS.LIST], exact: false });
      toast.success(t('messages.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('messages.deleteError'));
    },
  });
};
