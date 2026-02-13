import type { FilterColumnConfig } from '@/lib/advanced-filter-types';
import { applyFilterRowsClient } from '@/lib/advanced-filter-types';
import type { FilterRow } from '@/lib/advanced-filter-types';

export const APPROVAL_FLOW_FILTER_COLUMNS: readonly FilterColumnConfig[] = [
  { value: 'documentType', type: 'string', labelKey: 'approvalFlow.advancedFilter.columnDocumentType' },
  { value: 'description', type: 'string', labelKey: 'approvalFlow.advancedFilter.columnDescription' },
  { value: 'isActive', type: 'boolean', labelKey: 'approvalFlow.advancedFilter.columnIsActive' },
  { value: 'createdByFullUser', type: 'string', labelKey: 'approvalFlow.advancedFilter.columnCreatedBy' },
] as const;

export function applyApprovalFlowFilters<T extends object>(
  items: T[],
  rows: FilterRow[]
): T[] {
  return applyFilterRowsClient(items, rows, APPROVAL_FLOW_FILTER_COLUMNS);
}
