import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { ApprovalFlowDto, CreateApprovalFlowDto, UpdateApprovalFlowDto } from '../types/approval-flow-types';

export const approvalFlowApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<ApprovalFlowDto>> => {
    const queryParams = new URLSearchParams();
    if (params.pageNumber) queryParams.append('pageNumber', params.pageNumber.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);
    if (params.filters) {
      queryParams.append('filters', JSON.stringify(params.filters));
      queryParams.append('filterLogic', params.filterLogic ?? 'and');
    }

    const response = await api.get<ApiResponse<PagedResponse<ApprovalFlowDto>>>(
      `/api/ApprovalFlow?${queryParams.toString()}`
    );
    
    if (response.success && response.data) {
      const pagedData = response.data as PagedResponse<ApprovalFlowDto> & { items?: ApprovalFlowDto[] };
      
      if (pagedData.items && !pagedData.data) {
        return {
          ...pagedData,
          data: pagedData.items,
        };
      }
      
      return pagedData;
    }
    throw new Error(response.message || 'Onay akışı listesi yüklenemedi');
  },

  getById: async (id: number): Promise<ApprovalFlowDto> => {
    const response = await api.get<ApiResponse<ApprovalFlowDto>>(`/api/ApprovalFlow/${id}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Onay akışı detayı yüklenemedi');
  },

  create: async (data: CreateApprovalFlowDto): Promise<ApprovalFlowDto> => {
    const response = await api.post<ApiResponse<ApprovalFlowDto>>('/api/ApprovalFlow', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Onay akışı oluşturulamadı');
  },

  update: async (id: number, data: UpdateApprovalFlowDto): Promise<ApprovalFlowDto> => {
    const response = await api.put<ApiResponse<ApprovalFlowDto>>(`/api/ApprovalFlow/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Onay akışı güncellenemedi');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/ApprovalFlow/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Onay akışı silinemedi');
    }
  },
};
