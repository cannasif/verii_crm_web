import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { customerTypeApi } from '../api/customer-type-api';
import { queryKeys, CUSTOMER_TYPE_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import type { CreateCustomerTypeDto } from '../types/customer-type-types';

export const useCreateCustomerType = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCustomerTypeDto) => {
      const result = await customerTypeApi.create(data);
      return result;
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ 
        queryKey: [CUSTOMER_TYPE_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      toast.success(t('customerTypeManagement.messages.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('customerTypeManagement.messages.createError'));
    },
  });
};
