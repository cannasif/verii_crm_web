import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { SalesTypeGetDto, SalesTypeCreateDto, SalesTypeUpdateDto } from '../types/sales-type-types';

export const salesTypeApi = {
  getList: async (
    params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }
  ): Promise<PagedResponse<SalesTypeGetDto>> => {
    const queryParams = new URLSearchParams();
    if (params.pageNumber) queryParams.append('pageNumber', params.pageNumber.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);
    if (params.filters) {
      queryParams.append('filters', JSON.stringify(params.filters));
    }

    const response = await api.get<ApiResponse<PagedResponse<SalesTypeGetDto> & { items?: SalesTypeGetDto[] }>>(
      `/api/SalesType?${queryParams.toString()}`
    );

    if (response.success && response.data) {
      const pagedData = response.data as PagedResponse<SalesTypeGetDto> & { items?: SalesTypeGetDto[] };
      const rawData = pagedData as { items?: SalesTypeGetDto[]; data?: SalesTypeGetDto[] };
      const list = rawData.items ?? rawData.data ?? [];
      const total = pagedData.totalCount ?? list.length;
      const pageNum = pagedData.pageNumber ?? 1;
      const size = pagedData.pageSize ?? 10;
      const totalPages = Math.ceil(total / size) || 1;
      return {
        data: list,
        totalCount: total,
        pageNumber: pageNum,
        pageSize: size,
        totalPages,
        hasPreviousPage: pageNum > 1,
        hasNextPage: pageNum < totalPages,
      };
    }
    throw new Error(response.message || 'Satış tipleri yüklenemedi');
  },

  getById: async (id: number): Promise<SalesTypeGetDto> => {
    const response = await api.get<ApiResponse<SalesTypeGetDto>>(`/api/SalesType/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Satış tipi detayı yüklenemedi');
  },

  create: async (data: SalesTypeCreateDto): Promise<SalesTypeGetDto> => {
    const response = await api.post<ApiResponse<SalesTypeGetDto>>('/api/SalesType', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Satış tipi oluşturulamadı');
  },

  update: async (id: number, data: SalesTypeUpdateDto): Promise<SalesTypeGetDto> => {
    const response = await api.put<ApiResponse<SalesTypeGetDto>>(`/api/SalesType/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Satış tipi güncellenemedi');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/SalesType/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Satış tipi silinemedi');
    }
  },
};
