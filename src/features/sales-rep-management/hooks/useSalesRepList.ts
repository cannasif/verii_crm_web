import { useQuery } from '@tanstack/react-query';
import type { PagedFilter, PagedParams, PagedResponse } from '@/types/api';
import { normalizeQueryParams } from '@/utils/query-params';
import { salesRepApi } from '../api/sales-rep-api';
import type { SalesRepGetDto } from '../types/sales-rep-types';
import { queryKeys } from '../utils/query-keys';

export const useSalesRepList = (
  params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }
): ReturnType<typeof useQuery<PagedResponse<SalesRepGetDto>>> =>
  useQuery({
    queryKey: queryKeys.list(normalizeQueryParams(params)),
    queryFn: () => salesRepApi.getList(params),
    staleTime: 30000,
  });
