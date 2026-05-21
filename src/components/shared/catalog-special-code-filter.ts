import type { PagedFilter, PagedResponse } from '@/types/api';
import type { StockGetDto } from '@/features/stock/types';

export const CATALOG_FILTER_DIMENSIONS = ['grupKodu', 'kod1', 'kod2', 'kod3', 'kod4', 'kod5'] as const;

export type CatalogFilterDimension = (typeof CATALOG_FILTER_DIMENSIONS)[number];

/** @deprecated Use CATALOG_FILTER_DIMENSIONS */
export const CATALOG_SPECIAL_CODE_LEVELS = CATALOG_FILTER_DIMENSIONS;

/** @deprecated Use CatalogFilterDimension */
export type CatalogSpecialCodeLevel = CatalogFilterDimension;

export type CatalogSpecialCodeSelections = Record<CatalogFilterDimension, string[]>;

export type CatalogSpecialCodeOption = {
  value: string;
  label: string;
};

export const CATALOG_SPECIAL_CODE_FACET_POOL_SIZE = 800;

const SPECIAL_CODE_MERGE_FETCH_SIZE = 2000;

const MAX_OR_BRANCH_REQUESTS = 20;

export const EMPTY_SPECIAL_CODE_SELECTIONS: CatalogSpecialCodeSelections = {
  grupKodu: [],
  kod1: [],
  kod2: [],
  kod3: [],
  kod4: [],
  kod5: [],
};

export function hasSpecialCodeSelection(selections: CatalogSpecialCodeSelections): boolean {
  return CATALOG_FILTER_DIMENSIONS.some((dimension) => selections[dimension].length > 0);
}

