import { useShippingAddressesByCustomer } from '@/features/shipping-address-management/hooks/useShippingAddressesByCustomer';
import { buildShippingAddressLabel } from '@/features/shipping-address-management/utils/shipping-address-label';
import type { ShippingAddress } from '../types/demand-types';

interface UseShippingAddressesReturn {
  data: ShippingAddress[];
  isLoading: boolean;
}

export const useShippingAddresses = (customerId?: number): UseShippingAddressesReturn => {
  const { data, isLoading } = useShippingAddressesByCustomer(customerId || 0);
  return {
    data:
      data?.map((address) => ({
        id: address.id,
        addressText: buildShippingAddressLabel(address),
        customerId: address.customerId,
        name: address.name,
        customerName: address.customerName,
        erpShippingCode: address.erpShippingCode,
        erpMainCustomerCode: address.erpMainCustomerCode,
      })) || [],
    isLoading,
  };
};
