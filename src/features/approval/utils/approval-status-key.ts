const APPROVAL_STATUS_KEYS = [
  'notRequired',
  'waiting',
  'approved',
  'rejected',
  'closed',
  'customerCancelled',
  'salespersonClosedForRevision',
] as const;

export type ApprovalStatusTranslationKey = (typeof APPROVAL_STATUS_KEYS)[number];

export function getApprovalStatusTranslationKey(status: number): ApprovalStatusTranslationKey | null {
  if (status < 0 || status > 6) {
    return null;
  }
  return APPROVAL_STATUS_KEYS[status];
}
