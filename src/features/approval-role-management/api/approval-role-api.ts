import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { ApprovalRoleDto, CreateApprovalRoleDto, UpdateApprovalRoleDto } from '../types/approval-role-types';

export const approvalRoleApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<ApprovalRoleDto>> => {
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

    const response = await api.get<ApiResponse<PagedResponse<ApprovalRoleDto>>>(
      `/api/ApprovalRole?${queryParams.toString()}`
    );
    
    if (response.success && response.data) {
      const pagedData = response.data;
      
      const rawData = pagedData as unknown as { items?: ApprovalRoleDto[], data?: ApprovalRoleDto[] };
      if (rawData.items && !rawData.data) {
        return {
          ...pagedData,
          data: rawData.items,
        };
      }
      
      return pagedData;
    }
    throw new Error(response.message || 'Onay rolü listesi yüklenemedi');
  },

  getById: async (id: number): Promise<ApprovalRoleDto> => {
    const response = await api.get<ApiResponse<ApprovalRoleDto>>(`/api/ApprovalRole/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Onay rolü detayı yüklenemedi');
  },

  create: async (data: CreateApprovalRoleDto): Promise<ApprovalRoleDto> => {
    const response = await api.post<ApiResponse<ApprovalRoleDto>>('/api/ApprovalRole', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Onay rolü oluşturulamadı');
  },

  update: async (id: number, data: UpdateApprovalRoleDto): Promise<ApprovalRoleDto> => {
    const response = await api.put<ApiResponse<ApprovalRoleDto>>(`/api/ApprovalRole/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Onay rolü güncellenemedi');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/ApprovalRole/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Onay rolü silinemedi');
    }
  },
};
