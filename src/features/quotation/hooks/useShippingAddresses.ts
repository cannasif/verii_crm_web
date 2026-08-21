import { useShippingAddressesPagedByCustomer } from '@/features/shipping-address-management/hooks/useShippingAddressesPagedByCustomer';
import { buildShippingAddressLabel } from '@/features/shipping-address-management/utils/shipping-address-label';
import type { ShippingAddress } from '../types/quotation-types';

interface UseShippingAddressesReturn {
  data: ShippingAddress[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
}

export const useShippingAddresses = (
  customerId?: number,
  searchTerm = '',
  selectedAddressId?: number | null,
): UseShippingAddressesReturn => {
  const query = useShippingAddressesPagedByCustomer(customerId, searchTerm, selectedAddressId);
  return {
    data:
      query.items.map((address) => ({
        id: address.id,
        addressText: buildShippingAddressLabel(address),
        customerId: address.customerId,
        name: address.name,
        customerName: address.customerName,
        erpShippingCode: address.erpShippingCode,
        erpMainCustomerCode: address.erpMainCustomerCode,
      })),
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
  };
};
