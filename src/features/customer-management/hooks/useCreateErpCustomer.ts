import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { customerApi } from '../api/customer-api';
import { queryKeys, CUSTOMER_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';

export const useCreateErpCustomer = () => {
  const { t } = useTranslation(['customer-management', 'common']);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => customerApi.createErpCustomer(id),
    onSuccess: async (customer) => {
      await queryClient.refetchQueries({
        queryKey: [CUSTOMER_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(customer.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      toast.success(t('messages.erpCreateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('messages.erpCreateError'));
    },
  });
};
