import type { FilterColumnConfig } from '@/lib/advanced-filter-types';
import { applyFilterRowsClient } from '@/lib/advanced-filter-types';
import type { FilterRow } from '@/lib/advanced-filter-types';

export const APPROVAL_USER_ROLE_FILTER_COLUMNS: readonly FilterColumnConfig[] = [
  { value: 'userFullName', type: 'string', labelKey: 'advancedFilter.columnUserFullName' },
  { value: 'approvalRoleName', type: 'string', labelKey: 'advancedFilter.columnApprovalRoleName' },
  { value: 'createdByFullUser', type: 'string', labelKey: 'advancedFilter.columnCreatedBy' },
] as const;

export function applyApprovalUserRoleFilters<T extends object>(
  items: T[],
  rows: FilterRow[]
): T[] {
  return applyFilterRowsClient(items, rows, APPROVAL_USER_ROLE_FILTER_COLUMNS);
}
