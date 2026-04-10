import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { customerApi } from '../api/customer-api';
import { queryKeys, CUSTOMER_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';

export const useDeleteCustomer = () => {
  const { t } = useTranslation(['customer-management', 'common']);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await customerApi.delete(id);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ 
        queryKey: [CUSTOMER_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      toast.success(t('customerManagement.messages.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('customerManagement.messages.deleteError'));
    },
  });
};
