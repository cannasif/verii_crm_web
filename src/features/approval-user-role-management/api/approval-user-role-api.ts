import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { ApprovalUserRoleDto, CreateApprovalUserRoleDto, UpdateApprovalUserRoleDto } from '../types/approval-user-role-types';

export const approvalUserRoleApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<ApprovalUserRoleDto>> => {
    const queryParams = new URLSearchParams();
    if (params.pageNumber) queryParams.append('pageNumber', params.pageNumber.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);
    if (params.filters) {
      queryParams.append('filters', JSON.stringify(params.filters));
      queryParams.append('filterLogic', params.filterLogic ?? 'and');
    }

    const response = await api.get<ApiResponse<PagedResponse<ApprovalUserRoleDto>>>(
      `/api/ApprovalUserRole?${queryParams.toString()}`
    );
    
    if (response.success && response.data) {
      const pagedData = response.data;
      
      const rawData = pagedData as unknown as { items?: ApprovalUserRoleDto[], data?: ApprovalUserRoleDto[] };
      if (rawData.items && !rawData.data) {
        return {
          ...pagedData,
          data: rawData.items,
        };
      }
      
      return pagedData;
    }
    throw new Error(response.message || 'Onay kullanıcı rolü listesi yüklenemedi');
  },

  getById: async (id: number): Promise<ApprovalUserRoleDto> => {
    const response = await api.get<ApiResponse<ApprovalUserRoleDto>>(`/api/ApprovalUserRole/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Onay kullanıcı rolü detayı yüklenemedi');
  },

  create: async (data: CreateApprovalUserRoleDto): Promise<ApprovalUserRoleDto> => {
    const response = await api.post<ApiResponse<ApprovalUserRoleDto>>('/api/ApprovalUserRole', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Onay kullanıcı rolü oluşturulamadı');
  },

  update: async (id: number, data: UpdateApprovalUserRoleDto): Promise<ApprovalUserRoleDto> => {
    const response = await api.put<ApiResponse<ApprovalUserRoleDto>>(`/api/ApprovalUserRole/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Onay kullanıcı rolü güncellenemedi');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/ApprovalUserRole/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Onay kullanıcı rolü silinemedi');
    }
  },
};
