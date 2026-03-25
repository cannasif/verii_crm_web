import { useQuery } from '@tanstack/react-query';
import { paymentTypeApi } from '../api/payment-type-api';
import { queryKeys } from '../utils/query-keys';
import type { PagedParams, PagedFilter } from '@/types/api';
import type { PaymentTypeDto } from '../types/payment-type-types';
import type { PagedResponse } from '@/types/api';
import { normalizeQueryParams } from '@/utils/query-params';

export const usePaymentTypeList = (
  params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }
): ReturnType<typeof useQuery<PagedResponse<PaymentTypeDto>>> => {
  return useQuery({
    queryKey: queryKeys.list(normalizeQueryParams(params)),
    queryFn: () => paymentTypeApi.getList(params),
    staleTime: 5 * 60 * 1000,
  });
};
