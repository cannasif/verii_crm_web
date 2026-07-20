import { OfferType, normalizeOfferType } from '@/types/offer-type';

const AUTO_SPECIAL_CODE_DEFAULTS = new Set(['N', 'K', 'I']);

export const EXPORT_REGISTERED_DELIVERY_SALES_TYPE_CODE = '5';

export function resolveSalesTypeCodeById(
  deliveryMethodId: string | null | undefined,
  salesTypes: ReadonlyArray<{ id: number; code?: string | null }>,
): string | null {
  if (!deliveryMethodId) return null;

  const selected = salesTypes.find((item) => String(item.id) === String(deliveryMethodId));
  const code = selected?.code?.trim();

  return code && code.length > 0 ? code : null;
}

export function getDefaultSpecialCodeForOfferType(
  offerType?: string | null,
  deliveryMethodSalesTypeCode?: string | null,
): string | null {
  const normalizedOfferType = normalizeOfferType(offerType);

  if (normalizedOfferType === OfferType.YURTICI) return 'N';

  if (normalizedOfferType === OfferType.YURTDISI) {
    const normalizedDeliveryCode = String(deliveryMethodSalesTypeCode ?? '').trim();
    if (normalizedDeliveryCode === EXPORT_REGISTERED_DELIVERY_SALES_TYPE_CODE) return 'K';
    return 'I';
  }

  return null;
}

export function canApplySpecialCodeDefault(value?: string | null): boolean {
  const normalizedValue = String(value ?? '').trim().toUpperCase();

  return normalizedValue.length === 0 || AUTO_SPECIAL_CODE_DEFAULTS.has(normalizedValue);
}
