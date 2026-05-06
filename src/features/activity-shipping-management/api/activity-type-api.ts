import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { ActivityTypeDto, CreateActivityTypeDto, UpdateActivityTypeDto } from '../types/activity-type-types';

export const activityTypeApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<ActivityTypeDto>> => {
    const response = await api.post<ApiResponse<PagedResponse<ActivityTypeDto>>>(
      '/api/ActivityShipping/query',
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
