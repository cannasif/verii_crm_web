import { api } from '@/lib/axios';
import { extractData } from '../utils/extract-api-data';
import type {
  ApiResponse,
  PagedRequest,
  PagedResponse,
  PermissionGroupDto,
  CreatePermissionGroupDto,
  UpdatePermissionGroupDto,
  SetPermissionGroupPermissionsDto,
} from '../types/access-control.types';

export const permissionGroupApi = {
  getList: async (params: PagedRequest): Promise<PagedResponse<PermissionGroupDto>> => {
    const response = await api.post<ApiResponse<PagedResponse<PermissionGroupDto>>>(
      '/api/permission-groups/query',
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
    const data = extractData(response as ApiResponse<PagedResponse<PermissionGroupDto>>);
    const rawData = data as unknown as { items?: PermissionGroupDto[]; data?: PermissionGroupDto[] };
    if (rawData.items && !rawData.data) {
      return { ...data, data: rawData.items };
    }
    return data;
  },

  getById: async (id: number): Promise<PermissionGroupDto> => {
    const response = await api.get<ApiResponse<PermissionGroupDto>>(
      `/api/permission-groups/${id}`
    );
    return extractData(response as ApiResponse<PermissionGroupDto>);
  },

  create: async (dto: CreatePermissionGroupDto): Promise<PermissionGroupDto> => {
    const response = await api.post<ApiResponse<PermissionGroupDto>>(
      '/api/permission-groups',
      dto
    );
    return extractData(response as ApiResponse<PermissionGroupDto>);
  },

  update: async (id: number, dto: UpdatePermissionGroupDto): Promise<PermissionGroupDto> => {
    const response = await api.put<ApiResponse<PermissionGroupDto>>(
      `/api/permission-groups/${id}`,
      dto
    );
    return extractData(response as ApiResponse<PermissionGroupDto>);
  },

  setPermissions: async (
    id: number,
    dto: SetPermissionGroupPermissionsDto
  ): Promise<void> => {
    const response = await api.put<ApiResponse<object>>(
      `/api/permission-groups/${id}/permissions`,
      dto
    );
    if (!(response as ApiResponse<object>).success) {
      throw new Error((response as ApiResponse<object>).message || 'Set permissions failed');
    }
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/permission-groups/${id}`);
    if (!(response as ApiResponse<object>).success) {
      throw new Error((response as ApiResponse<object>).message || 'Delete failed');
    }
  },
};
