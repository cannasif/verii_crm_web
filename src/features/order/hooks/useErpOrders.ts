import { useQuery } from '@tanstack/react-query';
import { erpOrderApi } from '../api/erp-order-api';

export const ERP_ORDER_QUERY_KEYS = {
  all: ['erp-orders'] as const,
  lines: (fatirsNo: string | null | undefined) => ['erp-orders', 'lines', fatirsNo || 'none'] as const,
};

export function useErpOrders(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ERP_ORDER_QUERY_KEYS.all,
    queryFn: erpOrderApi.getOrders,
    staleTime: 3 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useErpOrderLines(fatirsNo: string | null | undefined) {
  return useQuery({
    queryKey: ERP_ORDER_QUERY_KEYS.lines(fatirsNo),
    queryFn: () => erpOrderApi.getOrderLines(fatirsNo || ''),
    enabled: Boolean(fatirsNo),
    staleTime: 2 * 60 * 1000,
  });
}
