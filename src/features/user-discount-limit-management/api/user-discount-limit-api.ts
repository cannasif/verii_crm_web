import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { UserDiscountLimitDto, CreateUserDiscountLimitDto, UpdateUserDiscountLimitDto } from '../types/user-discount-limit-types';

export const userDiscountLimitApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<UserDiscountLimitDto>> => {
    const queryParams = new URLSearchParams();
    if (params.pageNumber) queryParams.append('pageNumber', params.pageNumber.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);
    if (params.filters) {
      queryParams.append('filters', JSON.stringify(params.filters));
      queryParams.append('filterLogic', params.filterLogic ?? 'and');
    }

    const response = await api.get<ApiResponse<PagedResponse<UserDiscountLimitDto>>>(
      `/api/UserDiscountLimit?${queryParams.toString()}`
    );
    
    if (response.success && response.data) {
      const pagedData = response.data;
      
      const rawData = pagedData as unknown as { items?: UserDiscountLimitDto[], data?: UserDiscountLimitDto[] };
      if (rawData.items && !rawData.data) {
        return {
          ...pagedData,
          data: rawData.items,
        };
      }
      
      return pagedData;
    }
    throw new Error(response.message || 'Kullanıcı iskonto limiti listesi yüklenemedi');
  },

  getById: async (id: number): Promise<UserDiscountLimitDto> => {
    const response = await api.get<ApiResponse<UserDiscountLimitDto>>(`/api/UserDiscountLimit/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Kullanıcı iskonto limiti detayı yüklenemedi');
  },

  getBySalespersonId: async (salespersonId: number): Promise<UserDiscountLimitDto[]> => {
    const response = await api.get<ApiResponse<UserDiscountLimitDto[]>>(`/api/UserDiscountLimit/salesperson/${salespersonId}`);
    if (response.success && response.data) {
      return Array.isArray(response.data) ? response.data : [];
    }
    throw new Error(response.message || 'Satış temsilcisi iskonto limitleri yüklenemedi');
  },

  getByErpProductGroupCode: async (erpProductGroupCode: string): Promise<UserDiscountLimitDto[]> => {
    const response = await api.get<ApiResponse<UserDiscountLimitDto[]>>(`/api/UserDiscountLimit/group/${erpProductGroupCode}`);
    if (response.success && response.data) {
      return Array.isArray(response.data) ? response.data : [];
    }
    throw new Error(response.message || 'Ürün grubu iskonto limitleri yüklenemedi');
  },

  getBySalespersonAndGroup: async (salespersonId: number, erpProductGroupCode: string): Promise<UserDiscountLimitDto> => {
    const response = await api.get<ApiResponse<UserDiscountLimitDto>>(`/api/UserDiscountLimit/salesperson/${salespersonId}/group/${erpProductGroupCode}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Kullanıcı iskonto limiti yüklenemedi');
  },

  create: async (data: CreateUserDiscountLimitDto): Promise<UserDiscountLimitDto> => {
    const response = await api.post<ApiResponse<UserDiscountLimitDto>>('/api/UserDiscountLimit', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Kullanıcı iskonto limiti oluşturulamadı');
  },

  update: async (id: number, data: UpdateUserDiscountLimitDto): Promise<UserDiscountLimitDto> => {
    const response = await api.put<ApiResponse<UserDiscountLimitDto>>(`/api/UserDiscountLimit/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Kullanıcı iskonto limiti güncellenemedi');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/UserDiscountLimit/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Kullanıcı iskonto limiti silinemedi');
    }
  },

  exists: async (id: number): Promise<boolean> => {
    const response = await api.get<ApiResponse<boolean>>(`/api/UserDiscountLimit/exists/${id}`);
    if (response.success && response.data !== undefined) {
      return response.data;
    }
    throw new Error(response.message || 'İskonto limiti kontrolü yapılamadı');
  },

  existsBySalespersonAndGroup: async (salespersonId: number, erpProductGroupCode: string): Promise<boolean> => {
    const response = await api.get<ApiResponse<boolean>>(`/api/UserDiscountLimit/exists/salesperson/${salespersonId}/group/${erpProductGroupCode}`);
    if (response.success && response.data !== undefined) {
      return response.data;
    }
    throw new Error(response.message || 'İskonto limiti kontrolü yapılamadı');
  },
};
