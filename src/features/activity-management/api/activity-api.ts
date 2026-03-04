import { api } from '@/lib/axios';
import i18n from '@/lib/i18n';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { ActivityDto, CreateActivityDto, UpdateActivityDto } from '../types/activity-types';

export const activityApi = {
  getList: async (params: Omit<PagedParams, 'filters'> & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<ActivityDto>> => {
    const queryParams = new URLSearchParams();
    if (params.pageNumber) queryParams.append('pageNumber', params.pageNumber.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);
    if (Array.isArray(params.filters)) {
      if (params.filters.length > 0) {
        queryParams.append('filters', JSON.stringify(params.filters));
        queryParams.append('filterLogic', params.filterLogic ?? 'and');
      }
    } else if (params.filters && Object.keys(params.filters).length > 0) {
      queryParams.append('filters', JSON.stringify(params.filters));
      queryParams.append('filterLogic', params.filterLogic ?? 'and');
    }

    const response = await api.get<ApiResponse<PagedResponse<ActivityDto>>>(
      `/api/Activity?${queryParams.toString()}`
    );
    
    if (response.success && response.data) {
      const pagedData = response.data as PagedResponse<ActivityDto> & { items?: ActivityDto[] };
      
      if (pagedData.items && !pagedData.data) {
        return {
          ...pagedData,
          data: pagedData.items,
        };
      }
      
      return pagedData;
    }
    throw new Error(response.message || i18n.t('activityManagement.listLoadError'));
  },

  getById: async (id: number): Promise<ActivityDto> => {
    const response = await api.get<ApiResponse<ActivityDto>>(`/api/Activity/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || i18n.t('activityManagement.detailLoadError'));
  },

  create: async (data: CreateActivityDto): Promise<ActivityDto> => {
    const response = await api.post<ApiResponse<ActivityDto>>('/api/Activity', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || i18n.t('activityManagement.createError'));
  },

  update: async (id: number, data: UpdateActivityDto): Promise<ActivityDto> => {
    const response = await api.put<ApiResponse<ActivityDto>>(`/api/Activity/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || i18n.t('activityManagement.updateError'));
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/Activity/${id}`);
    if (!response.success) {
      throw new Error(response.message || i18n.t('activityManagement.deleteError'));
    }
  },
};
