import type { FilterColumnConfig } from '@/lib/advanced-filter-types';
import { applyFilterRowsClient } from '@/lib/advanced-filter-types';
import type { FilterRow } from '@/lib/advanced-filter-types';

export const COUNTRY_FILTER_COLUMNS: readonly FilterColumnConfig[] = [
  { value: 'name', type: 'string', labelKey: 'advancedFilter.columnName' },
  { value: 'code', type: 'string', labelKey: 'advancedFilter.columnCode' },
  { value: 'erpCode', type: 'string', labelKey: 'advancedFilter.columnErpCode' },
] as const;

export function applyCountryFilters<T extends object>(items: T[], rows: FilterRow[]): T[] {
  return applyFilterRowsClient(items, rows, COUNTRY_FILTER_COLUMNS);
}
