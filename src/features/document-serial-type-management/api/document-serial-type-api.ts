import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { DocumentSerialTypeDto, CreateDocumentSerialTypeDto, UpdateDocumentSerialTypeDto, DocumentSerialTypeGetDto } from '../types/document-serial-type-types';
import type { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';
import { appendPagedQueryParams } from '@/utils/query-params';

export const documentSerialTypeApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<DocumentSerialTypeDto>> => {
    const queryParams = appendPagedQueryParams(new URLSearchParams(), params);

    const response = await api.get<ApiResponse<PagedResponse<DocumentSerialTypeDto>>>(
      `/api/DocumentSerialType?${queryParams.toString()}`
    );
    
    if (response.success && response.data) {
      const pagedData = response.data;
      const rawData = pagedData as unknown as { items?: DocumentSerialTypeDto[], data?: DocumentSerialTypeDto[] };
      
      if (rawData.items && !rawData.data) {
        return {
          ...pagedData,
          data: rawData.items,
        };
      }
      
      return pagedData;
    }
    throw new Error(response.message || 'Dosya tip listesi yüklenemedi');
  },

  getById: async (id: number): Promise<DocumentSerialTypeDto> => {
    const response = await api.get<ApiResponse<DocumentSerialTypeDto>>(`/api/DocumentSerialType/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Dosya tip detayı yüklenemedi');
  },

  create: async (data: CreateDocumentSerialTypeDto): Promise<DocumentSerialTypeDto> => {
    const response = await api.post<ApiResponse<DocumentSerialTypeDto>>('/api/DocumentSerialType', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Dosya tip oluşturulamadı');
  },

  update: async (id: number, data: UpdateDocumentSerialTypeDto): Promise<DocumentSerialTypeDto> => {
    const response = await api.put<ApiResponse<DocumentSerialTypeDto>>(`/api/DocumentSerialType/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Dosya tip güncellenemedi');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/DocumentSerialType/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Dosya tip silinemedi');
    }
  },

  getAvailable: async (customerTypeId: number, salesRepId: number, ruleType: PricingRuleType): Promise<DocumentSerialTypeGetDto[]> => {
    const response = await api.get<ApiResponse<DocumentSerialTypeGetDto[]>>(
      `/api/DocumentSerialType/avaible/customer/${customerTypeId}/salesrep/${salesRepId}/rule/${ruleType}`
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Uygun dosya tipleri yüklenemedi');
  },
};
