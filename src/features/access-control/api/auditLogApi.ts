import { api } from '@/lib/axios';
import { extractData } from '../utils/extract-api-data';
import type { ApiResponse, AuditLogDto, PagedRequest, PagedResponse } from '../types/access-control.types';

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

function normalizePagedResponse(data: PagedResponse<AuditLogDto>): PagedResponse<AuditLogDto> {
  const rawData = data as unknown as { items?: AuditLogDto[]; data?: AuditLogDto[] };
  if (rawData.items && !rawData.data) {
    return { ...data, data: rawData.items };
  }
  return data;
}

export const auditLogApi = {
  getList: async (params: PagedRequest): Promise<PagedResponse<AuditLogDto>> => {
    const query = buildQueryParams(params);
    const response = await api.get<ApiResponse<PagedResponse<AuditLogDto>>>(`/api/audit-logs${query ? `?${query}` : ''}`);
    const data = extractData(response as ApiResponse<PagedResponse<AuditLogDto>>);
    return normalizePagedResponse(data);
  },

  getById: async (id: number): Promise<AuditLogDto> => {
    const response = await api.get<ApiResponse<AuditLogDto>>(`/api/audit-logs/${id}`);
    return extractData(response as ApiResponse<AuditLogDto>);
  },

  getByTraceId: async (traceId: string, params: PagedRequest): Promise<PagedResponse<AuditLogDto>> => {
    const query = buildQueryParams(params);
    const response = await api.get<ApiResponse<PagedResponse<AuditLogDto>>>(
      `/api/audit-logs/trace/${encodeURIComponent(traceId)}${query ? `?${query}` : ''}`
    );
    const data = extractData(response as ApiResponse<PagedResponse<AuditLogDto>>);
    return normalizePagedResponse(data);
  },
};
