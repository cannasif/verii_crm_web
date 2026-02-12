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
    const queryParams = new URLSearchParams();
    if (params.pageNumber != null) queryParams.append('pageNumber', String(params.pageNumber));
    if (params.pageSize != null) queryParams.append('pageSize', String(params.pageSize));
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);
    if (params.filters) {
      queryParams.append('filters', JSON.stringify(params.filters));
      queryParams.append('filterLogic', params.filterLogic ?? 'and');
    }

    const response = await api.get<
      ApiResponse<PagedResponse<PowerBIGroupReportDefinitionGetDto>>
    >(`/api/PowerBIGroupReportDefinition?${queryParams.toString()}`);
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
