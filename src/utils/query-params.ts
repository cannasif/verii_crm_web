import type { PagedParams, PagedFilter } from '@/types/api';

export const appendPagedQueryParams = (
  queryParams: URLSearchParams,
  params: Omit<PagedParams, 'filters'> & { filters?: PagedFilter[] | Record<string, unknown> },
  options?: {
    pageParamName?: string;
    pageSizeParamName?: string;
  }
): URLSearchParams => {
  const pageParamName = options?.pageParamName ?? 'pageNumber';
  const pageSizeParamName = options?.pageSizeParamName ?? 'pageSize';

  if (params.pageNumber) queryParams.append(pageParamName, params.pageNumber.toString());
  if (params.pageSize) queryParams.append(pageSizeParamName, params.pageSize.toString());
  if (params.search?.trim()) queryParams.append('search', params.search.trim());
  if (params.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);
  if (params.filters) {
    queryParams.append('filters', JSON.stringify(params.filters));
    queryParams.append('filterLogic', params.filterLogic ?? 'and');
  }

  return queryParams;
};

export const normalizeQueryParams = (
  params: Omit<PagedParams, 'filters'> & { filters?: PagedFilter[] | Record<string, unknown> }
): {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDirection?: string;
  filtersKey?: string;
  filterLogic?: 'and' | 'or';
} => {
  return {
    pageNumber: params.pageNumber,
    pageSize: params.pageSize,
    search: params.search,
    sortBy: params.sortBy,
    sortDirection: params.sortDirection,
    filterLogic: params.filterLogic,
    ...(params.filters != null ? { filtersKey: JSON.stringify(params.filters) } : {}),
  };
};
