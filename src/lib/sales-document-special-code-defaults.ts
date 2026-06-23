import { OfferType, normalizeOfferType } from '@/types/offer-type';

const AUTO_SPECIAL_CODE_DEFAULTS = new Set(['N', 'K']);

export function getDefaultSpecialCodeForOfferType(offerType?: string | null): string | null {
  const normalizedOfferType = normalizeOfferType(offerType);

  if (normalizedOfferType === OfferType.YURTICI) return 'N';
  if (normalizedOfferType === OfferType.YURTDISI) return 'K';

  return null;
}

export function canApplySpecialCodeDefault(value?: string | null): boolean {
  const normalizedValue = String(value ?? '').trim().toUpperCase();

  return normalizedValue.length === 0 || AUTO_SPECIAL_CODE_DEFAULTS.has(normalizedValue);
}
