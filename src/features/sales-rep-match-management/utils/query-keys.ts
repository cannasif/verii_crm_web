export const SALES_REP_MATCH_QUERY_KEYS = {
  LIST: 'salesRepMatchManagement.list',
  DETAIL: 'salesRepMatchManagement.detail',
} as const;

export const queryKeys = {
  list: (params?: {
    pageNumber?: number;
    pageSize?: number;
    sortBy?: string;
    sortDirection?: string;
    filters?: Record<string, unknown>;
  }) => [SALES_REP_MATCH_QUERY_KEYS.LIST, params] as const,
  detail: (id: number) => [SALES_REP_MATCH_QUERY_KEYS.DETAIL, id] as const,
};
