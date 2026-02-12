import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { shippingAddressApi } from '../api/shipping-address-api';
import { SHIPPING_ADDRESS_QUERY_KEYS } from '../utils/query-keys';
import type { CreateShippingAddressDto, ShippingAddressDto } from '../types/shipping-address-types';

export const useCreateShippingAddress = (): UseMutationResult<ShippingAddressDto, Error, CreateShippingAddressDto> => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateShippingAddressDto): Promise<ShippingAddressDto> => {
      const result = await shippingAddressApi.create(data);
      return result;
    },
    onSuccess: async (newShippingAddress: ShippingAddressDto) => {
      await queryClient.refetchQueries({ 
        queryKey: [SHIPPING_ADDRESS_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: [SHIPPING_ADDRESS_QUERY_KEYS.BY_CUSTOMER_ID, newShippingAddress.customerId] });
      toast.success(t('shippingAddressManagement.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('shippingAddressManagement.createError'));
    },
  });
};
