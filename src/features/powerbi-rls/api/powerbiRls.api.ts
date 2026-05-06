import { api } from '@/lib/axios';
import type { ApiResponse, PagedParams, PagedResponse } from '@/types/api';
import type {
  PowerBIReportRoleMapping,
  CreatePowerBIReportRoleMappingDto,
  UpdatePowerBIReportRoleMappingDto,
} from '../types/powerbiRls.types';

function toPagedData<T>(raw: { items?: T[]; data?: T[] } & PagedResponse<T>): PagedResponse<T> {
  const list = raw.items ?? raw.data ?? [];
  return { ...raw, data: list };
}

export const powerbiRlsApi = {
  getList: async (params: PagedParams): Promise<PagedResponse<PowerBIReportRoleMapping>> => {
    const response = await api.post<ApiResponse<PagedResponse<PowerBIReportRoleMapping>>>(
      '/api/powerbi/report-role-mappings/query',
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
      return toPagedData(response.data as { items?: PowerBIReportRoleMapping[] } & PagedResponse<PowerBIReportRoleMapping>);
    }
    throw new Error(response.message ?? 'RLS mapping list could not be loaded');
  },

  getById: async (id: number): Promise<PowerBIReportRoleMapping> => {
    const response = await api.get<ApiResponse<PowerBIReportRoleMapping>>(
      `/api/powerbi/report-role-mappings/${id}`
    );
    if (response.success && response.data) return response.data;
    throw new Error(response.message ?? 'RLS mapping could not be loaded');
  },

  create: async (data: CreatePowerBIReportRoleMappingDto): Promise<PowerBIReportRoleMapping> => {
    const response = await api.post<ApiResponse<PowerBIReportRoleMapping>>(
      '/api/powerbi/report-role-mappings',
      data
    );
    if (response.success && response.data) return response.data;
    throw new Error(response.message ?? 'RLS mapping could not be created');
  },

  update: async (
    id: number,
    data: UpdatePowerBIReportRoleMappingDto
  ): Promise<PowerBIReportRoleMapping> => {
    const response = await api.put<ApiResponse<PowerBIReportRoleMapping>>(
      `/api/powerbi/report-role-mappings/${id}`,
      data
    );
    if (response.success && response.data) return response.data;
    throw new Error(response.message ?? 'RLS mapping could not be updated');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/powerbi/report-role-mappings/${id}`);
    if (!response.success) {
      throw new Error(response.message ?? 'RLS mapping could not be deleted');
    }
  },
};
