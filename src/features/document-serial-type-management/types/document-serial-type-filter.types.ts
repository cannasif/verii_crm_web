import type { FilterColumnConfig } from '@/lib/advanced-filter-types';
import { rowsToBackendFilters } from '@/lib/advanced-filter-types';
import type { FilterRow } from '@/lib/advanced-filter-types';
import type { PagedFilter } from '@/types/api';

export const DOCUMENT_SERIAL_TYPE_FILTER_COLUMNS: readonly FilterColumnConfig[] = [
  { value: 'serialPrefix', type: 'string', labelKey: 'advancedFilter.columnSerialPrefix' },
  { value: 'customerTypeName', type: 'string', labelKey: 'advancedFilter.columnCustomerTypeName' },
  { value: 'salesRepFullName', type: 'string', labelKey: 'advancedFilter.columnSalesRepFullName' },
  { value: 'ruleType', type: 'string', labelKey: 'advancedFilter.columnRuleType' },
] as const;

export function documentSerialTypeRowsToBackendFilters(rows: FilterRow[]): PagedFilter[] {
  return rowsToBackendFilters(rows);
}
