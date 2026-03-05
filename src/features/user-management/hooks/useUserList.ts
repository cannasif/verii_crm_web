import { useQuery } from '@tanstack/react-query';
import { userApi } from '../api/user-api';
import { queryKeys } from '../utils/query-keys';
import type { PagedParams } from '@/types/api';
import type { UserDto } from '../types/user-types';
import type { PagedResponse } from '@/types/api';

export const useUserList = (
  params: PagedParams
): ReturnType<typeof useQuery<PagedResponse<UserDto>>> => {
  const queryParams = {
    pageNumber: params.pageNumber,
    pageSize: params.pageSize,
    sortBy: params.sortBy,
    sortDirection: params.sortDirection,
    filters: params.filters,
  };
  return useQuery({
    queryKey: queryKeys.list(queryParams),
    queryFn: () => userApi.getList(params),
    staleTime: 30000,
  });
};
