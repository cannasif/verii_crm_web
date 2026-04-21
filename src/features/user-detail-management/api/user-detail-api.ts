import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { UserDetailDto, CreateUserDetailDto, UpdateUserDetailDto } from '../types/user-detail-types';

export const userDetailApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<UserDetailDto>> => {
    const queryParams = new URLSearchParams();
    if (params.pageNumber) queryParams.append('pageNumber', params.pageNumber.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);
    if (params.filters) {
      queryParams.append('filters', JSON.stringify(params.filters));
      queryParams.append('filterLogic', params.filterLogic ?? 'and');
    }

    const response = await api.get<ApiResponse<PagedResponse<UserDetailDto>>>(
      `/api/UserDetail?${queryParams.toString()}`
    );
    
    if (response.success && response.data) {
      const pagedData = response.data;
      
      const rawData = pagedData as unknown as { items?: UserDetailDto[], data?: UserDetailDto[] };
      if (rawData.items && !rawData.data) {
        return {
          ...pagedData,
          data: rawData.items,
        };
      }
      
      return pagedData;
    }
    throw new Error(response.message || 'Kullanıcı detay listesi yüklenemedi');
  },

  getById: async (id: number): Promise<UserDetailDto> => {
    const response = await api.get<ApiResponse<UserDetailDto>>(`/api/UserDetail/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Kullanıcı detayı yüklenemedi');
  },

  getByUserId: async (userId: number): Promise<UserDetailDto | null> => {
    const response = await api.get<ApiResponse<UserDetailDto>>(`/api/UserDetail/user/${userId}`);
    if (response.success) {
      return response.data ?? null;
    }
    if (response.statusCode === 404) {
      return null;
    }
    throw new Error(response.message || 'Kullanıcı detayı yüklenemedi');
  },

  create: async (data: CreateUserDetailDto): Promise<UserDetailDto> => {
    const response = await api.post<ApiResponse<UserDetailDto>>('/api/UserDetail', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Kullanıcı detayı oluşturulamadı');
  },

  update: async (id: number, data: UpdateUserDetailDto): Promise<UserDetailDto> => {
    const response = await api.put<ApiResponse<UserDetailDto>>(`/api/UserDetail/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Kullanıcı detayı güncellenemedi');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/UserDetail/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Kullanıcı detayı silinemedi');
    }
  },

  uploadProfilePicture: async (userId: number, file: File): Promise<UserDetailDto> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ApiResponse<UserDetailDto>>(
      `/api/UserDetail/users/${userId}/profile-picture`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Profil resmi yüklenemedi');
  },
};
