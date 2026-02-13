import type { FilterColumnConfig } from '@/lib/advanced-filter-types';
import { applyFilterRowsClient } from '@/lib/advanced-filter-types';
import type { FilterRow } from '@/lib/advanced-filter-types';

export const CITY_FILTER_COLUMNS: readonly FilterColumnConfig[] = [
  { value: 'name', type: 'string', labelKey: 'advancedFilter.columnName' },
  { value: 'erpCode', type: 'string', labelKey: 'advancedFilter.columnErpCode' },
  { value: 'countryName', type: 'string', labelKey: 'advancedFilter.columnCountryName' },
] as const;

export function applyCityFilters<T extends object>(items: T[], rows: FilterRow[]): T[] {
  return applyFilterRowsClient(items, rows, CITY_FILTER_COLUMNS);
}
