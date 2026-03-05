import type { FilterColumnConfig } from '@/lib/advanced-filter-types';
import { rowsToBackendFilters } from '@/lib/advanced-filter-types';
import type { FilterRow } from '@/lib/advanced-filter-types';
import type { PagedFilter } from '@/types/api';

export const USER_FILTER_COLUMNS: readonly FilterColumnConfig[] = [
  { value: 'username', type: 'string', labelKey: 'userManagement.advancedFilter.columnUsername' },
  { value: 'email', type: 'string', labelKey: 'userManagement.advancedFilter.columnEmail' },
  { value: 'fullName', type: 'string', labelKey: 'userManagement.advancedFilter.columnFullName' },
  { value: 'role', type: 'string', labelKey: 'userManagement.advancedFilter.columnRole' },
] as const;

export function userRowsToBackendFilters(rows: FilterRow[]): PagedFilter[] {
  return rowsToBackendFilters(rows);
}
