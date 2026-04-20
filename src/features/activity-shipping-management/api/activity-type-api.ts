import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { ActivityTypeDto, CreateActivityTypeDto, UpdateActivityTypeDto } from '../types/activity-type-types';

export const activityTypeApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<ActivityTypeDto>> => {
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

    const response = await api.get<ApiResponse<PagedResponse<ActivityTypeDto>>>(
      `/api/ActivityShipping?${queryParams.toString()}`
    );
    
    if (response.success && response.data) {
      const pagedData = response.data;
      
      const rawData = pagedData as unknown as { items?: ActivityTypeDto[], data?: ActivityTypeDto[] };
      if (rawData.items && !rawData.data) {
        return {
          ...pagedData,
          data: rawData.items,
        };
      }
      
      return pagedData;
    }
    throw new Error(response.message || 'Aktivite teslim bilgisi listesi yüklenemedi');
  },

  getById: async (id: number): Promise<ActivityTypeDto> => {
    const response = await api.get<ApiResponse<ActivityTypeDto>>(`/api/ActivityShipping/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Aktivite teslim bilgisi detayı yüklenemedi');
  },

  create: async (data: CreateActivityTypeDto): Promise<ActivityTypeDto> => {
    const response = await api.post<ApiResponse<ActivityTypeDto>>('/api/ActivityShipping', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Aktivite teslim bilgisi oluşturulamadı');
  },

  update: async (id: number, data: UpdateActivityTypeDto): Promise<ActivityTypeDto> => {
    const response = await api.put<ApiResponse<ActivityTypeDto>>(`/api/ActivityShipping/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Aktivite teslim bilgisi güncellenemedi');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/ActivityShipping/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Aktivite teslim bilgisi silinemedi');
    }
  },
};
