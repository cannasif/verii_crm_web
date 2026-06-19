import type { FilterColumnConfig } from '@/lib/advanced-filter-types';
import { rowsToBackendFilters } from '@/lib/advanced-filter-types';
import type { FilterRow } from '@/lib/advanced-filter-types';
import type { PagedFilter } from '@/types/api';

export const CONTACT_FILTER_COLUMNS: readonly FilterColumnConfig[] = [
  { value: 'fullName', type: 'string', labelKey: 'advancedFilter.columnFullName' },
  { value: 'firstName', type: 'string', labelKey: 'advancedFilter.columnFirstName' },
  { value: 'lastName', type: 'string', labelKey: 'advancedFilter.columnLastName' },
  { value: 'email', type: 'string', labelKey: 'advancedFilter.columnEmail' },
  { value: 'phone', type: 'string', labelKey: 'advancedFilter.columnPhone' },
  { value: 'mobile', type: 'string', labelKey: 'advancedFilter.columnMobile' },
  { value: 'customerName', type: 'string', labelKey: 'advancedFilter.columnCustomerName' },
  { value: 'titleName', type: 'string', labelKey: 'advancedFilter.columnTitleName' },
] as const;

export function contactFilterRowsToPagedFilters(rows: FilterRow[]): PagedFilter[] {
  return rowsToBackendFilters(rows);
}
