import { useMemo } from 'react';
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import type { PagedFilter, PagedResponse } from '@/types/api';

interface DropdownFetchPageParams {
  pageNumber: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortDirection?: string;
  filters?: PagedFilter[] | Record<string, unknown>;
  filterLogic?: 'and' | 'or';
  contextUserId?: number;
  signal: AbortSignal;
}

interface UseDropdownInfiniteSearchOptions<TItem> {
  entityKey: string | readonly (string | number)[];
  searchTerm: string;
  enabled?: boolean;
  minChars: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: string;
  extraQueryKey?: readonly unknown[];
  contextUserId?: number;
  buildFilters: (searchTerm: string) => PagedFilter[] | Record<string, unknown> | undefined;
  filterLogic?: 'and' | 'or';
  fetchPage: (params: DropdownFetchPageParams) => Promise<PagedResponse<TItem>>;
}

interface UseDropdownInfiniteSearchResult<TItem> {
  items: TItem[];
  isBrowseMode: boolean;
  isSearchMode: boolean;
  isThresholdMode: boolean;
  hasNextPage: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
  data: InfiniteData<PagedResponse<TItem>> | undefined;
}

export function useDropdownInfiniteSearch<TItem>({
  entityKey,
  searchTerm,
  enabled = true,
  minChars,
  pageSize,
  sortBy,
  sortDirection,
  extraQueryKey,
  contextUserId,
  buildFilters,
  fetchPage,
  filterLogic = 'or',
}: UseDropdownInfiniteSearchOptions<TItem>): UseDropdownInfiniteSearchResult<TItem> {
  const normalizedSearchTerm = searchTerm.trim();
  const isBrowseMode = normalizedSearchTerm.length === 0;
  const isSearchMode = normalizedSearchTerm.length >= minChars;
  // Prevent request spam for partial inputs that did not reach the search threshold.
  const isThresholdMode = !isBrowseMode && !isSearchMode;
  const modeForQuery = isSearchMode ? 'search' : 'browse';
  const activeSearchTerm = isSearchMode ? normalizedSearchTerm : '';

  const query = useInfiniteQuery({
    // Keep dropdown keys isolated so they never collide with grid pagination keys.
    queryKey: [
      entityKey,
      'dropdown',
      modeForQuery,
      activeSearchTerm,
      sortBy ?? null,
      sortDirection ?? null,
      pageSize,
      contextUserId ?? null,
      ...(extraQueryKey ?? []),
    ],
    enabled,
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }) => {
      const filters = buildFilters(activeSearchTerm);
      return fetchPage({
        pageNumber: pageParam,
        pageSize,
        search: activeSearchTerm || undefined,
        sortBy,
        sortDirection,
        filters: filters ?? undefined,
        filterLogic: filters ? filterLogic : undefined,
        contextUserId: contextUserId ?? undefined,
        signal,
      });
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasNextPage ? lastPage.pageNumber + 1 : undefined;
    },
  });

  const items = useMemo(() => {
    if (!query.data) {
      return [] as TItem[];
    }

    return query.data.pages.flatMap((page) => page.data);
  }, [query.data]);

  return {
    items,
    isBrowseMode,
    isSearchMode,
    isThresholdMode,
    hasNextPage: query.hasNextPage ?? false,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    data: query.data,
  };
}
