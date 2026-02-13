import type { FilterColumnConfig } from '@/lib/advanced-filter-types';
import { applyFilterRowsClient } from '@/lib/advanced-filter-types';
import type { FilterRow } from '@/lib/advanced-filter-types';

export const CUSTOMER_FILTER_COLUMNS: readonly FilterColumnConfig[] = [
  { value: 'name', type: 'string', labelKey: 'advancedFilter.columnName' },
  { value: 'customerCode', type: 'string', labelKey: 'advancedFilter.columnCustomerCode' },
  { value: 'email', type: 'string', labelKey: 'advancedFilter.columnEmail' },
  { value: 'phone', type: 'string', labelKey: 'advancedFilter.columnPhone' },
  { value: 'taxNumber', type: 'string', labelKey: 'advancedFilter.columnTaxNumber' },
  { value: 'cityName', type: 'string', labelKey: 'advancedFilter.columnCityName' },
] as const;

export function applyCustomerFilters<T extends object>(items: T[], rows: FilterRow[]): T[] {
  return applyFilterRowsClient(items, rows, CUSTOMER_FILTER_COLUMNS);
}
