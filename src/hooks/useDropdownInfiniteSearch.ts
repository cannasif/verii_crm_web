import { useMemo } from 'react';
import { keepPreviousData, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import type { PagedFilter, PagedResponse } from '@/types/api';
import {
  isDropdownSearchSettling,
  resolveDropdownSearchInputState,
} from '@/hooks/dropdown-search-state';

interface DropdownFetchPageParams {
  pageNumber: number;
  pageSize: number;
  search?: string;
  searchFields?: string[];
  sortBy?: string;
  sortDirection?: string;
  filters?: PagedFilter[] | Record<string, unknown>;
  filterLogic?: 'and' | 'or';
  contextUserId?: number;
  signal: AbortSignal;
}

interface UseDropdownInfiniteSearchOptions<TItem> {
  entityKey: string | readonly (string | number)[];
  /**
   * The term currently shown in the input. Supply this when `searchTerm` is
   * debounced so an old empty response is not presented as the result of the
   * newer input while the debounce/query transition is still pending.
   */
  inputSearchTerm?: string;
  searchTerm: string;
  enabled?: boolean;
  minChars: number;
  pageSize: number;
  sortBy?: string;
  searchFields?: readonly string[];
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
  isSearchSettling: boolean;
  hasNextPage: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
  fetchNextPage: () => Promise<unknown>;
  data: InfiniteData<PagedResponse<TItem>> | undefined;
}

export function useDropdownInfiniteSearch<TItem>({
  entityKey,
  inputSearchTerm,
  searchTerm,
  enabled = true,
  minChars,
  pageSize,
  sortBy,
  searchFields = [],
  sortDirection,
  extraQueryKey,
  contextUserId,
  buildFilters,
  fetchPage,
  filterLogic = 'or',
}: UseDropdownInfiniteSearchOptions<TItem>): UseDropdownInfiniteSearchResult<TItem> {
  const querySearchState = resolveDropdownSearchInputState(searchTerm, minChars);
  const inputSearchState = resolveDropdownSearchInputState(
    inputSearchTerm ?? searchTerm,
    minChars,
  );
  const {
    isBrowseMode,
    isSearchMode,
    isThresholdMode,
  } = querySearchState;
  // Prevent request spam for partial inputs that did not reach the search threshold.
  const modeForQuery = isSearchMode ? 'search' : 'browse';
  const activeSearchTerm = querySearchState.activeTerm;
  const isSearchSettling = isDropdownSearchSettling(inputSearchState, querySearchState);

  const query = useInfiniteQuery({
    // Keep dropdown keys isolated so they never collide with grid pagination keys.
    queryKey: [
      entityKey,
      'dropdown',
      modeForQuery,
      activeSearchTerm,
      searchFields.join('|'),
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
        searchFields: activeSearchTerm ? [...searchFields] : undefined,
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
    placeholderData: keepPreviousData,
  });

  const items = useMemo(() => {
    // A new search key is loading while React Query still holds the previous
    // browse/search page as placeholder data. Never present those unrelated
    // rows as if they matched the text currently visible in the input.
    if (!query.data || (query.isPlaceholderData && query.isFetching)) {
      return [] as TItem[];
    }

    return query.data.pages.flatMap((page) => page.data);
  }, [query.data, query.isFetching, query.isPlaceholderData]);

  return {
    items,
    isBrowseMode,
    isSearchMode,
    isThresholdMode,
    isSearchSettling,
    hasNextPage: query.hasNextPage ?? false,
    isLoading:
      query.isLoading ||
      isSearchSettling ||
      (query.isFetching && query.isPlaceholderData),
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    fetchNextPage: query.fetchNextPage,
    data: query.data,
  };
}
