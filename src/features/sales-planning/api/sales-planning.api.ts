import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
  CreateSalesPlanDto,
  SalesPlanAttainmentDto,
  SalesPlanDto,
  SalesPlanStatus,
  SalesPlanSummaryDto,
  SalesPlanTransitionDto,
  SalesPlanUserOptionDto,
  UpdateSalesPlanDto,
} from '../types/sales-planning.types';

function unwrap<T>(response: ApiResponse<T | null>, fallbackMessage: string): T {
  if (!response.success || response.data == null) {
    throw new Error(response.message || response.exceptionMessage || fallbackMessage);
  }
  return response.data;
}

export const salesPlanningApi = {
  getAll: async (params: { year?: number; status?: SalesPlanStatus }): Promise<SalesPlanSummaryDto[]> => {
    const response = await api.get<ApiResponse<SalesPlanSummaryDto[] | null>>('/api/sales-plans', { params });
    return unwrap(response, 'Satış planları yüklenemedi.');
  },

  getById: async (id: number, signal?: AbortSignal): Promise<SalesPlanDto> => {
    const response = await api.get<ApiResponse<SalesPlanDto | null>>(`/api/sales-plans/${id}`, { signal });
    return unwrap(response, 'Satış planı yüklenemedi.');
  },

  getAttainment: async (id: number, month: number, signal?: AbortSignal): Promise<SalesPlanAttainmentDto> => {
    const response = await api.get<ApiResponse<SalesPlanAttainmentDto | null>>(
      `/api/sales-plans/${id}/attainment`,
      { params: { month }, signal },
    );
    return unwrap(response, 'Satış hedefi gerçekleşmeleri yüklenemedi.');
  },

  getTargetUsers: async (signal?: AbortSignal): Promise<SalesPlanUserOptionDto[]> => {
    const response = await api.get<ApiResponse<SalesPlanUserOptionDto[] | null>>('/api/sales-plans/target-users', { signal });
    return unwrap(response, 'Satışçı seçenekleri yüklenemedi.');
  },

  create: async (payload: CreateSalesPlanDto): Promise<SalesPlanDto> => {
    const response = await api.post<ApiResponse<SalesPlanDto | null>>('/api/sales-plans', payload);
    return unwrap(response, 'Satış planı oluşturulamadı.');
  },

  update: async (id: number, payload: UpdateSalesPlanDto): Promise<SalesPlanDto> => {
    const response = await api.put<ApiResponse<SalesPlanDto | null>>(`/api/sales-plans/${id}`, payload);
    return unwrap(response, 'Satış planı güncellenemedi.');
  },

  delete: async (id: number, rowVersion: string): Promise<void> => {
    const response = await api.delete<ApiResponse<boolean | null>>(`/api/sales-plans/${id}`, {
      params: { rowVersion },
    });
    unwrap(response, 'Satış planı silinemedi.');
  },

  transition: async (
    id: number,
    action: 'submit' | 'approve' | 'lock',
    payload: SalesPlanTransitionDto,
  ): Promise<SalesPlanDto> => {
    const response = await api.post<ApiResponse<SalesPlanDto | null>>(
      `/api/sales-plans/${id}/${action}`,
      payload,
    );
    return unwrap(response, 'Satış planı durumu güncellenemedi.');
  },
};
