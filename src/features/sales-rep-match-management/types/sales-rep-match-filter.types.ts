import type { FilterColumnConfig } from '@/lib/advanced-filter-types';

export const SALES_REP_MATCH_FILTER_COLUMNS: readonly FilterColumnConfig[] = [
  { value: 'salesRepCode', type: 'string', labelKey: 'advancedFilter.columnSalesRepCode' },
  { value: 'salesRepName', type: 'string', labelKey: 'advancedFilter.columnSalesRepName' },
  { value: 'username', type: 'string', labelKey: 'advancedFilter.columnUsername' },
  { value: 'userEmail', type: 'string', labelKey: 'advancedFilter.columnEmail' },
] as const;
