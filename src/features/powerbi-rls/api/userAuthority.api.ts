import { api } from '@/lib/axios';
import type { ApiResponse, PagedParams, PagedResponse } from '@/types/api';
import type { UserAuthorityDto } from '../types/powerbiRls.types';

function toPagedData<T>(raw: { items?: T[]; data?: T[] } & PagedResponse<T>): PagedResponse<T> {
  const list = raw.items ?? raw.data ?? [];
  return { ...raw, data: list };
}

export const userAuthorityApi = {
  getList: async (params: PagedParams): Promise<PagedResponse<UserAuthorityDto>> => {
    const response = await api.post<ApiResponse<PagedResponse<UserAuthorityDto>>>(
      '/api/UserAuthority/query',
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
      return toPagedData(response.data as { items?: UserAuthorityDto[] } & PagedResponse<UserAuthorityDto>);
    }
    throw new Error(response.message ?? 'UserAuthority list could not be loaded');
  },
};
