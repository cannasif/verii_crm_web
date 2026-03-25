import type { FilterColumnConfig } from '@/lib/advanced-filter-types';
import { applyFilterRowsClient } from '@/lib/advanced-filter-types';
import type { FilterRow } from '@/lib/advanced-filter-types';

export const ACTIVITY_TYPE_FILTER_COLUMNS: readonly FilterColumnConfig[] = [
  { value: 'name', type: 'string', labelKey: 'advancedFilter.columnName' },
  { value: 'description', type: 'string', labelKey: 'advancedFilter.columnDescription' },
  { value: 'createdByFullUser', type: 'string', labelKey: 'advancedFilter.columnCreatedBy' },
] as const;

export function applyActivityTypeFilters<T extends object>(
  items: T[],
  rows: FilterRow[]
): T[] {
  return applyFilterRowsClient(items, rows, ACTIVITY_TYPE_FILTER_COLUMNS);
}
