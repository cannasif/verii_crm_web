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

export const userVisibilityPolicyApi = {
  getList: async (params: PagedRequest): Promise<PagedResponse<UserVisibilityPolicyDto>> => {
    const query = buildQueryParams(params);
    const response = await api.get<ApiResponse<PagedResponse<UserVisibilityPolicyDto>>>(
      `/api/user-visibility-policies${query ? `?${query}` : ''}`
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
