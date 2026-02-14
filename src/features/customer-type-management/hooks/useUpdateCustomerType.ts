import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { customerTypeApi } from '../api/customer-type-api';
import { queryKeys, CUSTOMER_TYPE_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import type { UpdateCustomerTypeDto, CustomerTypeDto } from '../types/customer-type-types';

export const useUpdateCustomerType = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateCustomerTypeDto }) => {
      const result = await customerTypeApi.update(id, data);
      return result;
    },
    onSuccess: async (updatedCustomerType: CustomerTypeDto) => {
      await queryClient.refetchQueries({ 
        queryKey: [CUSTOMER_TYPE_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(updatedCustomerType.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.options() });
      toast.success(t('customerTypeManagement.messages.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('customerTypeManagement.messages.updateError'));
    },
  });
};
