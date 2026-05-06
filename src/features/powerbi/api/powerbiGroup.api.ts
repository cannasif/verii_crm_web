import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type {
  PowerBIGroupGetDto,
  CreatePowerBIGroupDto,
  UpdatePowerBIGroupDto,
} from '../types/powerbiGroup.types';

function toPagedData<T>(raw: { items?: T[]; data?: T[] } & PagedResponse<T>): PagedResponse<T> {
  const list = raw.items ?? raw.data ?? [];
  return {
    ...raw,
    data: list,
  };
}

export const powerbiGroupApi = {
  getList: async (
    params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }
  ): Promise<PagedResponse<PowerBIGroupGetDto>> => {
    const response = await api.post<ApiResponse<PagedResponse<PowerBIGroupGetDto>>>(
      '/api/PowerBIGroup/query',
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
      return toPagedData(response.data as { items?: PowerBIGroupGetDto[] } & PagedResponse<PowerBIGroupGetDto>);
    }
    throw new Error(response.message ?? 'PowerBI group list could not be loaded');
  },

  getById: async (id: number): Promise<PowerBIGroupGetDto> => {
    const response = await api.get<ApiResponse<PowerBIGroupGetDto>>(`/api/PowerBIGroup/${id}`);
    if (response.success && response.data) return response.data;
    throw new Error(response.message ?? 'PowerBI group could not be loaded');
  },

  create: async (data: CreatePowerBIGroupDto): Promise<PowerBIGroupGetDto> => {
    const response = await api.post<ApiResponse<PowerBIGroupGetDto>>('/api/PowerBIGroup', data);
    if (response.success && response.data) return response.data;
    throw new Error(response.message ?? 'PowerBI group could not be created');
  },

  update: async (id: number, data: UpdatePowerBIGroupDto): Promise<PowerBIGroupGetDto> => {
    const response = await api.put<ApiResponse<PowerBIGroupGetDto>>(
      `/api/PowerBIGroup/${id}`,
      data
    );
    if (response.success && response.data) return response.data;
    throw new Error(response.message ?? 'PowerBI group could not be updated');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/PowerBIGroup/${id}`);
    if (!response.success) {
      throw new Error(response.message ?? 'PowerBI group could not be deleted');
    }
  },
};
