import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { CountryDto, CreateCountryDto, UpdateCountryDto } from '../types/country-types';

export const countryApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<CountryDto>> => {
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

    const url = `/api/Country?${queryParams.toString()}`;
    
    const response = await api.get<ApiResponse<PagedResponse<CountryDto>>>(url);
    
    if (response.success && response.data) {
      const pagedData = response.data;
      
      const rawData = pagedData as unknown as { items?: CountryDto[], data?: CountryDto[] };
      if (rawData.items && !rawData.data) {
        return {
          ...pagedData,
          data: rawData.items,
        };
      }
      
      return pagedData;
    }
    throw new Error(response.message || 'Ülke listesi yüklenemedi');
  },

  getById: async (id: number): Promise<CountryDto> => {
    const response = await api.get<ApiResponse<CountryDto>>(`/api/Country/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Ülke detayı yüklenemedi');
  },

  create: async (data: CreateCountryDto): Promise<CountryDto> => {
    const response = await api.post<ApiResponse<CountryDto>>('/api/Country', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Ülke oluşturulamadı');
  },

  update: async (id: number, data: UpdateCountryDto): Promise<CountryDto> => {
    const response = await api.put<ApiResponse<CountryDto>>(`/api/Country/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Ülke güncellenemedi');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/Country/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Ülke silinemedi');
    }
  },
};
