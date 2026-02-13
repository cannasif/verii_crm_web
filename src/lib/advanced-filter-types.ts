import type { PagedFilter } from '@/types/api';

export type FilterRow = {
  id: string;
  column: string;
  operator: string;
  value: string;
};

export type FilterColumnConfig = {
  value: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  labelKey: string;
};

export const STRING_OPERATORS = ['Contains', 'StartsWith', 'EndsWith', 'Equals'] as const;
export const NUMERIC_DATE_OPERATORS = ['Equals', '>', '>=', '<', '<='] as const;

export function getOperatorsForColumn(
  column: string,
  columns: readonly FilterColumnConfig[]
): readonly string[] {
  const config = columns.find((item) => item.value === column);
  if (!config) return STRING_OPERATORS;
  if (config.type === 'string') return STRING_OPERATORS;
  if (config.type === 'boolean') return ['Equals'] as const;
  return NUMERIC_DATE_OPERATORS;
}

export function getDefaultOperatorForColumn(
  column: string,
  columns: readonly FilterColumnConfig[]
): string {
  const config = columns.find((item) => item.value === column);
  if (!config) return 'Contains';
  if (config.type === 'string') return 'Contains';
  return 'Equals';
}

export function rowToBackendFilter(row: FilterRow): PagedFilter | null {
  const value = row.value.trim();
  if (!value) return null;
  return { column: row.column, operator: row.operator, value };
}

export function rowsToBackendFilters(rows: FilterRow[]): PagedFilter[] {
  const out: PagedFilter[] = [];
  for (const row of rows) {
    const filter = rowToBackendFilter(row);
    if (filter) out.push(filter);
  }
  return out;
}

export function applyFilterRowClient<T extends object>(
  item: T,
  row: FilterRow,
  columns: readonly FilterColumnConfig[]
): boolean {
  const value = row.value.trim();
  if (!value) return true;

  const raw = (item as Record<string, unknown>)[row.column];
  const cellStr = raw == null ? '' : String(raw).toLowerCase();
  const filterLower = value.toLowerCase();

  const config = columns.find((c) => c.value === row.column);
  const isBoolean = config?.type === 'boolean';
  if (isBoolean) {
    const boolVal = value.toLowerCase() === 'true';
    const cellBool = raw === true || raw === 'true' || String(raw).toLowerCase() === 'true';
    return row.operator === 'Equals' ? cellBool === boolVal : true;
  }
  const isNumeric = config?.type === 'number' || config?.type === 'date';

  if (isNumeric && config?.type !== 'string') {
    const cellNum = config.type === 'date' ? (raw ? new Date(String(raw)).getTime() : NaN) : Number(raw);
    const filterNum = config.type === 'date' ? new Date(value).getTime() : Number(value);
    if (Number.isNaN(cellNum) || Number.isNaN(filterNum)) return false;
    switch (row.operator) {
      case 'Equals':
        return config.type === 'date' ? cellNum === filterNum : cellNum === filterNum;
      case '>': return cellNum > filterNum;
      case '>=': return cellNum >= filterNum;
      case '<': return cellNum < filterNum;
      case '<=': return cellNum <= filterNum;
      default: return cellNum === filterNum;
    }
  }

  switch (row.operator) {
    case 'Contains': return cellStr.includes(filterLower);
    case 'StartsWith': return cellStr.startsWith(filterLower);
    case 'EndsWith': return cellStr.endsWith(filterLower);
    case 'Equals': return cellStr === filterLower;
    default: return cellStr.includes(filterLower);
  }
}

export function applyFilterRowsClient<T extends object>(
  items: T[],
  rows: FilterRow[],
  columns: readonly FilterColumnConfig[]
): T[] {
  const validRows = rows.filter((r) => r.value.trim());
  if (validRows.length === 0) return items;
  return items.filter((item) => validRows.every((row) => applyFilterRowClient(item, row, columns)));
}
