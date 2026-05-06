import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type {
  PowerBIReportDefinitionGetDto,
  CreatePowerBIReportDefinitionDto,
  UpdatePowerBIReportDefinitionDto,
} from '../types/powerbiReportDefinition.types';

function toPagedData<T>(raw: { items?: T[]; data?: T[] } & PagedResponse<T>): PagedResponse<T> {
  const list = raw.items ?? raw.data ?? [];
  return {
    ...raw,
    data: list,
  };
}

export const powerbiReportDefinitionApi = {
  getList: async (
    params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }
  ): Promise<PagedResponse<PowerBIReportDefinitionGetDto>> => {
    const response = await api.post<ApiResponse<PagedResponse<PowerBIReportDefinitionGetDto>>>(
      '/api/PowerBIReportDefinition/query',
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
      return toPagedData(response.data as { items?: PowerBIReportDefinitionGetDto[] } & PagedResponse<PowerBIReportDefinitionGetDto>);
    }
    throw new Error(response.message ?? 'PowerBI report definition list could not be loaded');
  },

  getById: async (id: number): Promise<PowerBIReportDefinitionGetDto> => {
    const response = await api.get<ApiResponse<PowerBIReportDefinitionGetDto>>(
      `/api/PowerBIReportDefinition/${id}`
    );
    if (response.success && response.data) return response.data;
    throw new Error(response.message ?? 'PowerBI report definition could not be loaded');
  },

  create: async (data: CreatePowerBIReportDefinitionDto): Promise<PowerBIReportDefinitionGetDto> => {
    const response = await api.post<ApiResponse<PowerBIReportDefinitionGetDto>>(
      '/api/PowerBIReportDefinition',
      data
    );
    if (response.success && response.data) return response.data;
    throw new Error(response.message ?? 'PowerBI report definition could not be created');
  },

  update: async (
    id: number,
    data: UpdatePowerBIReportDefinitionDto
  ): Promise<PowerBIReportDefinitionGetDto> => {
    const response = await api.put<ApiResponse<PowerBIReportDefinitionGetDto>>(
      `/api/PowerBIReportDefinition/${id}`,
      data
    );
    if (response.success && response.data) return response.data;
    throw new Error(response.message ?? 'PowerBI report definition could not be updated');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/PowerBIReportDefinition/${id}`);
    if (!response.success) {
      throw new Error(response.message ?? 'PowerBI report definition could not be deleted');
    }
  },
};
