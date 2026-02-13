import type { FilterColumnConfig } from '@/lib/advanced-filter-types';
import { applyFilterRowsClient } from '@/lib/advanced-filter-types';
import type { FilterRow } from '@/lib/advanced-filter-types';

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

export function applyContactFilters<T extends object>(items: T[], rows: FilterRow[]): T[] {
  return applyFilterRowsClient(items, rows, CONTACT_FILTER_COLUMNS);
}
