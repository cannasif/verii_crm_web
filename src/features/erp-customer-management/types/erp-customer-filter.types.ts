import type { FilterColumnConfig } from '@/lib/advanced-filter-types';
import { applyFilterRowsClient } from '@/lib/advanced-filter-types';
import type { FilterRow } from '@/lib/advanced-filter-types';

export type ErpCustomerFilterRow = FilterRow;

export const ERP_CUSTOMER_FILTER_COLUMNS: readonly FilterColumnConfig[] = [
  { value: 'customerCode', type: 'string', labelKey: 'advancedFilter.columnCustomerCode' },
  { value: 'customerName', type: 'string', labelKey: 'advancedFilter.columnCustomerName' },
  { value: 'branchCode', type: 'number', labelKey: 'advancedFilter.columnBranchCode' },
  { value: 'city', type: 'string', labelKey: 'advancedFilter.columnCity' },
  { value: 'district', type: 'string', labelKey: 'advancedFilter.columnDistrict' },
  { value: 'taxNumber', type: 'string', labelKey: 'advancedFilter.columnTaxNumber' },
] as const;

export const STRING_OPERATORS = ['Contains', 'StartsWith', 'EndsWith', 'Equals'] as const;
export const NUMERIC_DATE_OPERATORS = ['Equals', '>', '>=', '<', '<='] as const;

export function getOperatorsForColumn(column: string): readonly string[] {
  const config = ERP_CUSTOMER_FILTER_COLUMNS.find((item) => item.value === column);
  if (!config) return STRING_OPERATORS;
  if (config.type === 'string') return STRING_OPERATORS;
  return NUMERIC_DATE_OPERATORS;
}

export function getDefaultOperatorForColumn(column: string): string {
  const config = ERP_CUSTOMER_FILTER_COLUMNS.find((item) => item.value === column);
  if (!config) return 'Contains';
  if (config.type === 'string') return 'Contains';
  return 'Equals';
}

export function applyFilterRows<T extends object>(
  items: T[],
  rows: FilterRow[]
): T[] {
  return applyFilterRowsClient(items, rows, ERP_CUSTOMER_FILTER_COLUMNS);
}
