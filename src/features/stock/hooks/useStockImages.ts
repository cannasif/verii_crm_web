import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { stockApi } from '../api/stock-api';
import { queryKeys } from '../utils/query-keys';
import type { StockImageDto } from '../types';

export const useStockImages = (stockId: number): UseQueryResult<StockImageDto[], Error> => {
  return useQuery<StockImageDto[]>({
    queryKey: queryKeys.images(stockId),
    queryFn: ({ signal }) => stockApi.getImages(stockId, signal),
    enabled: !!stockId,
    staleTime: 5 * 60 * 1000,
  });
};
