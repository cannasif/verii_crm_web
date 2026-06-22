import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { stockApi } from '../api/stock-api';
import { queryKeys } from '../utils/query-keys';
import type { WarehouseStockBalanceDto } from '../types';

const WAREHOUSE_BALANCES_STALE_MS = 60_000;

export function useWarehouseBalancesByStockId(
  stockId: number,
  enabled = true,
): UseQueryResult<WarehouseStockBalanceDto[], Error> {
  return useQuery<WarehouseStockBalanceDto[], Error>({
    queryKey: queryKeys.warehouseBalances(stockId),
    queryFn: () => stockApi.getWarehouseBalancesByStockId(stockId),
    enabled: enabled && stockId > 0,
    staleTime: WAREHOUSE_BALANCES_STALE_MS,
    gcTime: 5 * 60_000,
  });
}
