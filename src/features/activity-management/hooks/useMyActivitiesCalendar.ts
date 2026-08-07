import { useQuery } from '@tanstack/react-query';
import { activityApi } from '../api/activity-api';
import { queryKeys } from '../utils/query-keys';

export function useMyActivitiesCalendar(startDate: string, endDate: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.myCalendar(startDate, endDate),
    queryFn: () => activityApi.getMyCalendar(startDate, endDate),
    enabled,
    staleTime: 60_000,
  });
}

export function useDashboardActivitiesCalendar(
  startDate: string,
  endDate: string,
  isSystemAdmin: boolean,
  enabled = true,
) {
  return useQuery({
    queryKey: isSystemAdmin
      ? queryKeys.adminCalendar(startDate, endDate)
      : queryKeys.myCalendar(startDate, endDate),
    queryFn: () => isSystemAdmin
      ? activityApi.getAdminCalendar(startDate, endDate)
      : activityApi.getMyCalendar(startDate, endDate),
    enabled,
    staleTime: 60_000,
  });
}
