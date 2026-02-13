import type { FilterColumnConfig } from '@/lib/advanced-filter-types';
import { rowsToBackendFilters } from '@/lib/advanced-filter-types';
import type { FilterRow } from '@/lib/advanced-filter-types';
import type { PagedFilter } from '@/types/api';

export const APPROVAL_ROLE_FILTER_COLUMNS: readonly FilterColumnConfig[] = [
  { value: 'name', type: 'string', labelKey: 'approvalRole.advancedFilter.columnName' },
  { value: 'approvalRoleGroupName', type: 'string', labelKey: 'approvalRole.advancedFilter.columnApprovalRoleGroupName' },
  { value: 'maxAmount', type: 'number', labelKey: 'approvalRole.advancedFilter.columnMaxAmount' },
] as const;

export function approvalRoleRowsToBackendFilters(rows: FilterRow[]): PagedFilter[] {
  return rowsToBackendFilters(rows);
}
