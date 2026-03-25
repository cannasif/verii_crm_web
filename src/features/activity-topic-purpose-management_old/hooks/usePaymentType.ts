import { useQuery } from '@tanstack/react-query';
import { paymentTypeApi } from '../api/payment-type-api';
import { queryKeys } from '../utils/query-keys';
import type { PaymentTypeDto } from '../types/payment-type-types';

export const usePaymentType = (id: number): ReturnType<typeof useQuery<PaymentTypeDto>> => {
  return useQuery({
    queryKey: queryKeys.detail(id),
    queryFn: () => paymentTypeApi.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};
