import {
  resolveDocumentApprovalStatus,
  type DocumentApprovalStatusRecord,
} from './resolve-document-status';

export function filterDocumentsByApprovalStatus<T extends DocumentApprovalStatusRecord>(
  records: readonly T[],
  approvalStatusFilter: string
): T[] {
  if (approvalStatusFilter === 'all') {
    return [...records];
  }

  const targetStatus = Number(approvalStatusFilter);
  if (Number.isNaN(targetStatus)) {
    return [...records];
  }

  return records.filter((record) => resolveDocumentApprovalStatus(record) === targetStatus);
}
