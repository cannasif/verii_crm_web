import type { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';

const STORAGE_PREFIX = 'v3rii:lastDocumentSerialType';

function buildPreferenceKey(
  ruleType: PricingRuleType,
  userId: string | number | null | undefined,
  branchCode: string | number | null | undefined,
  salesRepId: number | null | undefined,
): string {
  return `${STORAGE_PREFIX}:${ruleType}:${String(userId ?? 'anon')}:${String(branchCode ?? 'branch')}:${String(salesRepId ?? 0)}`;
}

export function getLastDocumentSerialTypeId(
  ruleType: PricingRuleType,
  userId: string | number | null | undefined,
  branchCode: string | number | null | undefined,
  salesRepId: number | null | undefined,
): number | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(
      buildPreferenceKey(ruleType, userId, branchCode, salesRepId),
    );
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveLastDocumentSerialTypeId(
  ruleType: PricingRuleType,
  userId: string | number | null | undefined,
  branchCode: string | number | null | undefined,
  salesRepId: number | null | undefined,
  documentSerialTypeId: number,
): void {
  if (typeof window === 'undefined') return;
  if (documentSerialTypeId <= 0) return;

  try {
    window.localStorage.setItem(
      buildPreferenceKey(ruleType, userId, branchCode, salesRepId),
      String(documentSerialTypeId),
    );
  } catch {
    return;
  }
}
