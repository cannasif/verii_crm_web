import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { CustomerDto, CreateCustomerDto, UpdateCustomerDto } from '../types/customer-types';

export const customerApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<CustomerDto>> => {
    const queryParams = new URLSearchParams();
    if (params.pageNumber) queryParams.append('pageNumber', params.pageNumber.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);
    if (params.filters) {
      queryParams.append('filters', JSON.stringify(params.filters));
      queryParams.append('filterLogic', params.filterLogic ?? 'and');
    }

    const response = await api.get<ApiResponse<PagedResponse<CustomerDto>>>(
      `/api/Customer?${queryParams.toString()}`
    );
    
    if (response.success && response.data) {
      const pagedData = response.data as PagedResponse<CustomerDto> & { items?: CustomerDto[] };
      
      if (pagedData.items && !pagedData.data) {
        return {
          ...pagedData,
          data: pagedData.items,
        };
      }
      
      return pagedData;
    }
    throw new Error(response.message || 'Müşteri listesi yüklenemedi');
  },

  getById: async (id: number): Promise<CustomerDto> => {
    const response = await api.get<ApiResponse<CustomerDto>>(`/api/Customer/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Müşteri detayı yüklenemedi');
  },

  create: async (data: CreateCustomerDto): Promise<CustomerDto> => {
    const response = await api.post<ApiResponse<CustomerDto>>('/api/Customer', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Müşteri oluşturulamadı');
  },

  update: async (id: number, data: UpdateCustomerDto): Promise<CustomerDto> => {
    const response = await api.put<ApiResponse<CustomerDto>>(`/api/Customer/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Müşteri güncellenemedi');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/Customer/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Müşteri silinemedi');
    }
  },
};
