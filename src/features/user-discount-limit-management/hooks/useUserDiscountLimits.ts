import { useQuery } from '@tanstack/react-query';
import { userDiscountLimitApi } from '../api/user-discount-limit-api';
import { queryKeys } from '../utils/query-keys';
import type { PagedParams, PagedFilter } from '@/types/api';
import type { UserDiscountLimitDto } from '../types/user-discount-limit-types';
import type { PagedResponse } from '@/types/api';

export const useUserDiscountLimits = (
  params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }
): ReturnType<typeof useQuery<PagedResponse<UserDiscountLimitDto>>> => {
  return useQuery({
    queryKey: queryKeys.list(params),
    queryFn: () => userDiscountLimitApi.getList(params),
    staleTime: 5 * 60 * 1000,
  });
};
