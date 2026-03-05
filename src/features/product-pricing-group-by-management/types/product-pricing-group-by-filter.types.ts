import type { FilterColumnConfig } from '@/lib/advanced-filter-types';
import { applyFilterRowsClient } from '@/lib/advanced-filter-types';
import type { FilterRow } from '@/lib/advanced-filter-types';

export const PRODUCT_PRICING_GROUP_BY_FILTER_COLUMNS: readonly FilterColumnConfig[] = [
  { value: 'erpGroupCode', type: 'string', labelKey: 'advancedFilter.columnErpGroupCode' },
  { value: 'currency', type: 'string', labelKey: 'advancedFilter.columnCurrency' },
] as const;

export function applyProductPricingGroupByFilters<T extends object>(
  items: T[],
  rows: FilterRow[]
): T[] {
  return applyFilterRowsClient(items, rows, PRODUCT_PRICING_GROUP_BY_FILTER_COLUMNS);
}
