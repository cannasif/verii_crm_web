import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
  DashboardSalesCalendarData,
  DashboardSalesDocumentType,
} from '../types/dashboard-sales-calendar';

export async function getDashboardSalesCalendar(
  documentType: DashboardSalesDocumentType,
  startDate: string,
  endDate: string,
  signal?: AbortSignal,
): Promise<DashboardSalesCalendarData> {
  const response = await api.get<ApiResponse<DashboardSalesCalendarData>>(
    `/api/Dashboard/sales-calendar/${documentType}`,
    { params: { startDate, endDate }, signal },
  );

  if (response.success && response.data) return response.data;
  throw new Error(response.message || response.exceptionMessage || 'Dashboard sales calendar could not be loaded.');
}
