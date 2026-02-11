import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { salesTypeApi } from '../api/sales-type-api';
import { SALES_TYPE_QUERY_KEYS } from '../utils/query-keys';

export const useDeleteSalesType = (): UseMutationResult<void, Error, number> => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => salesTypeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALES_TYPE_QUERY_KEYS.LIST], exact: false });
      toast.success(t('salesTypeManagement.messages.deleteSuccess', 'Satış tipi başarıyla silindi'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('salesTypeManagement.messages.deleteError', 'Satış tipi silinemedi'));
    },
  });
};
