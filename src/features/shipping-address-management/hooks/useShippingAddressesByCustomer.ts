import { useQuery } from '@tanstack/react-query';
import { shippingAddressApi } from '../api/shipping-address-api';
import { queryKeys } from '../utils/query-keys';
import type { ShippingAddressDto } from '../types/shipping-address-types';

export const useShippingAddressesByCustomer = (customerId: number): ReturnType<typeof useQuery<ShippingAddressDto[]>> => {
  return useQuery({
    queryKey: queryKeys.byCustomerId(customerId),
    queryFn: async ({ signal }) => {
      const page = await shippingAddressApi.getList({
        pageNumber: 1,
        pageSize: 100,
        sortBy: 'IsDefault',
        sortDirection: 'desc',
        filterLogic: 'and',
        filters: [
          { column: 'CustomerId', operator: 'eq', value: customerId.toString() },
          { column: 'IsActive', operator: 'eq', value: 'true' },
        ],
      }, signal);
      return page.data;
    },
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000,
  });
};
