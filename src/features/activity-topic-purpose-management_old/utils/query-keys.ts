export const PAYMENT_TYPE_MANAGEMENT_QUERY_KEYS = {
  LIST: 'paymentTypeManagement.list',
  DETAIL: 'paymentTypeManagement.detail',
} as const;

export const queryKeys = {
  list: (params?: {
    pageNumber?: number;
    pageSize?: number;
    sortBy?: string;
    sortDirection?: string;
    filters?: Record<string, unknown>;
  }) => [PAYMENT_TYPE_MANAGEMENT_QUERY_KEYS.LIST, params] as const,
  detail: (id: number) => [PAYMENT_TYPE_MANAGEMENT_QUERY_KEYS.DETAIL, id] as const,
};
