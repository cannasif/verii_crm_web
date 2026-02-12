import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { shippingAddressApi } from '../api/shipping-address-api';
import { SHIPPING_ADDRESS_QUERY_KEYS } from '../utils/query-keys';

export const useDeleteShippingAddress = (): UseMutationResult<void, Error, number> => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await shippingAddressApi.delete(id);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ 
        queryKey: [SHIPPING_ADDRESS_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('shippingAddressManagement.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('shippingAddressManagement.deleteError'));
    },
  });
};
