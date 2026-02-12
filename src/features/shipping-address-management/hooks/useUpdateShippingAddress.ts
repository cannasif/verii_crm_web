import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { shippingAddressApi } from '../api/shipping-address-api';
import { queryKeys, SHIPPING_ADDRESS_QUERY_KEYS } from '../utils/query-keys';
import type { UpdateShippingAddressDto, ShippingAddressDto } from '../types/shipping-address-types';

export const useUpdateShippingAddress = (): UseMutationResult<ShippingAddressDto, Error, { id: number; data: UpdateShippingAddressDto }> => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateShippingAddressDto }): Promise<ShippingAddressDto> => {
      const result = await shippingAddressApi.update(id, data);
      return result;
    },
    onSuccess: async (updatedShippingAddress: ShippingAddressDto) => {
      await queryClient.refetchQueries({ 
        queryKey: [SHIPPING_ADDRESS_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(updatedShippingAddress.id) });
      queryClient.invalidateQueries({ queryKey: [SHIPPING_ADDRESS_QUERY_KEYS.BY_CUSTOMER_ID, updatedShippingAddress.customerId] });
      toast.success(t('shippingAddressManagement.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('shippingAddressManagement.updateError'));
    },
  });
};
