import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { CustomerTypeDto, CreateCustomerTypeDto, UpdateCustomerTypeDto } from '../types/customer-type-types';

export const customerTypeApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<CustomerTypeDto>> => {
    const queryParams = new URLSearchParams();
    if (params.pageNumber) queryParams.append('pageNumber', params.pageNumber.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);
    if (params.filters) {
      queryParams.append('filters', JSON.stringify(params.filters));
      queryParams.append('filterLogic', params.filterLogic ?? 'and');
    }

    const response = await api.get<ApiResponse<PagedResponse<CustomerTypeDto>>>(
      `/api/CustomerType?${queryParams.toString()}`
    );
    
    if (response.success && response.data) {
      const pagedData = response.data;
      
      const rawData = pagedData as unknown as { items?: CustomerTypeDto[], data?: CustomerTypeDto[] };
      if (rawData.items && !rawData.data) {
        return {
          ...pagedData,
          data: rawData.items,
        };
      }
      
      return pagedData;
    }
    throw new Error(response.message || 'Müşteri tipi listesi yüklenemedi');
  },

  getById: async (id: number): Promise<CustomerTypeDto> => {
    const response = await api.get<ApiResponse<CustomerTypeDto>>(`/api/CustomerType/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Müşteri tipi detayı yüklenemedi');
  },

  create: async (data: CreateCustomerTypeDto): Promise<CustomerTypeDto> => {
    const response = await api.post<ApiResponse<CustomerTypeDto>>('/api/CustomerType', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Müşteri tipi oluşturulamadı');
  },

  update: async (id: number, data: UpdateCustomerTypeDto): Promise<CustomerTypeDto> => {
    const response = await api.put<ApiResponse<CustomerTypeDto>>(`/api/CustomerType/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Müşteri tipi güncellenemedi');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/CustomerType/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Müşteri tipi silinemedi');
    }
  },
};
