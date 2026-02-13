import type { FilterColumnConfig } from '@/lib/advanced-filter-types';
import { applyFilterRowsClient } from '@/lib/advanced-filter-types';
import type { FilterRow } from '@/lib/advanced-filter-types';

export const DISTRICT_FILTER_COLUMNS: readonly FilterColumnConfig[] = [
  { value: 'name', type: 'string', labelKey: 'advancedFilter.columnName' },
  { value: 'erpCode', type: 'string', labelKey: 'advancedFilter.columnErpCode' },
  { value: 'cityName', type: 'string', labelKey: 'advancedFilter.columnCityName' },
  { value: 'isDeleted', type: 'boolean', labelKey: 'advancedFilter.columnStatus' },
] as const;

export function applyDistrictFilters<T extends object>(items: T[], rows: FilterRow[]): T[] {
  return applyFilterRowsClient(items, rows, DISTRICT_FILTER_COLUMNS);
}
