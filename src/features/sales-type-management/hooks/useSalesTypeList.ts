import { useQuery } from '@tanstack/react-query';
import { salesTypeApi } from '../api/sales-type-api';
import { queryKeys } from '../utils/query-keys';
import type { PagedParams, PagedFilter } from '@/types/api';
import type { SalesTypeGetDto } from '../types/sales-type-types';
import type { PagedResponse } from '@/types/api';
import { normalizeQueryParams } from '@/utils/query-params';

export const useSalesTypeList = (
  params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }
): ReturnType<typeof useQuery<PagedResponse<SalesTypeGetDto>>> => {
  return useQuery({
    queryKey: queryKeys.list(normalizeQueryParams(params)),
    queryFn: () => salesTypeApi.getList(params),
    staleTime: 30000,
  });
};
