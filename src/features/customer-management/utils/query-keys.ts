export const CUSTOMER_MANAGEMENT_QUERY_KEYS = {
  LIST: 'customerManagement.list',
  DETAIL: 'customerManagement.detail',
  STATS: 'customerManagement.stats',
} as const;

export const queryKeys = {
  list: (params?: {
    pageNumber?: number;
    pageSize?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filtersKey?: string;
    filterLogic?: 'and' | 'or';
    contextUserId?: number;
  }) => [CUSTOMER_MANAGEMENT_QUERY_KEYS.LIST, params] as const,
  detail: (id: number) => [CUSTOMER_MANAGEMENT_QUERY_KEYS.DETAIL, id] as const,
  stats: () => [CUSTOMER_MANAGEMENT_QUERY_KEYS.STATS] as const,
};
