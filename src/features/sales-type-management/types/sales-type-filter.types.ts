import type { FilterColumnConfig } from '@/lib/advanced-filter-types';
import { applyFilterRowsClient } from '@/lib/advanced-filter-types';
import type { FilterRow } from '@/lib/advanced-filter-types';

export const SALES_TYPE_FILTER_COLUMNS: readonly FilterColumnConfig[] = [
  { value: 'name', type: 'string', labelKey: 'advancedFilter.columnName' },
  { value: 'salesType', type: 'string', labelKey: 'advancedFilter.columnSalesType' },
] as const;

export function applySalesTypeFilters<T extends object>(
  items: T[],
  rows: FilterRow[]
): T[] {
  return applyFilterRowsClient(items, rows, SALES_TYPE_FILTER_COLUMNS);
}
