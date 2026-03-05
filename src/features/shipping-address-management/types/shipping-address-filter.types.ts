import type { FilterColumnConfig } from '@/lib/advanced-filter-types';
import { applyFilterRowsClient } from '@/lib/advanced-filter-types';
import type { FilterRow } from '@/lib/advanced-filter-types';

export const SHIPPING_ADDRESS_FILTER_COLUMNS: readonly FilterColumnConfig[] = [
  { value: 'customerName', type: 'string', labelKey: 'advancedFilter.columnCustomerName' },
  { value: 'name', type: 'string', labelKey: 'advancedFilter.columnName' },
  { value: 'postalCode', type: 'string', labelKey: 'advancedFilter.columnPostalCode' },
  { value: 'phone', type: 'string', labelKey: 'advancedFilter.columnPhone' },
] as const;

export function applyShippingAddressFilters<T extends object>(
  items: T[],
  rows: FilterRow[]
): T[] {
  return applyFilterRowsClient(items, rows, SHIPPING_ADDRESS_FILTER_COLUMNS);
}
