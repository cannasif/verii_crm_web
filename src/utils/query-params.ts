import type { PagedParams, PagedFilter } from '@/types/api';

type PagedRequestLike = {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  searchFields?: readonly string[];
};

export function canonicalizeSearchFields(fields?: readonly string[]): string[] | undefined {
  const canonical = [...new Set(fields?.map((field) => field.trim()).filter(Boolean) ?? [])]
    .sort();
  return canonical.length > 0 ? canonical : undefined;
}

/**
 * The single serialization boundary for every paged request. Search text is
 * forwarded verbatim; only field identifiers are trimmed, de-duplicated, and
 * sorted so requests and React Query keys are deterministic.
 */
export function createPagedRequestPayload<T extends PagedRequestLike>(params: T): T {
  const hasSearch = typeof params.search === 'string' && params.search.trim().length > 0;

  return {
    ...params,
    search: hasSearch ? params.search : undefined,
    searchFields: hasSearch ? canonicalizeSearchFields(params.searchFields) : undefined,
  };
}

export const appendIndexedFilterParams = (
  queryParams: URLSearchParams,
  filters?: PagedFilter[] | Record<string, unknown>
): URLSearchParams => {
  if (!Array.isArray(filters) || filters.length === 0) {
    return queryParams;
  }

  filters.forEach((filter, index) => {
    if (!filter || !filter.column || !filter.operator) {
      return;
    }

    queryParams.append(`filters[${index}].column`, String(filter.column));
    queryParams.append(`filters[${index}].operator`, String(filter.operator));
    queryParams.append(`filters[${index}].value`, filter.value == null ? '' : String(filter.value));
  });

  return queryParams;
};

export const appendPagedQueryParams = (
  queryParams: URLSearchParams,
  params: Omit<PagedParams, 'filters'> & { filters?: PagedFilter[] | Record<string, unknown> },
  options?: {
    pageParamName?: string;
    pageSizeParamName?: string;
  }
): URLSearchParams => {
  const payload = createPagedRequestPayload(params);
  const pageParamName = options?.pageParamName ?? 'pageNumber';
  const pageSizeParamName = options?.pageSizeParamName ?? 'pageSize';

  if (payload.pageNumber) queryParams.append(pageParamName, payload.pageNumber.toString());
  if (payload.pageSize) queryParams.append(pageSizeParamName, payload.pageSize.toString());
  if (payload.search) {
    queryParams.append('search', payload.search);
    payload.searchFields?.forEach((field) => queryParams.append('searchFields', field));
  }
  if (payload.sortBy) queryParams.append('sortBy', payload.sortBy);
  if (payload.sortDirection) queryParams.append('sortDirection', payload.sortDirection);
  if (payload.filters) {
    appendIndexedFilterParams(queryParams, payload.filters);
    queryParams.append('filterLogic', payload.filterLogic ?? 'and');
  }

  return queryParams;
};

export const normalizeQueryParams = (
  params: Omit<PagedParams, 'filters'> & { filters?: PagedFilter[] | Record<string, unknown> }
): {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  searchFields?: string[];
  sortBy?: string;
  sortDirection?: string;
  filtersKey?: string;
  filterLogic?: 'and' | 'or';
} => {
  const payload = createPagedRequestPayload(params);
  return {
    pageNumber: payload.pageNumber,
    pageSize: payload.pageSize,
    search: payload.search,
    searchFields: payload.searchFields,
    sortBy: payload.sortBy,
    sortDirection: payload.sortDirection,
    filterLogic: payload.filterLogic,
    ...(payload.filters != null ? { filtersKey: JSON.stringify(payload.filters) } : {}),
  };
};
