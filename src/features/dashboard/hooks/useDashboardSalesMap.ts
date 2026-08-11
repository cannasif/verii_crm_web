import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getDashboardSalesMap } from '../api/dashboard-sales-map-api';
import { dashboardQueryKeys } from '../utils/query-keys';

export function useDashboardSalesMap(startDate: string, endDate: string) {
  return useQuery({
    queryKey: dashboardQueryKeys.salesMap(startDate, endDate),
    queryFn: ({ signal }) => getDashboardSalesMap(startDate, endDate, signal),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    placeholderData: keepPreviousData,
  });
}
