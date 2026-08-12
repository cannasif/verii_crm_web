import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { DashboardSalesMapData } from '../types/dashboard-sales-map';
import type { SalesMapScope } from '../types/dashboard-sales-map';

export async function getDashboardSalesMap(
  startDate: string,
  endDate: string,
  scope: SalesMapScope,
  signal?: AbortSignal,
): Promise<DashboardSalesMapData> {
  const response = await api.get<ApiResponse<DashboardSalesMapData>>(
    '/api/Dashboard/sales-map',
    { params: { startDate, endDate, mineOnly: scope === 'mine' }, signal },
  );

  if (response.success && response.data) return response.data;
  throw new Error(response.message || response.exceptionMessage || 'Dashboard sales map could not be loaded.');
}
