import { api } from '@/lib/axios';
import { extractData } from '../utils/extract-api-data';
import type {
  ApiResponse,
  CreateUserVisibilityPolicyDto,
  PagedRequest,
  PagedResponse,
  UpdateUserVisibilityPolicyDto,
  UserVisibilityPolicyDto,
} from '../types/access-control.types';

export const userVisibilityPolicyApi = {
  getList: async (params: PagedRequest): Promise<PagedResponse<UserVisibilityPolicyDto>> => {
    const response = await api.post<ApiResponse<PagedResponse<UserVisibilityPolicyDto>>>(
      '/api/user-visibility-policies/query',
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
    const data = extractData(response as ApiResponse<PagedResponse<UserVisibilityPolicyDto>>);
    const rawData = data as unknown as { items?: UserVisibilityPolicyDto[]; data?: UserVisibilityPolicyDto[] };
    if (rawData.items && !rawData.data) {
      return { ...data, data: rawData.items };
    }
    return data;
  },

  getById: async (id: number): Promise<UserVisibilityPolicyDto> => {
    const response = await api.get<ApiResponse<UserVisibilityPolicyDto>>(`/api/user-visibility-policies/${id}`);
    return extractData(response as ApiResponse<UserVisibilityPolicyDto>);
  },

  create: async (dto: CreateUserVisibilityPolicyDto): Promise<UserVisibilityPolicyDto> => {
    const response = await api.post<ApiResponse<UserVisibilityPolicyDto>>('/api/user-visibility-policies', dto);
    return extractData(response as ApiResponse<UserVisibilityPolicyDto>);
  },

  update: async (id: number, dto: UpdateUserVisibilityPolicyDto): Promise<UserVisibilityPolicyDto> => {
    const response = await api.put<ApiResponse<UserVisibilityPolicyDto>>(`/api/user-visibility-policies/${id}`, dto);
    return extractData(response as ApiResponse<UserVisibilityPolicyDto>);
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/user-visibility-policies/${id}`);
    if (!(response as ApiResponse<object>).success) {
      throw new Error((response as ApiResponse<object>).message || 'Delete failed');
    }
  },
};
