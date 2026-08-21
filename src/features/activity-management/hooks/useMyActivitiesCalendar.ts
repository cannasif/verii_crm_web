import { useQuery } from '@tanstack/react-query';
import { activityApi } from '../api/activity-api';
import { queryKeys } from '../utils/query-keys';

export function useMyActivitiesCalendar(startDate: string, endDate: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.myCalendar(startDate, endDate),
    queryFn: ({ signal }) => activityApi.getMyCalendar(startDate, endDate, signal),
    enabled,
    staleTime: 60_000,
    retry: false,
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
    queryFn: ({ signal }) => activityApi.getDashboardCalendar(
      startDate,
      endDate,
      isSystemAdmin,
      signal,
    ),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}
