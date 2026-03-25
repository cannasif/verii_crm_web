export const ACTIVITY_TYPE_QUERY_KEYS = {
  LIST: 'activityTypeManagement.activityType.list',
  DETAIL: 'activityTypeManagement.activityType.detail',
  STATS: 'activityTypeManagement.activityType.stats',
} as const;

export const queryKeys = {
  list: (params?: {
    pageNumber?: number;
    pageSize?: number;
    sortBy?: string;
    sortDirection?: string;
    filters?: Record<string, unknown>;
  }) => [ACTIVITY_TYPE_QUERY_KEYS.LIST, params] as const,
  detail: (id: number) => [ACTIVITY_TYPE_QUERY_KEYS.DETAIL, id] as const,
  stats: () => [ACTIVITY_TYPE_QUERY_KEYS.STATS] as const,
};
