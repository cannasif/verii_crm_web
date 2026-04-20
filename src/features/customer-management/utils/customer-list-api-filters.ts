import type { FilterRow } from '@/lib/advanced-filter-types';
import { rowsToBackendFilters } from '@/lib/advanced-filter-types';
import { normalizeSearchValue } from '@/lib/search';
import type { PagedFilter } from '@/types/api';

const OPERATOR_MAP: Record<string, string> = {
  Contains: 'contains',
  StartsWith: 'startsWith',
  EndsWith: 'endsWith',
  Equals: 'equals',
};

export function buildCustomerListSearchParam(raw: string): string | undefined {
  const normalized = normalizeSearchValue(raw);
  return normalized.length > 0 ? normalized : undefined;
}

export function customerFilterRowsToPagedFilters(rows: FilterRow[]): PagedFilter[] {
  const base = rowsToBackendFilters(rows);
  return base.map((f) => ({
    column: f.column,
    operator: OPERATOR_MAP[f.operator] ?? f.operator.toLowerCase(),
    value: normalizeSearchValue(f.value),
  }));
}
