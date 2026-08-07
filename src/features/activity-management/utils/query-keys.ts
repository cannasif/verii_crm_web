export const ACTIVITY_QUERY_KEYS = {
  LIST: 'activityManagement.list',
  DETAIL: 'activityManagement.detail',
  MY_CALENDAR: 'activityManagement.myCalendar',
  ADMIN_CALENDAR: 'activityManagement.adminCalendar',
} as const;

export const queryKeys = {
  list: (params?: Omit<import('@/types/api').PagedParams, 'filters'> & {
    filters?: import('@/types/api').PagedFilter[] | Record<string, unknown>;
  }) => [ACTIVITY_QUERY_KEYS.LIST, params] as const,
  detail: (id: number) => [ACTIVITY_QUERY_KEYS.DETAIL, id] as const,
  myCalendar: (startDate: string, endDate: string) => [ACTIVITY_QUERY_KEYS.MY_CALENDAR, startDate, endDate] as const,
  adminCalendar: (startDate: string, endDate: string) => [ACTIVITY_QUERY_KEYS.ADMIN_CALENDAR, startDate, endDate] as const,
};