function getGrupKoduValue(stock: StockGetDto): string | undefined {
  const raw = stock.grupKodu;
  if (raw == null) {
    return undefined;
  }
  const trimmed = String(raw).trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getGrupKoduDisplayLabel(stock: StockGetDto): string {
  const code = getGrupKoduValue(stock);
  if (!code) {
    return '';
  }
  const name = stock.grupAdi != null ? String(stock.grupAdi).trim() : '';
  if (name.length > 0) {
    return `${code} - ${name}`;
  }
  return code;
}

export function getFilterDimensionValue(
  stock: StockGetDto,
  dimension: CatalogFilterDimension,
): string | undefined {
  if (dimension === 'grupKodu') {
    return getGrupKoduValue(stock);
  }
  const raw = stock[dimension];
  if (raw == null) {
    return undefined;
  }
  const trimmed = String(raw).trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getFilterDimensionDisplayLabel(
  stock: StockGetDto,
  dimension: CatalogFilterDimension,
): string {
  if (dimension === 'grupKodu') {
    return getGrupKoduDisplayLabel(stock);
  }
  const value = getFilterDimensionValue(stock, dimension);
  if (!value) {
    return '';
  }
  const nameKey = `${dimension}Adi` as keyof StockGetDto;
  const nameRaw = stock[nameKey];
  const name = nameRaw != null ? String(nameRaw).trim() : '';
  return name.length > 0 ? name : value;
}

export function extractFilterDimensionOptions(
  stocks: StockGetDto[],
  dimension: CatalogFilterDimension,
): CatalogSpecialCodeOption[] {
  const byValue = new Map<string, string>();
  for (const stock of stocks) {
    const value = getFilterDimensionValue(stock, dimension);
    if (!value) {
      continue;
    }
    if (!byValue.has(value)) {
      byValue.set(value, getFilterDimensionDisplayLabel(stock, dimension));
    }
  }
  return Array.from(byValue.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'tr'));
}

/** @deprecated Use extractFilterDimensionOptions */
export function extractSpecialCodeOptions(
  stocks: StockGetDto[],
  level: CatalogFilterDimension,
): CatalogSpecialCodeOption[] {
  return extractFilterDimensionOptions(stocks, level);
}

export function stockMatchesIndependentFacetSelections(
  stock: StockGetDto,
  selections: CatalogSpecialCodeSelections,
): boolean {
  return CATALOG_FILTER_DIMENSIONS.every((dimension) => {
    const selected = selections[dimension];
    if (selected.length === 0) {
      return true;
    }
    const value = getFilterDimensionValue(stock, dimension);
    return value != null && selected.includes(value);
  });
}

/** @deprecated Use stockMatchesIndependentFacetSelections */
export function filterStocksBySpecialCodeSelections(
  stocks: StockGetDto[],
  selections: Partial<CatalogSpecialCodeSelections>,
): StockGetDto[] {
  const normalized = { ...EMPTY_SPECIAL_CODE_SELECTIONS };
  for (const dimension of CATALOG_FILTER_DIMENSIONS) {
    if (selections[dimension]?.length) {
      normalized[dimension] = selections[dimension]!;
    }
  }
  return stocks.filter((stock) => stockMatchesIndependentFacetSelections(stock, normalized));
}

export function buildSingleValueStockFilters(selections: CatalogSpecialCodeSelections): PagedFilter[] {
  const filters: PagedFilter[] = [];
  for (const dimension of CATALOG_FILTER_DIMENSIONS) {
    const values = selections[dimension].filter((v) => v.trim().length > 0);
    if (values.length === 1) {
      filters.push({ column: dimension, operator: 'Equals', value: values[0]! });
    }
  }
  return filters;
}

/** @deprecated Prefer fetchCatalogSpecialCodeStocksPage for multi-select OR */
export function buildSpecialCodeStockFilters(selections: CatalogSpecialCodeSelections): PagedFilter[] {
  return buildSingleValueStockFilters(selections);
}

function getOrDimensions(selections: CatalogSpecialCodeSelections): CatalogFilterDimension[] {
  return CATALOG_FILTER_DIMENSIONS.filter((dimension) => selections[dimension].length > 1);
}

function buildOrBranchFilterSets(
  selections: CatalogSpecialCodeSelections,
  orDimensions: CatalogFilterDimension[],
): PagedFilter[][] {
  let branches: PagedFilter[][] = [[]];
  for (const dimension of orDimensions) {
    const values = selections[dimension].filter((v) => v.trim().length > 0);
    const next: PagedFilter[][] = [];
    for (const branch of branches) {
      for (const value of values) {
        next.push([...branch, { column: dimension, operator: 'Equals', value }]);
      }
    }
    branches = next;
  }
  return branches;
}

export type CatalogSpecialCodeFetchPageParams = {
  pageNumber: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  filters: PagedFilter[];
  filterLogic?: 'and' | 'or';
};

export async function fetchCatalogSpecialCodeStocksPage<T extends StockGetDto>(
  selections: CatalogSpecialCodeSelections,
  fetchPage: (params: CatalogSpecialCodeFetchPageParams) => Promise<PagedResponse<T>>,
  options: { pageNumber: number; pageSize: number; search?: string },
): Promise<{ data: T[]; totalCount: number }> {
  const { pageNumber, pageSize, search } = options;
  const singleFilters = buildSingleValueStockFilters(selections);
  const orDimensions = getOrDimensions(selections);

  if (orDimensions.length === 0) {
    const response = await fetchPage({
      pageNumber,
      pageSize,
      search,
      sortBy: 'Id',
      sortDirection: 'desc',
      filters: singleFilters,
      filterLogic: 'and',
    });
    return {
      data: response.data ?? [],
      totalCount: response.totalCount ?? response.data?.length ?? 0,
    };
  }

  const orBranches = buildOrBranchFilterSets(selections, orDimensions);

  if (orBranches.length <= MAX_OR_BRANCH_REQUESTS) {
    const merged = new Map<number, T>();
    for (const branchFilters of orBranches) {
      const response = await fetchPage({
        pageNumber: 1,
        pageSize: SPECIAL_CODE_MERGE_FETCH_SIZE,
        search,
        sortBy: 'Id',
        sortDirection: 'desc',
        filters: [...singleFilters, ...branchFilters],
        filterLogic: 'and',
      });
      for (const row of response.data ?? []) {
        merged.set(row.id, row);
      }
    }
    const rows = Array.from(merged.values()).filter((stock) =>
      stockMatchesIndependentFacetSelections(stock, selections),
    );
    const start = (pageNumber - 1) * pageSize;
    return {
      data: rows.slice(start, start + pageSize),
      totalCount: rows.length,
    };
  }

  const response = await fetchPage({
    pageNumber: 1,
    pageSize: SPECIAL_CODE_MERGE_FETCH_SIZE,
    search,
    sortBy: 'Id',
    sortDirection: 'desc',
    filters: singleFilters,
    filterLogic: 'and',
  });
  const rows = (response.data ?? []).filter((stock) =>
    stockMatchesIndependentFacetSelections(stock, selections),
  );
  const start = (pageNumber - 1) * pageSize;
  return {
    data: rows.slice(start, start + pageSize),
    totalCount: rows.length,
  };
}

export function toggleSpecialCodeValue(
  selections: CatalogSpecialCodeSelections,
  dimension: CatalogFilterDimension,
  value: string,
): CatalogSpecialCodeSelections {
  const current = selections[dimension];
  const exists = current.includes(value);
  const nextValues = exists ? current.filter((v) => v !== value) : [...current, value];
  return { ...selections, [dimension]: nextValues };
}

export function clearSpecialCodeSelections(): CatalogSpecialCodeSelections {
  return { ...EMPTY_SPECIAL_CODE_SELECTIONS };
}
