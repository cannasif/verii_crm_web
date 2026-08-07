import { useQuery } from '@tanstack/react-query';
import { getDashboardSalesCalendar } from '../api/dashboard-sales-calendar-api';
import type { DashboardSalesDocumentType } from '../types/dashboard-sales-calendar';

export function useDashboardSalesCalendar(
  documentType: DashboardSalesDocumentType,
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey: ['dashboard', 'sales-calendar', documentType, startDate, endDate],
    queryFn: ({ signal }) => getDashboardSalesCalendar(documentType, startDate, endDate, signal),
    staleTime: 60_000,
  });
}
