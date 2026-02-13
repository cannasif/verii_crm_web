import type { FilterColumnConfig } from '@/lib/advanced-filter-types';
import { applyFilterRowsClient } from '@/lib/advanced-filter-types';
import type { FilterRow } from '@/lib/advanced-filter-types';

export const TITLE_FILTER_COLUMNS: readonly FilterColumnConfig[] = [
  { value: 'titleName', type: 'string', labelKey: 'advancedFilter.columnTitleName' },
  { value: 'code', type: 'string', labelKey: 'advancedFilter.columnCode' },
] as const;

export function applyTitleFilters<T extends object>(
  items: T[],
  rows: FilterRow[]
): T[] {
  return applyFilterRowsClient(items, rows, TITLE_FILTER_COLUMNS);
}
