import { useQuery } from '@tanstack/react-query';
import { shippingAddressApi } from '../api/shipping-address-api';
import { queryKeys } from '../utils/query-keys';
import type { ShippingAddressDto } from '../types/shipping-address-types';

export const useShippingAddress = (id: number): ReturnType<typeof useQuery<ShippingAddressDto>> => {
  return useQuery({
    queryKey: queryKeys.detail(id),
    queryFn: ({ signal }) => shippingAddressApi.getById(id, signal),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};
