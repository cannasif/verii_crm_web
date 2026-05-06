import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { ActivityTypeDto, CreateActivityTypeDto, UpdateActivityTypeDto } from '../types/activity-type-types';

export const activityTypeApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<ActivityTypeDto>> => {
    const response = await api.post<ApiResponse<PagedResponse<ActivityTypeDto>>>(
      '/api/ActivityMeetingType/query',
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
    throw new Error(response.message || 'Aktivite toplanma tipi listesi yüklenemedi');
  },

  getById: async (id: number): Promise<ActivityTypeDto> => {
    const response = await api.get<ApiResponse<ActivityTypeDto>>(`/api/ActivityMeetingType/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Aktivite toplanma tipi detayı yüklenemedi');
  },

  create: async (data: CreateActivityTypeDto): Promise<ActivityTypeDto> => {
    const response = await api.post<ApiResponse<ActivityTypeDto>>('/api/ActivityMeetingType', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Aktivite toplanma tipi oluşturulamadı');
  },

  update: async (id: number, data: UpdateActivityTypeDto): Promise<ActivityTypeDto> => {
    const response = await api.put<ApiResponse<ActivityTypeDto>>(`/api/ActivityMeetingType/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Aktivite toplanma tipi güncellenemedi');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/ActivityMeetingType/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Aktivite toplanma tipi silinemedi');
    }
  },
};
