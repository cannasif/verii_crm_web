import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { stockApi } from '../api/stock-api';
import { queryKeys } from '../utils/query-keys';
import type { PagedParams, PagedFilter, PagedResponse } from '@/types/api';
import { normalizeQueryParams } from '@/utils/query-params';
import type { StockGetWithMainImageDto } from '../types';

type UseStockListWithImagesOptions = {
  enabled?: boolean;
};

export const useStockListWithImages = (
  params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> },
  options?: UseStockListWithImagesOptions
): UseQueryResult<PagedResponse<StockGetWithMainImageDto>, Error> => {
  const keyParams = {
    ...normalizeQueryParams(params),
    ...(Array.isArray(params.filters) && params.filters.length > 0
      ? { filtersSignature: JSON.stringify(params.filters), filterLogic: params.filterLogic ?? 'and' }
      : {}),
  };
  return useQuery({
    queryKey: queryKeys.listWithImages(keyParams),
    queryFn: () => stockApi.getListWithImages(params),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
};
