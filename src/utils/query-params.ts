import type { PagedParams, PagedFilter } from '@/types/api';

export const normalizeQueryParams = (
  params: Omit<PagedParams, 'filters'> & { filters?: PagedFilter[] | Record<string, unknown> }
): {
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
  filters?: Record<string, unknown>;
} => {
  return {
    pageNumber: params.pageNumber,
    pageSize: params.pageSize,
    sortBy: params.sortBy,
    sortDirection: params.sortDirection,
    filters: params.filters && Array.isArray(params.filters)
      ? {}
      : (params.filters as Record<string, unknown> | undefined),
  };
};
