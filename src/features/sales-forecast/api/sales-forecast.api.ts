import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { SalesTargetMetric } from '@/features/sales-planning';
import type {
  SalesForecastDto,
  SalesForecastOverrideDto,
  UpsertSalesForecastOverrideDto,
} from '../types/sales-forecast.types';

function unwrap<T>(response: ApiResponse<T | null>, fallbackMessage: string): T {
  if (!response.success || response.data == null) {
    throw new Error(response.message || response.exceptionMessage || fallbackMessage);
  }
  return response.data;
}

export const salesForecastApi = {
  get: async (
    planId: number,
    month: number,
    targetMetric: SalesTargetMetric,
    signal?: AbortSignal,
  ): Promise<SalesForecastDto> => {
    const response = await api.get<ApiResponse<SalesForecastDto | null>>(
      `/api/sales-forecasts/plans/${planId}`,
      { params: { month, targetMetric }, signal },
    );
    return unwrap(response, 'Satış tahmini yüklenemedi.');
  },

  upsertOverride: async (
    planId: number,
    quotationId: number,
    payload: UpsertSalesForecastOverrideDto,
  ): Promise<SalesForecastOverrideDto> => {
    const response = await api.put<ApiResponse<SalesForecastOverrideDto | null>>(
      `/api/sales-forecasts/plans/${planId}/quotations/${quotationId}/override`,
      payload,
    );
    return unwrap(response, 'Tahmin düzeltmesi kaydedilemedi.');
  },

  deleteOverride: async (
    planId: number,
    quotationId: number,
    rowVersion: string,
  ): Promise<void> => {
    const response = await api.delete<ApiResponse<boolean | null>>(
      `/api/sales-forecasts/plans/${planId}/quotations/${quotationId}/override`,
      { params: { rowVersion } },
    );
    unwrap(response, 'Tahmin düzeltmesi kaldırılamadı.');
  },
};
