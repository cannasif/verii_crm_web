const APPROVAL_STATUS_KEYS = [
  'notRequired',
  'waiting',
  'approved',
  'rejected',
  'closed',
  'customerCancelled',
  'salespersonClosedForRevision',
  'supersededByApprovedRevision',
] as const;

export type ApprovalStatusTranslationKey = (typeof APPROVAL_STATUS_KEYS)[number];

export function getApprovalStatusTranslationKey(status: number): ApprovalStatusTranslationKey | null {
  if (!Number.isInteger(status) || status < 0 || status >= APPROVAL_STATUS_KEYS.length) {
    return null;
  }
  return APPROVAL_STATUS_KEYS[status];
}
