import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { stockApi } from '../api/stock-api';
import { queryKeys } from '../utils/query-keys';
import type { PagedParams, PagedFilter, PagedResponse } from '@/types/api';
import { normalizeQueryParams } from '@/utils/query-params';
import type { StockGetDto } from '../types';

export const useStockList = (
  params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }
): UseQueryResult<PagedResponse<StockGetDto>, Error> => {
  const keyParams = {
    ...normalizeQueryParams(params),
    ...(Array.isArray(params.filters) && params.filters.length > 0
      ? { filtersSignature: JSON.stringify(params.filters) }
      : {}),
  };
  return useQuery({
    queryKey: queryKeys.list(keyParams),
    queryFn: () => stockApi.getList(params),
    staleTime: 5 * 60 * 1000,
  });
};
