import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { ApprovalRoleGroupDto, CreateApprovalRoleGroupDto, UpdateApprovalRoleGroupDto } from '../types/approval-role-group-types';

export const approvalRoleGroupApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<ApprovalRoleGroupDto>> => {
    const queryParams = new URLSearchParams();
    if (params.pageNumber) queryParams.append('pageNumber', params.pageNumber.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);
    if (params.filters) {
      queryParams.append('filters', JSON.stringify(params.filters));
      queryParams.append('filterLogic', params.filterLogic ?? 'and');
    }

    const response = await api.get<ApiResponse<PagedResponse<ApprovalRoleGroupDto>>>(
      `/api/ApprovalRoleGroup?${queryParams.toString()}`
    );
    
    if (response.success && response.data) {
      const pagedData = response.data;
      
      const rawData = pagedData as unknown as { items?: ApprovalRoleGroupDto[], data?: ApprovalRoleGroupDto[] };
      if (rawData.items && !rawData.data) {
        return {
          ...pagedData,
          data: rawData.items,
        };
      }
      
      return pagedData;
    }
    throw new Error(response.message || 'Onay rol grubu listesi yüklenemedi');
  },

  getById: async (id: number): Promise<ApprovalRoleGroupDto> => {
    const response = await api.get<ApiResponse<ApprovalRoleGroupDto>>(`/api/ApprovalRoleGroup/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Onay rol grubu detayı yüklenemedi');
  },

  create: async (data: CreateApprovalRoleGroupDto): Promise<ApprovalRoleGroupDto> => {
    const response = await api.post<ApiResponse<ApprovalRoleGroupDto>>('/api/ApprovalRoleGroup', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Onay rol grubu oluşturulamadı');
  },

  update: async (id: number, data: UpdateApprovalRoleGroupDto): Promise<ApprovalRoleGroupDto> => {
    const response = await api.put<ApiResponse<ApprovalRoleGroupDto>>(`/api/ApprovalRoleGroup/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Onay rol grubu güncellenemedi');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/ApprovalRoleGroup/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Onay rol grubu silinemedi');
    }
  },
};
