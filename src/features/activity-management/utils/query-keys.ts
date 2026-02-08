export const ACTIVITY_QUERY_KEYS = {
  LIST: 'activityManagement.list',
  DETAIL: 'activityManagement.detail',
} as const;

export const queryKeys = {
  list: (params?: {
    pageNumber?: number;
    pageSize?: number;
    sortBy?: string;
    sortDirection?: string;
    filters?: import('@/types/api').PagedFilter[] | Record<string, unknown>;
  }) => [ACTIVITY_QUERY_KEYS.LIST, params] as const,
  detail: (id: number) => [ACTIVITY_QUERY_KEYS.DETAIL, id] as const,
};
