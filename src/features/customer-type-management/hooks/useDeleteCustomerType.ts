import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { customerTypeApi } from '../api/customer-type-api';
import { queryKeys, CUSTOMER_TYPE_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';

export const useDeleteCustomerType = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await customerTypeApi.delete(id);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ 
        queryKey: [CUSTOMER_TYPE_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.options() });
      toast.success(t('customerTypeManagement.messages.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('customerTypeManagement.messages.deleteError'));
    },
  });
};
