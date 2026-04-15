import { api } from '@/lib/axios';
import type { ApiResponse, PagedFilter, PagedParams, PagedResponse } from '@/types/api';
import type { SalesRepMatchCreateDto, SalesRepMatchGetDto } from '../types/sales-rep-match-types';

export const salesRepMatchApi = {
  getList: async (
    params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }
  ): Promise<PagedResponse<SalesRepMatchGetDto>> => {
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
      ApiResponse<PagedResponse<SalesRepMatchGetDto> & { items?: SalesRepMatchGetDto[] }>
    >(`/api/SalesRepCodeUserMatch?${queryParams.toString()}`);

    if (response.success && response.data) {
      const pagedData = response.data as PagedResponse<SalesRepMatchGetDto> & { items?: SalesRepMatchGetDto[] };
      const rawData = pagedData as { items?: SalesRepMatchGetDto[]; data?: SalesRepMatchGetDto[] };
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

    throw new Error(response.message || 'Sales rep eşleşmeleri yüklenemedi');
  },

  create: async (data: SalesRepMatchCreateDto): Promise<SalesRepMatchGetDto> => {
    const response = await api.post<ApiResponse<SalesRepMatchGetDto>>('/api/SalesRepCodeUserMatch', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Sales rep eşleşmesi oluşturulamadı');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/SalesRepCodeUserMatch/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Sales rep eşleşmesi silinemedi');
    }
  },
};
