import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getDashboardSalesMap } from '../api/dashboard-sales-map-api';
import { dashboardQueryKeys } from '../utils/query-keys';
import type { SalesMapScope } from '../types/dashboard-sales-map';

export function useDashboardSalesMap(startDate: string, endDate: string, scope: SalesMapScope) {
  return useQuery({
    queryKey: dashboardQueryKeys.salesMap(startDate, endDate, scope),
    queryFn: ({ signal }) => getDashboardSalesMap(startDate, endDate, scope, signal),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    placeholderData: keepPreviousData,
  });
}
