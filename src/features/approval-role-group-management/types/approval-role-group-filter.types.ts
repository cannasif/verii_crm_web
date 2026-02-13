import type { FilterColumnConfig } from '@/lib/advanced-filter-types';
import { applyFilterRowsClient } from '@/lib/advanced-filter-types';
import type { FilterRow } from '@/lib/advanced-filter-types';

export const APPROVAL_ROLE_GROUP_FILTER_COLUMNS: readonly FilterColumnConfig[] = [
  { value: 'name', type: 'string', labelKey: 'advancedFilter.columnName' },
  { value: 'createdByFullUser', type: 'string', labelKey: 'advancedFilter.columnCreatedBy' },
] as const;

export function applyApprovalRoleGroupFilters<T extends object>(
  items: T[],
  rows: FilterRow[]
): T[] {
  return applyFilterRowsClient(items, rows, APPROVAL_ROLE_GROUP_FILTER_COLUMNS);
}
