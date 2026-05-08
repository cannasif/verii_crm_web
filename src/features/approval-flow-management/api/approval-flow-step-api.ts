import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type {
  ApprovalFlowStepGetDto,
  ApprovalFlowStepCreateDto,
  ApprovalFlowStepUpdateDto,
  ApprovalFlowStepReorderDto,
} from '../types/approval-flow-step-types';

export const approvalFlowStepApi = {
  getList: async (params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }): Promise<PagedResponse<ApprovalFlowStepGetDto>> => {
    const response = await api.post<ApiResponse<PagedResponse<ApprovalFlowStepGetDto>>>(
      '/api/ApprovalFlowStep/query',
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
      const pagedData = response.data as PagedResponse<ApprovalFlowStepGetDto> & { items?: ApprovalFlowStepGetDto[] };

      if (pagedData.items && !pagedData.data) {
        return {
          ...pagedData,
          data: pagedData.items,
        };
      }

      return pagedData;
    }
    throw new Error(response.message || 'Onay akış adımları yüklenemedi');
  },

  getById: async (id: number): Promise<ApprovalFlowStepGetDto> => {
    const response = await api.get<ApiResponse<ApprovalFlowStepGetDto>>(
      `/api/ApprovalFlowStep/${id}`
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Onay akış adımı detayı yüklenemedi');
  },

  create: async (data: ApprovalFlowStepCreateDto): Promise<ApprovalFlowStepGetDto> => {
    const response = await api.post<ApiResponse<ApprovalFlowStepGetDto>>(
      '/api/ApprovalFlowStep',
      data
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Onay akış adımı oluşturulamadı');
  },

  update: async (
    id: number,
    data: ApprovalFlowStepUpdateDto
  ): Promise<ApprovalFlowStepGetDto> => {
    const response = await api.post<ApiResponse<ApprovalFlowStepGetDto>>(
      `/api/ApprovalFlowStep/${id}/update`,
      data
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Onay akış adımı güncellenemedi');
  },

  reorder: async (data: ApprovalFlowStepReorderDto): Promise<ApprovalFlowStepGetDto[]> => {
    const response = await api.post<ApiResponse<ApprovalFlowStepGetDto[]>>(
      '/api/ApprovalFlowStep/reorder',
      data
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Onay akış adımları sıralanamadı');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.post<ApiResponse<object>>(`/api/ApprovalFlowStep/${id}/delete`);
    if (!response.success) {
      throw new Error(response.message || 'Onay akış adımı silinemedi');
    }
  },
};
