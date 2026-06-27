import { useQuery } from '@tanstack/react-query';
import { activityApi } from '../api/activity-api';
import type { ActivityDto } from '../types/activity-types';

export function useCustomerActivities(customerId?: number | null, search = '') {
  const normalizedCustomerId = customerId && customerId > 0 ? customerId : null;

  return useQuery<ActivityDto[]>({
    queryKey: ['activity-management', 'customer-activities', normalizedCustomerId, search],
    enabled: Boolean(normalizedCustomerId),
    queryFn: async () => {
      const result = await activityApi.getList({
        pageNumber: 1,
        pageSize: 50,
        search,
        sortBy: 'StartDateTime',
        sortDirection: 'desc',
        filters: [
          {
            column: 'PotentialCustomerId',
            operator: 'Equals',
            value: String(normalizedCustomerId),
          },
        ],
      });

      return result.data ?? [];
    },
    staleTime: 30_000,
  });
}
