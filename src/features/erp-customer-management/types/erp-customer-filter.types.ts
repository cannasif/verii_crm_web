export type ErpCustomerFilterRow = {
  id: string;
  column: string;
  operator: string;
  value: string;
};

export const ERP_CUSTOMER_FILTER_COLUMNS = [
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

export function applyFilterRow<T extends object>(
  item: T,
  row: ErpCustomerFilterRow
): boolean {
  const value = row.value.trim();
  if (!value) return true;

  const raw = (item as Record<string, unknown>)[row.column];
  const cellStr = raw == null ? '' : String(raw).toLowerCase();
  const filterLower = value.toLowerCase();

  const config = ERP_CUSTOMER_FILTER_COLUMNS.find((c) => c.value === row.column);
  const isNumeric = config?.type === 'number';

  if (isNumeric) {
    const cellNum = Number(raw);
    const filterNum = Number(value);
    if (Number.isNaN(cellNum) || Number.isNaN(filterNum)) return false;
    switch (row.operator) {
      case 'Equals': return cellNum === filterNum;
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

export function applyFilterRows<T extends object>(
  items: T[],
  rows: ErpCustomerFilterRow[]
): T[] {
  const validRows = rows.filter((r) => r.value.trim());
  if (validRows.length === 0) return items;
  return items.filter((item) => validRows.every((row) => applyFilterRow(item, row)));
}
