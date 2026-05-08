import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type { ApprovalFlowDto, CreateApprovalFlowDto, UpdateApprovalFlowDto } from '../types/approval-flow-types';

export const approvalFlowApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<ApprovalFlowDto>> => {
    const response = await api.post<ApiResponse<PagedResponse<ApprovalFlowDto>>>(
      '/api/ApprovalFlow/query',
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
    const response = await api.post<ApiResponse<ApprovalFlowDto>>(`/api/ApprovalFlow/${id}/update`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Onay akışı güncellenemedi');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.post<ApiResponse<object>>(`/api/ApprovalFlow/${id}/delete`);
    if (!response.success) {
      throw new Error(response.message || 'Onay akışı silinemedi');
    }
  },
};
