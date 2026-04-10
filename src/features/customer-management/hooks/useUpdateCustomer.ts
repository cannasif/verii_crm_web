import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { customerApi } from '../api/customer-api';
import { queryKeys, CUSTOMER_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import type { UpdateCustomerDto, CustomerDto } from '../types/customer-types';

export const useUpdateCustomer = () => {
  const { t } = useTranslation(['customer-management', 'common']);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateCustomerDto }) => {
      const result = await customerApi.update(id, data);
      return result;
    },
    onSuccess: async (updatedCustomer: CustomerDto) => {
      await queryClient.refetchQueries({ 
        queryKey: [CUSTOMER_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(updatedCustomer.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      toast.success(t('customerManagement.messages.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('customerManagement.messages.updateError'));
    },
  });
};
