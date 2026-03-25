import { useQuery } from '@tanstack/react-query';
import { activityTypeApi } from '../api/activity-type-api';
import { queryKeys } from '../utils/query-keys';
import type { ActivityTypeDto } from '../types/activity-type-types';

export interface ActivityTypeStats {
  totalActivityTypes: number;
  activeActivityTypes: number;
  newThisMonth: number;
}

export const useActivityTypeStats = (): ReturnType<typeof useQuery<ActivityTypeStats>> => {
  return useQuery({
    queryKey: queryKeys.stats(),
    queryFn: async (): Promise<ActivityTypeStats> => {
      const allActivityTypesResponse = await activityTypeApi.getList({
        pageNumber: 1,
        pageSize: 1000,
      });

      const allActivityTypes = allActivityTypesResponse.data || [];
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const totalActivityTypes = allActivityTypesResponse.totalCount || 0;
      const activeActivityTypes = allActivityTypes.length;
      const newThisMonth = allActivityTypes.filter(
        (activityType: ActivityTypeDto) => new Date(activityType.createdDate) >= startOfMonth
      ).length;

      return {
        totalActivityTypes,
        activeActivityTypes,
        newThisMonth,
      };
    },
    staleTime: 60000,
  });
};
