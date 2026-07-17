import type { FilterColumnConfig } from '@/lib/advanced-filter-types';
import { applyFilterRowsClient } from '@/lib/advanced-filter-types';
import type { FilterRow } from '@/lib/advanced-filter-types';

export const SHIPPING_ADDRESS_FILTER_COLUMNS: readonly FilterColumnConfig[] = [
  { value: 'erpShippingCode', type: 'string', labelKey: 'advancedFilter.columnErpShippingCode' },
  { value: 'erpMainCustomerCode', type: 'string', labelKey: 'advancedFilter.columnErpMainCustomerCode' },
  { value: 'name', type: 'string', labelKey: 'advancedFilter.columnName' },
  { value: 'postalCode', type: 'string', labelKey: 'advancedFilter.columnPostalCode' },
  { value: 'phone', type: 'string', labelKey: 'advancedFilter.columnPhone' },
  { value: 'cityName', type: 'string', labelKey: 'advancedFilter.columnCityName' },
  { value: 'districtName', type: 'string', labelKey: 'advancedFilter.columnDistrictName' },
] as const;

export function applyShippingAddressFilters<T extends object>(
  items: T[],
  rows: FilterRow[]
): T[] {
  return applyFilterRowsClient(items, rows, SHIPPING_ADDRESS_FILTER_COLUMNS);
}
