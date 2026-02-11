export const SALES_TYPE_QUERY_KEYS = {
  LIST: 'salesTypeManagement.list',
  DETAIL: 'salesTypeManagement.detail',
} as const;

export const queryKeys = {
  list: (params?: {
    pageNumber?: number;
    pageSize?: number;
    sortBy?: string;
    sortDirection?: string;
    filters?: Record<string, unknown>;
  }) => [SALES_TYPE_QUERY_KEYS.LIST, params] as const,
  detail: (id: number) => [SALES_TYPE_QUERY_KEYS.DETAIL, id] as const,
};
