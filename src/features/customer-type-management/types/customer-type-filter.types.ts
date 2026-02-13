import type { FilterColumnConfig } from '@/lib/advanced-filter-types';
import { applyFilterRowsClient } from '@/lib/advanced-filter-types';
import type { FilterRow } from '@/lib/advanced-filter-types';

export const CUSTOMER_TYPE_FILTER_COLUMNS: readonly FilterColumnConfig[] = [
  { value: 'name', type: 'string', labelKey: 'advancedFilter.columnName' },
  { value: 'description', type: 'string', labelKey: 'advancedFilter.columnDescription' },
] as const;

export function applyCustomerTypeFilters<T extends object>(
  items: T[],
  rows: FilterRow[]
): T[] {
  return applyFilterRowsClient(items, rows, CUSTOMER_TYPE_FILTER_COLUMNS);
}
