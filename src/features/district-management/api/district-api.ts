import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { DistrictDto, CreateDistrictDto, UpdateDistrictDto } from '../types/district-types';

export const districtApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<DistrictDto>> => {
    const queryParams = new URLSearchParams();
    if (params.pageNumber) queryParams.append('pageNumber', params.pageNumber.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);
    if (params.filters) {
      queryParams.append('filters', JSON.stringify(params.filters));
      queryParams.append('filterLogic', params.filterLogic ?? 'and');
    }

    const response = await api.get<ApiResponse<PagedResponse<DistrictDto>>>(
      `/api/District?${queryParams.toString()}`
    );
    
    if (response.success && response.data) {
      const pagedData = response.data;
      const rawData = pagedData as unknown as { items?: DistrictDto[], data?: DistrictDto[] };
      
      if (rawData.items && !rawData.data) {
        return {
          ...pagedData,
          data: rawData.items,
        };
      }
      
      return pagedData;
    }
    throw new Error(response.message || 'İlçe listesi yüklenemedi');
  },

  getById: async (id: number): Promise<DistrictDto> => {
    const response = await api.get<ApiResponse<DistrictDto>>(`/api/District/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'İlçe detayı yüklenemedi');
  },

  create: async (data: CreateDistrictDto): Promise<DistrictDto> => {
    const response = await api.post<ApiResponse<DistrictDto>>('/api/District', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'İlçe oluşturulamadı');
  },

  update: async (id: number, data: UpdateDistrictDto): Promise<DistrictDto> => {
    const response = await api.put<ApiResponse<DistrictDto>>(`/api/District/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'İlçe güncellenemedi');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/District/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'İlçe silinemedi');
    }
  },
};
