export const CUSTOMER_TYPE_MANAGEMENT_QUERY_KEYS = {
  LIST: 'customerTypeManagement.list',
  DETAIL: 'customerTypeManagement.detail',
  STATS: 'customerTypeManagement.stats',
  OPTIONS: 'customerTypeManagement.options',
} as const;

export const queryKeys = {
  list: (params?: {
    pageNumber?: number;
    pageSize?: number;
    sortBy?: string;
    sortDirection?: string;
    filters?: Record<string, unknown>;
  }) => [CUSTOMER_TYPE_MANAGEMENT_QUERY_KEYS.LIST, params] as const,
  detail: (id: number) => [CUSTOMER_TYPE_MANAGEMENT_QUERY_KEYS.DETAIL, id] as const,
  stats: () => [CUSTOMER_TYPE_MANAGEMENT_QUERY_KEYS.STATS] as const,
  options: () => [CUSTOMER_TYPE_MANAGEMENT_QUERY_KEYS.OPTIONS] as const,
};
