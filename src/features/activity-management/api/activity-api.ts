import { api } from '@/lib/axios';
import i18n from '@/lib/i18n';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { ActivityDto, CreateActivityDto, UpdateActivityDto } from '../types/activity-types';
import { appendPagedQueryParams } from '@/utils/query-params';

const AM_NS = 'activity-management' as const;

export const activityApi = {
  getList: async (params: Omit<PagedParams, 'filters'> & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<ActivityDto>> => {
    const queryParams = appendPagedQueryParams(new URLSearchParams(), params);

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
    throw new Error(response.message || response.exceptionMessage || i18n.t('listLoadError', { ns: AM_NS }));
  },

  getAllList: async (
    params: Omit<PagedParams, 'filters'> & { filters?: PagedFilter[] | Record<string, unknown> }
  ): Promise<PagedResponse<ActivityDto>> => {
    const firstPage = await activityApi.getList({
      ...params,
      pageNumber: 1,
    });

    if (firstPage.totalPages <= 1) {
      return firstPage;
    }

    const remainingPages = await Promise.all(
      Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
        activityApi.getList({
          ...params,
          pageNumber: index + 2,
        })
      )
    );

    const mergedData = [
      ...(firstPage.data ?? []),
      ...remainingPages.flatMap((page) => page.data ?? []),
    ];

    return {
      ...firstPage,
      data: mergedData,
      pageNumber: 1,
      pageSize: mergedData.length || firstPage.pageSize,
      totalCount: mergedData.length,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    };
  },

  getById: async (id: number): Promise<ActivityDto> => {
    const response = await api.get<ApiResponse<ActivityDto>>(`/api/Activity/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || response.exceptionMessage || i18n.t('detailLoadError', { ns: AM_NS }));
  },

  create: async (data: CreateActivityDto): Promise<ActivityDto> => {
    const response = await api.post<ApiResponse<ActivityDto>>('/api/Activity', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || response.exceptionMessage || i18n.t('createError', { ns: AM_NS }));
  },

  update: async (id: number, data: UpdateActivityDto): Promise<ActivityDto> => {
    const response = await api.put<ApiResponse<ActivityDto>>(`/api/Activity/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || response.exceptionMessage || i18n.t('updateError', { ns: AM_NS }));
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/Activity/${id}`);
    if (!response.success) {
      throw new Error(response.message || response.exceptionMessage || i18n.t('deleteError', { ns: AM_NS }));
    }
  },
};
