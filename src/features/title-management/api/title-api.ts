import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { TitleDto, CreateTitleDto, UpdateTitleDto } from '../types/title-types';

export const titleApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<TitleDto>> => {
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

    const response = await api.get<ApiResponse<PagedResponse<TitleDto>>>(
      `/api/Title?${queryParams.toString()}`
    );
    
    if (response.success && response.data) {
      const pagedData = response.data;
      
      const rawData = pagedData as unknown as { items?: TitleDto[], data?: TitleDto[] };
      if (rawData.items && !rawData.data) {
        return {
          ...pagedData,
          data: rawData.items,
        };
      }
      
      return pagedData;
    }
    throw new Error(response.message || 'Ünvan listesi yüklenemedi');
  },

  getById: async (id: number): Promise<TitleDto> => {
    const response = await api.get<ApiResponse<TitleDto>>(`/api/Title/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Ünvan detayı yüklenemedi');
  },

  create: async (data: CreateTitleDto): Promise<TitleDto> => {
    const response = await api.post<ApiResponse<TitleDto>>('/api/Title', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Ünvan oluşturulamadı');
  },

  update: async (id: number, data: UpdateTitleDto): Promise<TitleDto> => {
    const response = await api.put<ApiResponse<TitleDto>>(`/api/Title/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Ünvan güncellenemedi');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/Title/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Ünvan silinemedi');
    }
  },
};
