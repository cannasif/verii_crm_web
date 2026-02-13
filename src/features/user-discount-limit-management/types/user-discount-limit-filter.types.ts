import type { PagedFilter } from '@/types/api';

export type UserDiscountLimitFilterRow = {
  id: string;
  column: string;
  operator: string;
  value: string;
};

export const USER_DISCOUNT_LIMIT_FILTER_COLUMNS = [
  { value: 'SalespersonName', type: 'string', labelKey: 'advancedFilter.columnSalespersonName' },
  { value: 'ErpProductGroupCode', type: 'string', labelKey: 'advancedFilter.columnErpProductGroupCode' },
  { value: 'MaxDiscount1', type: 'number', labelKey: 'advancedFilter.columnMaxDiscount1' },
  { value: 'MaxDiscount2', type: 'number', labelKey: 'advancedFilter.columnMaxDiscount2' },
  { value: 'MaxDiscount3', type: 'number', labelKey: 'advancedFilter.columnMaxDiscount3' },
  { value: 'CreatedDate', type: 'date', labelKey: 'advancedFilter.columnCreatedDate' },
] as const;

export const STRING_OPERATORS = ['Contains', 'StartsWith', 'EndsWith', 'Equals'] as const;
export const NUMERIC_DATE_OPERATORS = ['Equals', '>', '>=', '<', '<='] as const;

export function getOperatorsForColumn(column: string): readonly string[] {
  const config = USER_DISCOUNT_LIMIT_FILTER_COLUMNS.find((item) => item.value === column);
  if (!config) return STRING_OPERATORS;
  if (config.type === 'string') return STRING_OPERATORS;
  return NUMERIC_DATE_OPERATORS;
}

export function getDefaultOperatorForColumn(column: string): string {
  const config = USER_DISCOUNT_LIMIT_FILTER_COLUMNS.find((item) => item.value === column);
  if (!config) return 'Contains';
  if (config.type === 'string') return 'Contains';
  return 'Equals';
}

export function rowToBackendFilter(row: UserDiscountLimitFilterRow): PagedFilter | null {
  const value = row.value.trim();
  if (!value) return null;

  return {
    column: row.column,
    operator: row.operator,
    value,
  };
}

export function rowsToBackendFilters(rows: UserDiscountLimitFilterRow[]): PagedFilter[] {
  const out: PagedFilter[] = [];
  for (const row of rows) {
    const filter = rowToBackendFilter(row);
    if (filter) out.push(filter);
  }
  return out;
}
