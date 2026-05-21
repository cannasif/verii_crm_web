import {
  fetchCatalogSpecialCodeStocksPage,
  type CatalogSpecialCodeFetchPageParams,
  type CatalogSpecialCodeSelections,
} from '@/components/shared/catalog-special-code-filter';
import type { PagedFilter, PagedResponse } from '@/types/api';
import type { StockGetDto } from '../types';

export async function fetchStockListWithCodeFilters<T extends StockGetDto>(
  selections: CatalogSpecialCodeSelections,
  fetchPage: (params: CatalogSpecialCodeFetchPageParams) => Promise<PagedResponse<T>>,
  options: {
    pageNumber: number;
    pageSize: number;
    search?: string;
    additionalFilters?: PagedFilter[];
  },
): Promise<{ data: T[]; totalCount: number }> {
  const { additionalFilters = [] } = options;
  const wrapFetchPage = (params: CatalogSpecialCodeFetchPageParams): Promise<PagedResponse<T>> => {
    const codeFilters = params.filters ?? [];
    const mergedFilters =
      additionalFilters.length > 0 ? [...codeFilters, ...additionalFilters] : codeFilters;
    return fetchPage({
      ...params,
      filters: mergedFilters,
      filterLogic: additionalFilters.length > 0 ? 'and' : params.filterLogic ?? 'and',
    });
  };
  return fetchCatalogSpecialCodeStocksPage(selections, wrapFetchPage, options);
}
