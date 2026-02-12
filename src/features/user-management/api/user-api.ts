import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams } from '@/types/api';
import type { UserDto, CreateUserDto, UpdateUserDto } from '../types/user-types';

export const userApi = {
  getList: async (params: PagedParams): Promise<PagedResponse<UserDto>> => {
    const queryParams = new URLSearchParams();
    if (params.pageNumber) queryParams.append('pageNumber', params.pageNumber.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);
    if (params.filters) {
      queryParams.append('filters', JSON.stringify(params.filters));
      queryParams.append('filterLogic', params.filterLogic ?? 'and');
    }

    const response = await api.get<ApiResponse<PagedResponse<UserDto>>>(
      `/api/User?${queryParams.toString()}`
    );
    
    if (response.success && response.data) {
      const pagedData = response.data;
      
      const rawData = pagedData as unknown as { items?: UserDto[], data?: UserDto[] };
      if (rawData.items && !rawData.data) {
        return {
          ...pagedData,
          data: rawData.items,
        };
      }
      
      return pagedData;
    }
    throw new Error(response.message || 'Kullanıcı listesi yüklenemedi');
  },

  getById: async (id: number): Promise<UserDto> => {
    const response = await api.get<ApiResponse<UserDto>>(`/api/User/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Kullanıcı detayı yüklenemedi');
  },

  create: async (data: CreateUserDto): Promise<UserDto> => {
    const payload = {
      ...data,
      permissionGroupIds: data.permissionGroupIds ?? [],
    };
    const response = await api.post<ApiResponse<UserDto>>('/api/User', payload);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Kullanıcı oluşturulamadı');
  },

  update: async (id: number, data: UpdateUserDto): Promise<UserDto> => {
    const response = await api.put<ApiResponse<UserDto>>(`/api/User/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Kullanıcı güncellenemedi');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/User/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Kullanıcı silinemedi');
    }
  },
};
