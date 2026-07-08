import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type {
  CustomerDocumentSerialDocumentKind,
  CustomerDocumentSerialSuggestionDto,
  CustomerDocumentSerialUsageRecordDto,
  DocumentSerialTypeDto,
  CreateDocumentSerialTypeDto,
  UpdateDocumentSerialTypeDto,
  DocumentSerialTypeGetDto,
} from '../types/document-serial-type-types';
import type { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';

export const documentSerialTypeApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<DocumentSerialTypeDto>> => {
    const response = await api.post<ApiResponse<PagedResponse<DocumentSerialTypeDto>>>(
      '/api/DocumentSerialType/query',
      {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 10,
        search: params.search ?? '',
        sortBy: params.sortBy ?? 'Id',
        sortDirection: params.sortDirection ?? 'asc',
        filterLogic: params.filterLogic ?? 'and',
        filters: params.filters ?? [],
      }
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
    const response = await api.post<ApiResponse<object>>(`/api/DocumentSerialType/${id}/delete`);
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

  getCustomerSuggestion: async (
    customerId: number,
    documentKind: CustomerDocumentSerialDocumentKind,
    requestBranchCode?: string | number | null,
  ): Promise<CustomerDocumentSerialSuggestionDto | null> => {
    const params = requestBranchCode != null && String(requestBranchCode).trim() !== ''
      ? { requestBranchCode: String(requestBranchCode) }
      : undefined;
    const response = await api.get<ApiResponse<CustomerDocumentSerialSuggestionDto | null>>(
      `/api/DocumentSerialType/suggestion/customer/${customerId}/document-kind/${documentKind}`,
      { params },
    );
    if (response.success) {
      return response.data ?? null;
    }
    throw new Error(response.message || 'Cari seri önerisi yüklenemedi');
  },

  recordCustomerSuggestionUsage: async (data: CustomerDocumentSerialUsageRecordDto): Promise<void> => {
    const response = await api.post<ApiResponse<object>>('/api/DocumentSerialType/suggestion/record', data);
    if (!response.success) {
      throw new Error(response.message || 'Cari seri kullanımı kaydedilemedi');
    }
  },
};
