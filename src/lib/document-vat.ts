import { OfferType, normalizeOfferType } from '@/types/offer-type';

export function isExportOfferType(offerType?: string | null): boolean {
  return normalizeOfferType(offerType) === OfferType.YURTDISI;
}

export function resolveDocumentVatRate(
  vatRate: number | null | undefined,
  offerType?: string | null,
  fallback = 20,
): number {
  return isExportOfferType(offerType) ? 0 : (vatRate ?? fallback);
}

export function enforceExportVatOnLine<T extends { vatRate?: number | null; vatAmount?: number | null }>(
  line: T,
  offerType?: string | null,
): T {
  if (!isExportOfferType(offerType)) return line;
  return {
    ...line,
    vatRate: 0,
    vatAmount: 0,
  };
}
