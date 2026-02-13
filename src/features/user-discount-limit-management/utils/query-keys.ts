export const USER_DISCOUNT_LIMIT_QUERY_KEYS = {
  LIST: 'userDiscountLimitManagement.list',
  DETAIL: 'userDiscountLimitManagement.detail',
  BY_SALESPERSON: 'userDiscountLimitManagement.bySalesperson',
  BY_GROUP: 'userDiscountLimitManagement.byGroup',
  BY_SALESPERSON_AND_GROUP: 'userDiscountLimitManagement.bySalespersonAndGroup',
  EXISTS: 'userDiscountLimitManagement.exists',
} as const;

export const queryKeys = {
  list: (params?: {
    pageNumber?: number;
    pageSize?: number;
    sortBy?: string;
    sortDirection?: string;
    filters?: import('@/types/api').PagedFilter[] | Record<string, unknown>;
  }) => [USER_DISCOUNT_LIMIT_QUERY_KEYS.LIST, params] as const,
  detail: (id: number) => [USER_DISCOUNT_LIMIT_QUERY_KEYS.DETAIL, id] as const,
  bySalesperson: (salespersonId: number) => [USER_DISCOUNT_LIMIT_QUERY_KEYS.BY_SALESPERSON, salespersonId] as const,
  byGroup: (erpProductGroupCode: string) => [USER_DISCOUNT_LIMIT_QUERY_KEYS.BY_GROUP, erpProductGroupCode] as const,
  bySalespersonAndGroup: (salespersonId: number, erpProductGroupCode: string) => 
    [USER_DISCOUNT_LIMIT_QUERY_KEYS.BY_SALESPERSON_AND_GROUP, salespersonId, erpProductGroupCode] as const,
  exists: (id: number) => [USER_DISCOUNT_LIMIT_QUERY_KEYS.EXISTS, id] as const,
  existsBySalespersonAndGroup: (salespersonId: number, erpProductGroupCode: string) =>
    [USER_DISCOUNT_LIMIT_QUERY_KEYS.EXISTS, 'salesperson', salespersonId, 'group', erpProductGroupCode] as const,
};
