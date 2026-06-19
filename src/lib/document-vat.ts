import { OfferType, normalizeOfferType } from '@/types/offer-type';

export function isExportOfferType(offerType?: string | null): boolean {
  return normalizeOfferType(offerType) === OfferType.YURTDISI;
}

export function resolveDocumentVatRate(
  vatRate: number | null | undefined,
  offerType?: string | null,
  fallback = 20,
): number {
  return vatRate ?? getDefaultDocumentVatRate(offerType, fallback);
}

export function getDefaultDocumentVatRate(offerType?: string | null, fallback = 20): number {
  return isExportOfferType(offerType) ? 0 : fallback;
}

export function applyDocumentVatDefaultOnLine<T extends { vatRate?: number | null; vatAmount?: number | null }>(
  line: T,
  offerType?: string | null,
): T {
  if (line.vatRate != null) return line;
  const vatRate = getDefaultDocumentVatRate(offerType);
  return {
    ...line,
    vatRate,
    vatAmount: 0,
  };
}

export function enforceExportVatOnLine<T extends { vatRate?: number | null; vatAmount?: number | null }>(
  line: T,
  offerType?: string | null,
): T {
  return applyDocumentVatDefaultOnLine(line, offerType);
}
