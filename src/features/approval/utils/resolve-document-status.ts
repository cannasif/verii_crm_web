export type DocumentApprovalStatusRecord = {
  status?: unknown;
  Status?: unknown;
  cancellationReason?: unknown;
  CancellationReason?: unknown;
};

export function resolveDocumentApprovalStatus(record: DocumentApprovalStatusRecord): number | null {
  const raw = record.status ?? record.Status;
  if (raw == null || raw === '') {
    return null;
  }

  const numeric = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 5) {
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
