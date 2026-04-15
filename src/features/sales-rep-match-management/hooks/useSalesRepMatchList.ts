import { useQuery } from '@tanstack/react-query';
import type { PagedFilter, PagedParams, PagedResponse } from '@/types/api';
import { normalizeQueryParams } from '@/utils/query-params';
import { salesRepMatchApi } from '../api/sales-rep-match-api';
import type { SalesRepMatchGetDto } from '../types/sales-rep-match-types';
import { queryKeys } from '../utils/query-keys';

export const useSalesRepMatchList = (
  params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }
): ReturnType<typeof useQuery<PagedResponse<SalesRepMatchGetDto>>> =>
  useQuery({
    queryKey: queryKeys.list(normalizeQueryParams(params)),
    queryFn: () => salesRepMatchApi.getList(params),
    staleTime: 30000,
  });
