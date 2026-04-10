import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { customerApi } from '../api/customer-api';
import { queryKeys, CUSTOMER_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import type { CreateCustomerDto } from '../types/customer-types';

export const useCreateCustomer = () => {
  const { t } = useTranslation(['customer-management', 'common']);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCustomerDto) => {
      const result = await customerApi.create(data);
      return result;
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ 
        queryKey: [CUSTOMER_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      toast.success(t('customerManagement.messages.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('customerManagement.messages.createError'));
    },
  });
};
