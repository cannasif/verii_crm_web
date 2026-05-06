import { api } from '@/lib/axios';
import type { ApiResponse, PagedResponse, PagedParams, PagedFilter } from '@/types/api';
import type {
  PowerBIGroupReportDefinitionGetDto,
  CreatePowerBIGroupReportDefinitionDto,
  UpdatePowerBIGroupReportDefinitionDto,
} from '../types/powerbiGroupReportDefinition.types';

function toPagedData<T>(raw: { items?: T[]; data?: T[] } & PagedResponse<T>): PagedResponse<T> {
  const list = raw.items ?? raw.data ?? [];
  return {
    ...raw,
    data: list,
  };
}

export const powerbiGroupReportDefinitionApi = {
  getList: async (
    params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }
  ): Promise<PagedResponse<PowerBIGroupReportDefinitionGetDto>> => {
    const response = await api.post<
      ApiResponse<PagedResponse<PowerBIGroupReportDefinitionGetDto>>
    >('/api/PowerBIGroupReportDefinition/query', {
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 10,
      search: params.search ?? '',
      sortBy: params.sortBy ?? 'Id',
      sortDirection: params.sortDirection ?? 'asc',
      filterLogic: params.filterLogic ?? 'and',
      filters: params.filters ?? [],
    });
    if (response.success && response.data) {
      return toPagedData(
        response.data as {
          items?: PowerBIGroupReportDefinitionGetDto[];
        } & PagedResponse<PowerBIGroupReportDefinitionGetDto>
      );
    }
    throw new Error(response.message ?? 'PowerBI group-report definition list could not be loaded');
  },

  getById: async (id: number): Promise<PowerBIGroupReportDefinitionGetDto> => {
    const response = await api.get<ApiResponse<PowerBIGroupReportDefinitionGetDto>>(
      `/api/PowerBIGroupReportDefinition/${id}`
    );
    if (response.success && response.data) return response.data;
    throw new Error(response.message ?? 'PowerBI group-report definition could not be loaded');
  },

  create: async (
    data: CreatePowerBIGroupReportDefinitionDto
  ): Promise<PowerBIGroupReportDefinitionGetDto> => {
    const response = await api.post<ApiResponse<PowerBIGroupReportDefinitionGetDto>>(
      '/api/PowerBIGroupReportDefinition',
      data
    );
    if (response.success && response.data) return response.data;
    throw new Error(response.message ?? 'PowerBI group-report definition could not be created');
  },

  update: async (
    id: number,
    data: UpdatePowerBIGroupReportDefinitionDto
  ): Promise<PowerBIGroupReportDefinitionGetDto> => {
    const response = await api.put<ApiResponse<PowerBIGroupReportDefinitionGetDto>>(
      `/api/PowerBIGroupReportDefinition/${id}`,
      data
    );
    if (response.success && response.data) return response.data;
    throw new Error(response.message ?? 'PowerBI group-report definition could not be updated');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(
      `/api/PowerBIGroupReportDefinition/${id}`
    );
    if (!response.success) {
      throw new Error(response.message ?? 'PowerBI group-report definition could not be deleted');
    }
  },
};
