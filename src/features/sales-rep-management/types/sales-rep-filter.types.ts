import type { FilterColumnConfig } from '@/lib/advanced-filter-types';

export const SALES_REP_FILTER_COLUMNS: readonly FilterColumnConfig[] = [
  { value: 'branchCode', type: 'number', labelKey: 'advancedFilter.columnBranchCode' },
  { value: 'salesRepCode', type: 'string', labelKey: 'advancedFilter.columnSalesRepCode' },
  { value: 'salesRepDescription', type: 'string', labelKey: 'advancedFilter.columnDescription' },
  { value: 'name', type: 'string', labelKey: 'advancedFilter.columnName' },
] as const;
