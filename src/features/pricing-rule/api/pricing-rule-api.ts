import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type {
  PricingRuleHeaderGetDto,
  PricingRuleHeaderCreateDto,
  PricingRuleHeaderUpdateDto,
  PricingRuleLineGetDto,
  PricingRuleLineCreateDto,
  PricingRuleLineUpdateDto,
  PricingRuleSalesmanGetDto,
  PricingRuleSalesmanCreateDto,
} from '../types/pricing-rule-types';

export const pricingRuleApi = {
  getHeaders: async (params?: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<PricingRuleHeaderGetDto>> => {
    const queryParams = new URLSearchParams();
    if (params?.pageNumber) queryParams.append('pageNumber', params.pageNumber.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortDirection) queryParams.append('sortDirection', params.sortDirection);
    if (params?.filters) {
      queryParams.append('filters', JSON.stringify(params.filters));
      queryParams.append('filterLogic', params.filterLogic ?? 'and');
    }

    const response = await api.get<ApiResponse<PagedResponse<PricingRuleHeaderGetDto>>>(
      `/api/PricingRuleHeader?${queryParams.toString()}`
    );

    if (response.success && response.data) {
      const pagedData = response.data;
      const rawData = pagedData as unknown as { items?: PricingRuleHeaderGetDto[]; data?: PricingRuleHeaderGetDto[] };
      if (rawData.items && !rawData.data) {
        return {
          ...pagedData,
          data: rawData.items,
        };
      }
      return pagedData;
    }
    throw new Error(response.message || 'Fiyat kuralı listesi yüklenemedi');
  },

  getHeaderById: async (id: number): Promise<PricingRuleHeaderGetDto> => {
    const response = await api.get<ApiResponse<PricingRuleHeaderGetDto>>(`/api/PricingRuleHeader/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Fiyat kuralı detayı yüklenemedi');
  },

  createHeader: async (data: PricingRuleHeaderCreateDto): Promise<PricingRuleHeaderGetDto> => {
    const response = await api.post<ApiResponse<PricingRuleHeaderGetDto>>('/api/PricingRuleHeader', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Fiyat kuralı oluşturulamadı');
  },

  updateHeader: async (id: number, data: PricingRuleHeaderUpdateDto): Promise<PricingRuleHeaderGetDto> => {
    const response = await api.put<ApiResponse<PricingRuleHeaderGetDto>>(`/api/PricingRuleHeader/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Fiyat kuralı güncellenemedi');
  },

  deleteHeader: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/PricingRuleHeader/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Fiyat kuralı silinemedi');
    }
  },

  getLinesByHeaderId: async (headerId: number): Promise<PricingRuleLineGetDto[]> => {
    const response = await api.get<ApiResponse<PricingRuleLineGetDto[]>>(`/api/PricingRuleLine/header/${headerId}`);
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  },

  createLine: async (data: PricingRuleLineCreateDto): Promise<PricingRuleLineGetDto> => {
    const response = await api.post<ApiResponse<PricingRuleLineGetDto>>('/api/PricingRuleLine', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Fiyat kuralı satırı oluşturulamadı');
  },

  updateLine: async (id: number, data: PricingRuleLineUpdateDto): Promise<PricingRuleLineGetDto> => {
    const response = await api.put<ApiResponse<PricingRuleLineGetDto>>(`/api/PricingRuleLine/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Fiyat kuralı satırı güncellenemedi');
  },

  deleteLine: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/PricingRuleLine/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Fiyat kuralı satırı silinemedi');
    }
  },

  getSalesmenByHeaderId: async (headerId: number): Promise<PricingRuleSalesmanGetDto[]> => {
    const response = await api.get<ApiResponse<PricingRuleSalesmanGetDto[]>>(`/api/PricingRuleSalesman/header/${headerId}`);
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  },

  createSalesman: async (data: PricingRuleSalesmanCreateDto): Promise<PricingRuleSalesmanGetDto> => {
    const response = await api.post<ApiResponse<PricingRuleSalesmanGetDto>>('/api/PricingRuleSalesman', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Satışçı eklenemedi');
  },

  deleteSalesman: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/PricingRuleSalesman/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Satışçı silinemedi');
    }
  },
};
