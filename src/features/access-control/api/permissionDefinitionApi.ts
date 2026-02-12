import { api } from '@/lib/axios';
import { extractData } from '../utils/extract-api-data';
import type {
  ApiResponse,
  PagedRequest,
  PagedResponse,
  PermissionDefinitionDto,
  CreatePermissionDefinitionDto,
  UpdatePermissionDefinitionDto,
  SyncPermissionDefinitionsDto,
  PermissionDefinitionSyncResultDto,
} from '../types/access-control.types';

function buildQueryParams(params: PagedRequest): string {
  const queryParams = new URLSearchParams();
  if (params.pageNumber !== undefined) queryParams.append('pageNumber', params.pageNumber.toString());
  if (params.pageSize !== undefined) queryParams.append('pageSize', params.pageSize.toString());
  if (params.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);
  if (params.filters?.length) {
    queryParams.append('filters', JSON.stringify(params.filters));
    queryParams.append('filterLogic', params.filterLogic ?? 'and');
  }
  return queryParams.toString();
}

export const permissionDefinitionApi = {
  getList: async (params: PagedRequest): Promise<PagedResponse<PermissionDefinitionDto>> => {
    const query = buildQueryParams(params);
    const response = await api.get<ApiResponse<PagedResponse<PermissionDefinitionDto>>>(
      `/api/permission-definitions${query ? `?${query}` : ''}`
    );
    const data = extractData(response as ApiResponse<PagedResponse<PermissionDefinitionDto>>);
    const rawData = data as unknown as { items?: PermissionDefinitionDto[]; data?: PermissionDefinitionDto[] };
    if (rawData.items && !rawData.data) {
      return { ...data, data: rawData.items };
    }
    return data;
  },

  getById: async (id: number): Promise<PermissionDefinitionDto> => {
    const response = await api.get<ApiResponse<PermissionDefinitionDto>>(
      `/api/permission-definitions/${id}`
    );
    return extractData(response as ApiResponse<PermissionDefinitionDto>);
  },

  create: async (dto: CreatePermissionDefinitionDto): Promise<PermissionDefinitionDto> => {
    const response = await api.post<ApiResponse<PermissionDefinitionDto>>(
      '/api/permission-definitions',
      dto
    );
    return extractData(response as ApiResponse<PermissionDefinitionDto>);
  },

  update: async (
    id: number,
    dto: UpdatePermissionDefinitionDto
  ): Promise<PermissionDefinitionDto> => {
    const response = await api.put<ApiResponse<PermissionDefinitionDto>>(
      `/api/permission-definitions/${id}`,
      dto
    );
    return extractData(response as ApiResponse<PermissionDefinitionDto>);
  },



  sync: async (dto: SyncPermissionDefinitionsDto): Promise<PermissionDefinitionSyncResultDto> => {
    const response = await api.post<ApiResponse<PermissionDefinitionSyncResultDto>>(
      '/api/permission-definitions/sync',
      dto
    );
    return extractData(response as ApiResponse<PermissionDefinitionSyncResultDto>);
  },
  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/permission-definitions/${id}`);
    if (!(response as ApiResponse<object>).success) {
      throw new Error((response as ApiResponse<object>).message || 'Delete failed');
    }
  },
};
