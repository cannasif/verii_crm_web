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

function buildQueryParams(params: PagedRequest): string {
  const queryParams = new URLSearchParams();
  if (params.pageNumber !== undefined) queryParams.append('pageNumber', params.pageNumber.toString());
  if (params.pageSize !== undefined) queryParams.append('pageSize', params.pageSize.toString());
  if (params.search) queryParams.append('search', params.search);
  if (params.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);
  if (params.filters?.length) {
    queryParams.append('filters', JSON.stringify(params.filters));
    queryParams.append('filterLogic', params.filterLogic ?? 'and');
  }
  return queryParams.toString();
}

export const visibilityPolicyApi = {
  getList: async (params: PagedRequest): Promise<PagedResponse<VisibilityPolicyDto>> => {
    const query = buildQueryParams(params);
    const response = await api.get<ApiResponse<PagedResponse<VisibilityPolicyDto>>>(
      `/api/visibility-policies${query ? `?${query}` : ''}`
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
