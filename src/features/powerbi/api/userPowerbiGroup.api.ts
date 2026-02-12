import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type {
  UserPowerBIGroupGetDto,
  CreateUserPowerBIGroupDto,
  UpdateUserPowerBIGroupDto,
} from '../types/userPowerbiGroup.types';

function toPagedData<T>(raw: { items?: T[]; data?: T[] } & PagedResponse<T>): PagedResponse<T> {
  const list = raw.items ?? raw.data ?? [];
  return {
    ...raw,
    data: list,
  };
}

export const userPowerbiGroupApi = {
  getList: async (
    params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }
  ): Promise<PagedResponse<UserPowerBIGroupGetDto>> => {
    const queryParams = new URLSearchParams();
    if (params.pageNumber != null) queryParams.append('pageNumber', String(params.pageNumber));
    if (params.pageSize != null) queryParams.append('pageSize', String(params.pageSize));
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);
    if (params.filters) {
      queryParams.append('filters', JSON.stringify(params.filters));
      queryParams.append('filterLogic', params.filterLogic ?? 'and');
    }

    const response = await api.get<ApiResponse<PagedResponse<UserPowerBIGroupGetDto>>>(
      `/api/UserPowerBIGroup?${queryParams.toString()}`
    );
    if (response.success && response.data) {
      return toPagedData(
        response.data as { items?: UserPowerBIGroupGetDto[] } & PagedResponse<UserPowerBIGroupGetDto>
      );
    }
    throw new Error(response.message ?? 'User PowerBI group list could not be loaded');
  },

  getById: async (id: number): Promise<UserPowerBIGroupGetDto> => {
    const response = await api.get<ApiResponse<UserPowerBIGroupGetDto>>(
      `/api/UserPowerBIGroup/${id}`
    );
    if (response.success && response.data) return response.data;
    throw new Error(response.message ?? 'User PowerBI group could not be loaded');
  },

  create: async (data: CreateUserPowerBIGroupDto): Promise<UserPowerBIGroupGetDto> => {
    const response = await api.post<ApiResponse<UserPowerBIGroupGetDto>>(
      '/api/UserPowerBIGroup',
      data
    );
    if (response.success && response.data) return response.data;
    throw new Error(response.message ?? 'User PowerBI group could not be created');
  },

  update: async (
    id: number,
    data: UpdateUserPowerBIGroupDto
  ): Promise<UserPowerBIGroupGetDto> => {
    const response = await api.put<ApiResponse<UserPowerBIGroupGetDto>>(
      `/api/UserPowerBIGroup/${id}`,
      data
    );
    if (response.success && response.data) return response.data;
    throw new Error(response.message ?? 'User PowerBI group could not be updated');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/UserPowerBIGroup/${id}`);
    if (!response.success) {
      throw new Error(response.message ?? 'User PowerBI group could not be deleted');
    }
  },
};
