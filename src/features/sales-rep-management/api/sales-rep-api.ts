import { api } from '@/lib/axios';
import type { ApiResponse, PagedFilter, PagedParams, PagedResponse } from '@/types/api';
import type { SalesRepCreateDto, SalesRepGetDto, SalesRepUpdateDto } from '../types/sales-rep-types';

export const salesRepApi = {
  getList: async (
    params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }
  ): Promise<PagedResponse<SalesRepGetDto>> => {
    const response = await api.post<
      ApiResponse<PagedResponse<SalesRepGetDto> & { items?: SalesRepGetDto[] }>
    >('/api/SalesRepCode/query', {
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 10,
      search: params.search ?? '',
      sortBy: params.sortBy ?? 'Id',
      sortDirection: params.sortDirection ?? 'asc',
      filterLogic: params.filterLogic ?? 'and',
      filters: params.filters ?? [],
    });

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

  update: async (id: number, data: SalesRepUpdateDto): Promise<SalesRepGetDto> => {
    const response = await api.put<ApiResponse<SalesRepGetDto>>(`/api/SalesRepCode/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Sales rep kaydı güncellenemedi');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/SalesRepCode/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Sales rep kaydı silinemedi');
    }
  },
};
