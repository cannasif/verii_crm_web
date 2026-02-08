import { useQuery } from '@tanstack/react-query';
import { activityApi } from '../api/activity-api';
import { queryKeys } from '../utils/query-keys';
import type { PagedParams, PagedFilter } from '@/types/api';
import type { ActivityDto } from '../types/activity-types';
import type { PagedResponse } from '@/types/api';

export const useActivities = (
  params: Omit<PagedParams, 'filters'> & { filters?: PagedFilter[] | Record<string, unknown> }
): ReturnType<typeof useQuery<PagedResponse<ActivityDto>>> => {
  return useQuery({
    queryKey: queryKeys.list(params),
    queryFn: () => activityApi.getList(params),
    staleTime: 5 * 60 * 1000,
  });
};
