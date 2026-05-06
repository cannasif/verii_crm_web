import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { ApprovalRoleDto, CreateApprovalRoleDto, UpdateApprovalRoleDto } from '../types/approval-role-types';

export const approvalRoleApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<ApprovalRoleDto>> => {
    const response = await api.post<ApiResponse<PagedResponse<ApprovalRoleDto>>>(
      '/api/ApprovalRole/query',
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
