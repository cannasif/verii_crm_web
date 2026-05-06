import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { PaymentTypeDto, CreatePaymentTypeDto, UpdatePaymentTypeDto } from '../types/payment-type-types';

export const paymentTypeApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<PaymentTypeDto>> => {
    const response = await api.post<ApiResponse<PagedResponse<PaymentTypeDto>>>('/api/PaymentType/query', {
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 10,
      search: params.search ?? '',
      sortBy: params.sortBy ?? 'Id',
      sortDirection: params.sortDirection ?? 'asc',
      filterLogic: params.filterLogic ?? 'and',
      filters: params.filters ?? [],
    });
    
    if (response.success && response.data) {
      const pagedData = response.data;
      const rawData = pagedData as unknown as { items?: PaymentTypeDto[], data?: PaymentTypeDto[] };
      
      if (rawData.items && !rawData.data) {
        return {
          ...pagedData,
          data: rawData.items,
        };
      }
      
      return pagedData;
    }
    throw new Error(response.message || 'Ödeme tipi listesi yüklenemedi');
  },

  getById: async (id: number): Promise<PaymentTypeDto> => {
    const response = await api.get<ApiResponse<PaymentTypeDto>>(`/api/PaymentType/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Ödeme tipi detayı yüklenemedi');
  },

  create: async (data: CreatePaymentTypeDto): Promise<PaymentTypeDto> => {
    const response = await api.post<ApiResponse<PaymentTypeDto>>('/api/PaymentType', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Ödeme tipi oluşturulamadı');
  },

  update: async (id: number, data: UpdatePaymentTypeDto): Promise<PaymentTypeDto> => {
    const response = await api.put<ApiResponse<PaymentTypeDto>>(`/api/PaymentType/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Ödeme tipi güncellenemedi');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/PaymentType/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Ödeme tipi silinemedi');
    }
  },
};
