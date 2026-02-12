import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { CityDto, CreateCityDto, UpdateCityDto } from '../types/city-types';

export const cityApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<CityDto>> => {
    const queryParams = new URLSearchParams();
    if (params.pageNumber) queryParams.append('pageNumber', params.pageNumber.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);
    if (params.filters) {
      queryParams.append('filters', JSON.stringify(params.filters));
      queryParams.append('filterLogic', params.filterLogic ?? 'and');
    }

    const response = await api.get<ApiResponse<PagedResponse<CityDto>>>(
      `/api/City?${queryParams.toString()}`
    );
    
    if (response.success && response.data) {
      const pagedData = response.data;
      const rawData = pagedData as unknown as { items?: CityDto[], data?: CityDto[] };
      
      if (rawData.items && !rawData.data) {
        return {
          ...pagedData,
          data: rawData.items,
        };
      }
      
      return pagedData;
    }
    throw new Error(response.message || 'Şehir listesi yüklenemedi');
  },

  getById: async (id: number): Promise<CityDto> => {
    const response = await api.get<ApiResponse<CityDto>>(`/api/City/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Şehir detayı yüklenemedi');
  },

  create: async (data: CreateCityDto): Promise<CityDto> => {
    const response = await api.post<ApiResponse<CityDto>>('/api/City', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Şehir oluşturulamadı');
  },

  update: async (id: number, data: UpdateCityDto): Promise<CityDto> => {
    const response = await api.put<ApiResponse<CityDto>>(`/api/City/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Şehir güncellenemedi');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/City/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Şehir silinemedi');
    }
  },
};
