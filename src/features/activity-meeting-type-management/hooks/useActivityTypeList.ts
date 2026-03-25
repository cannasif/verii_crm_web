import { useQuery } from '@tanstack/react-query';
import { activityTypeApi } from '../api/activity-type-api';
import { queryKeys } from '../utils/query-keys';
import type { PagedParams, PagedFilter } from '@/types/api';
import type { ActivityTypeDto } from '../types/activity-type-types';
import type { PagedResponse } from '@/types/api';
import { normalizeQueryParams } from '@/utils/query-params';

export const useActivityTypeList = (
  params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }
): ReturnType<typeof useQuery<PagedResponse<ActivityTypeDto>>> => {
  return useQuery({
    queryKey: queryKeys.list(normalizeQueryParams(params)),
    queryFn: () => activityTypeApi.getList(params),
    staleTime: 30000,
  });
};
