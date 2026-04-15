import { api } from '@/lib/axios';
import type { ApiResponse, PagedFilter, PagedParams, PagedResponse } from '@/types/api';
import type { SalesRepCreateDto, SalesRepGetDto } from '../types/sales-rep-types';

export const salesRepApi = {
  getList: async (
    params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }
  ): Promise<PagedResponse<SalesRepGetDto>> => {
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

    const response = await api.get<
      ApiResponse<PagedResponse<SalesRepGetDto> & { items?: SalesRepGetDto[] }>
    >(`/api/SalesRepCode?${queryParams.toString()}`);

    if (response.success && response.data) {
      const pagedData = response.data as PagedResponse<SalesRepGetDto> & { items?: SalesRepGetDto[] };
      const rawData = pagedData as { items?: SalesRepGetDto[]; data?: SalesRepGetDto[] };
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

    throw new Error(response.message || 'Sales rep kayıtları yüklenemedi');
  },

  create: async (data: SalesRepCreateDto): Promise<SalesRepGetDto> => {
    const response = await api.post<ApiResponse<SalesRepGetDto>>('/api/SalesRepCode', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Sales rep kaydı oluşturulamadı');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/SalesRepCode/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Sales rep kaydı silinemedi');
    }
  },
};
