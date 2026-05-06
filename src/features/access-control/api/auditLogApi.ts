import { api } from '@/lib/axios';
import { extractData } from '../utils/extract-api-data';
import type { ApiResponse, AuditLogDto, PagedRequest, PagedResponse } from '../types/access-control.types';

function normalizePagedResponse(data: PagedResponse<AuditLogDto>): PagedResponse<AuditLogDto> {
  const rawData = data as unknown as { items?: AuditLogDto[]; data?: AuditLogDto[] };
  if (rawData.items && !rawData.data) {
    return { ...data, data: rawData.items };
  }
  return data;
}

export const auditLogApi = {
  getList: async (params: PagedRequest): Promise<PagedResponse<AuditLogDto>> => {
    const response = await api.post<ApiResponse<PagedResponse<AuditLogDto>>>('/api/audit-logs/query', {
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 10,
      search: params.search ?? '',
      sortBy: params.sortBy ?? 'id',
      sortDirection: params.sortDirection ?? 'desc',
      filterLogic: params.filterLogic ?? 'and',
      filters: params.filters ?? [],
    });
    const data = extractData(response as ApiResponse<PagedResponse<AuditLogDto>>);
    return normalizePagedResponse(data);
  },

  getById: async (id: number): Promise<AuditLogDto> => {
    const response = await api.get<ApiResponse<AuditLogDto>>(`/api/audit-logs/${id}`);
    return extractData(response as ApiResponse<AuditLogDto>);
  },

  getByTraceId: async (traceId: string, params: PagedRequest): Promise<PagedResponse<AuditLogDto>> => {
    const response = await api.post<ApiResponse<PagedResponse<AuditLogDto>>>(
      `/api/audit-logs/trace/${encodeURIComponent(traceId)}/query`,
      {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 10,
        search: params.search ?? '',
        sortBy: params.sortBy ?? 'id',
        sortDirection: params.sortDirection ?? 'desc',
        filterLogic: params.filterLogic ?? 'and',
        filters: params.filters ?? [],
      }
    );
    const data = extractData(response as ApiResponse<PagedResponse<AuditLogDto>>);
    return normalizePagedResponse(data);
  },
};
