import type { PagedFilter } from '@/types/api';

export type ActivityFilterRow = {
  id: string;
  column: string;
  operator: string;
  value: string;
};

export const ACTIVITY_FILTER_COLUMNS = [
  { value: 'Subject', type: 'string', labelKey: 'advancedFilter.columnSubject' },
  { value: 'Description', type: 'string', labelKey: 'advancedFilter.columnDescription' },
  { value: 'PotentialCustomerId', type: 'number', labelKey: 'advancedFilter.columnCustomerId' },
  { value: 'ActivityTypeId', type: 'number', labelKey: 'advancedFilter.columnActivityTypeId' },
  { value: 'Priority', type: 'number', labelKey: 'advancedFilter.columnPriority' },
  { value: 'Status', type: 'number', labelKey: 'advancedFilter.columnStatus' },
  { value: 'StartDateTime', type: 'date', labelKey: 'advancedFilter.columnDueDate' },
] as const;

export const STRING_OPERATORS = ['Contains', 'StartsWith', 'EndsWith', 'Equals'] as const;
export const NUMERIC_DATE_OPERATORS = ['Equals', '>', '>=', '<', '<='] as const;

export function getOperatorsForColumn(column: string): readonly string[] {
  const config = ACTIVITY_FILTER_COLUMNS.find((item) => item.value === column);
  if (!config) return STRING_OPERATORS;
  if (config.type === 'string') return STRING_OPERATORS;
  return NUMERIC_DATE_OPERATORS;
}

export function getDefaultOperatorForColumn(column: string): string {
  const config = ACTIVITY_FILTER_COLUMNS.find((item) => item.value === column);
  if (!config) return 'Contains';
  if (config.type === 'string') return 'Contains';
  return 'Equals';
}

export function isBoolColumn(_column: string): boolean {
  return false;
}

export function rowToBackendFilter(row: ActivityFilterRow): PagedFilter | null {
  const value = row.value.trim();
  if (!value) return null;

  return {
    column: row.column,
    operator: row.operator,
    value,
  };
}

export function rowsToBackendFilters(rows: ActivityFilterRow[]): PagedFilter[] {
  const out: PagedFilter[] = [];
  for (const row of rows) {
    const filter = rowToBackendFilter(row);
    if (filter) out.push(filter);
  }
  return out;
}
