import { api } from '@/lib/axios';
import { extractData } from '../utils/extract-api-data';
import type {
  ApprovalOverrideAuditEntry,
  ApiResponse,
  CreateVisibilityPolicyDto,
  PagedRequest,
  PagedResponse,
  UpdateVisibilityPolicyDto,
  VisibilityActionSimulationResult,
  VisibilityPreviewResult,
  VisibilityPolicyDto,
} from '../types/access-control.types';

export const visibilityPolicyApi = {
  getList: async (params: PagedRequest): Promise<PagedResponse<VisibilityPolicyDto>> => {
    const response = await api.post<ApiResponse<PagedResponse<VisibilityPolicyDto>>>(
      '/api/visibility-policies/query',
      {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 10,
        search: params.search ?? '',
        sortBy: params.sortBy ?? 'id',
        sortDirection: params.sortDirection ?? 'asc',
        filterLogic: params.filterLogic ?? 'and',
        filters: params.filters ?? [],
      }
    );
    const data = extractData(response as ApiResponse<PagedResponse<VisibilityPolicyDto>>);
    const rawData = data as unknown as { items?: VisibilityPolicyDto[]; data?: VisibilityPolicyDto[] };
    if (rawData.items && !rawData.data) {
      return { ...data, data: rawData.items };
    }
    return data;
  },

  getById: async (id: number): Promise<VisibilityPolicyDto> => {
    const response = await api.get<ApiResponse<VisibilityPolicyDto>>(`/api/visibility-policies/${id}`);
    return extractData(response as ApiResponse<VisibilityPolicyDto>);
  },

  create: async (dto: CreateVisibilityPolicyDto): Promise<VisibilityPolicyDto> => {
    const response = await api.post<ApiResponse<VisibilityPolicyDto>>('/api/visibility-policies', dto);
    return extractData(response as ApiResponse<VisibilityPolicyDto>);
  },

  update: async (id: number, dto: UpdateVisibilityPolicyDto): Promise<VisibilityPolicyDto> => {
    const response = await api.put<ApiResponse<VisibilityPolicyDto>>(`/api/visibility-policies/${id}`, dto);
    return extractData(response as ApiResponse<VisibilityPolicyDto>);
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/visibility-policies/${id}`);
    if (!(response as ApiResponse<object>).success) {
      throw new Error((response as ApiResponse<object>).message || 'Delete failed');
    }
  },

  preview: async (userId: number, entityType: string): Promise<VisibilityPreviewResult> => {
    const response = await api.get<ApiResponse<VisibilityPreviewResult>>(
      `/api/visibility-policies/preview?userId=${userId}&entityType=${encodeURIComponent(entityType)}`
    );
    return extractData(response as ApiResponse<VisibilityPreviewResult>);
  },

  approvalAudit: async (userId: number, entityType: string): Promise<ApprovalOverrideAuditEntry[]> => {
    const response = await api.get<ApiResponse<ApprovalOverrideAuditEntry[]>>(
      `/api/visibility-policies/approval-audit?userId=${userId}&entityType=${encodeURIComponent(entityType)}`
    );
    return extractData(response as ApiResponse<ApprovalOverrideAuditEntry[]>);
  },

  simulate: async (userId: number, entityType: string, entityId: number): Promise<VisibilityActionSimulationResult> => {
    const response = await api.get<ApiResponse<VisibilityActionSimulationResult>>(
      `/api/visibility-policies/simulate?userId=${userId}&entityType=${encodeURIComponent(entityType)}&entityId=${entityId}`
    );
    return extractData(response as ApiResponse<VisibilityActionSimulationResult>);
  },
};
