export type DocumentApprovalStatusRecord = {
  status?: unknown;
  Status?: unknown;
  cancellationReason?: unknown;
  CancellationReason?: unknown;
};

const MIN_APPROVAL_STATUS = 0;
const MAX_APPROVAL_STATUS = 7;

export function resolveDocumentApprovalStatus(record: DocumentApprovalStatusRecord): number | null {
  const raw = record.status ?? record.Status;
  if (raw == null || raw === '') {
    return null;
  }

  const numeric = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(numeric) || numeric < MIN_APPROVAL_STATUS || numeric > MAX_APPROVAL_STATUS) {
    return null;
  }

  return numeric;
}

export function resolveDocumentCancellationReason(record: DocumentApprovalStatusRecord): string | null {
  const raw = record.cancellationReason ?? record.CancellationReason;
  if (raw == null) {
    return null;
  }

  const text = String(raw).trim();
  return text.length > 0 ? text : null;
}
