import { OfferType, normalizeOfferType } from '@/types/offer-type';

export function isExportOfferType(offerType?: string | null): boolean {
  return normalizeOfferType(offerType) === OfferType.YURTDISI;
}

export function resolveDocumentVatRate(
  vatRate: number | null | undefined,
  offerType?: string | null,
  fallbackOrDelivery?: number | string | null,
  fallback?: number,
): number {
  let actualDelivery: string | null = null;
  let actualFallback = 20;

  if (typeof fallbackOrDelivery === 'string') {
    actualDelivery = fallbackOrDelivery;
    actualFallback = fallback ?? 20;
  } else if (typeof fallbackOrDelivery === 'number') {
    actualFallback = fallbackOrDelivery;
  } else if (fallbackOrDelivery === null || fallbackOrDelivery === undefined) {
    actualFallback = fallback ?? 20;
  }

  return vatRate ?? getDefaultDocumentVatRate(offerType, actualDelivery, actualFallback);
}

export function getDefaultDocumentVatRate(
  offerType?: string | null,
  fallbackOrDelivery?: number | string | null,
  fallback?: number
): number {
  let actualDelivery: string | null = null;
  let actualFallback = 20;

  if (typeof fallbackOrDelivery === 'string') {
    actualDelivery = fallbackOrDelivery;
    actualFallback = fallback ?? 20;
  } else if (typeof fallbackOrDelivery === 'number') {
    actualFallback = fallbackOrDelivery;
  } else if (fallbackOrDelivery === null || fallbackOrDelivery === undefined) {
    actualFallback = fallback ?? 20;
  }

  if (isExportOfferType(offerType)) {
    if (actualDelivery) {
      const deliveryLower = actualDelivery.toLocaleLowerCase('tr-TR');
      if (
        deliveryLower.includes('ıhr. kayı') ||
        deliveryLower.includes('ihr. kayı') ||
        deliveryLower.includes('ihraç kayıtlı')
      ) {
        return 20;
      }
    }
    return 0;
  }
  return actualFallback;
}

export function applyDocumentVatDefaultOnLine<T extends { vatRate?: number | null; vatAmount?: number | null }>(
  line: T,
  offerType?: string | null,
  deliveryMethodName?: string | null,
): T {
  if (line.vatRate != null) return line;
  const vatRate = getDefaultDocumentVatRate(offerType, deliveryMethodName);
  return {
    ...line,
    vatRate,
    vatAmount: 0,
  };
}

export function enforceExportVatOnLine<T extends { vatRate?: number | null; vatAmount?: number | null }>(
  line: T,
  offerType?: string | null,
  deliveryMethodName?: string | null,
): T {
  return applyDocumentVatDefaultOnLine(line, offerType, deliveryMethodName);
}
