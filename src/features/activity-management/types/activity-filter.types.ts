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
  { value: 'CustomerId', type: 'number', labelKey: 'advancedFilter.columnCustomerId' },
  { value: 'ActivityTypeId', type: 'number', labelKey: 'advancedFilter.columnActivityTypeId' },
  { value: 'Priority', type: 'number', labelKey: 'advancedFilter.columnPriority' },
  { value: 'DueDate', type: 'date', labelKey: 'advancedFilter.columnDueDate' },
  { value: 'IsCompleted', type: 'bool', labelKey: 'advancedFilter.columnIsCompleted' },
] as const;

export const STRING_OPERATORS = ['Contains', 'StartsWith', 'EndsWith', 'Equals'] as const;
export const NUMERIC_DATE_OPERATORS = ['Equals', '>', '>=', '<', '<='] as const;
export const BOOL_OPERATORS = ['Equals'] as const;

export function getOperatorsForColumn(column: string): readonly string[] {
  const config = ACTIVITY_FILTER_COLUMNS.find((c) => c.value === column);
  if (!config) return STRING_OPERATORS;
  if (config.type === 'string') return STRING_OPERATORS;
  if (config.type === 'number' || config.type === 'date') return NUMERIC_DATE_OPERATORS;
  if (config.type === 'bool') return BOOL_OPERATORS;
  return STRING_OPERATORS;
}

export function getDefaultOperatorForColumn(column: string): string {
  const config = ACTIVITY_FILTER_COLUMNS.find((c) => c.value === column);
  if (!config) return 'Contains';
  if (config.type === 'bool') return 'Equals';
  if (config.type === 'string') return 'Contains';
  return 'Equals';
}

export function isBoolColumn(column: string): boolean {
  return ACTIVITY_FILTER_COLUMNS.find((c) => c.value === column)?.type === 'bool';
}

export function rowToBackendFilter(row: ActivityFilterRow): PagedFilter | null {
  const value = row.value.trim();
  if (!value) return null;
  const normalized =
    row.column === 'IsCompleted'
      ? value.toLowerCase() === 'true'
        ? 'true'
        : value.toLowerCase() === 'false'
          ? 'false'
          : null
      : value;
  if (row.column === 'IsCompleted' && normalized === null) return null;
  return {
    column: row.column,
    operator: row.operator,
    value: String(normalized),
  };
}

export function rowsToBackendFilters(rows: ActivityFilterRow[]): PagedFilter[] {
  const out: PagedFilter[] = [];
  for (const row of rows) {
    const f = rowToBackendFilter(row);
    if (f) out.push(f);
  }
  return out;
}
