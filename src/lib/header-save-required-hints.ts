import {
  buildDocumentLinePrerequisiteHintLines,
  type DocumentLinePrerequisitesInput,
} from '@/lib/document-line-prerequisites';
import { isOfferType } from '@/types/offer-type';

/** Teklif / talep / sipariş üst formunda Kaydet tooltip’inde gösterilecek çekirdek zorunlular */
export type HeaderFormSliceForSaveHints = {
  potentialCustomerId?: number | null;
  erpCustomerCode?: string | null;
  representativeId?: number | null;
  currency?: string | null;
  paymentTypeId?: number | null;
  offerType?: string | null;
  documentSerialTypeId?: number | null;
  deliveryDate?: string | null;
};

export function headerSliceToLinePrerequisites(
  slice: HeaderFormSliceForSaveHints,
  currency: number | string | null | undefined,
): DocumentLinePrerequisitesInput {
  return {
    customerId: slice.potentialCustomerId,
    erpCustomerCode: slice.erpCustomerCode,
    representativeId: slice.representativeId,
    currency,
  };
}

export function buildHeaderSaveRequiredHintLines(
  slice: HeaderFormSliceForSaveHints,
  t: (key: string) => string,
  currencyForPrerequisites?: number | string | null | undefined,
): string[] {
  const lines: string[] = buildDocumentLinePrerequisiteHintLines(
    headerSliceToLinePrerequisites(slice, currencyForPrerequisites ?? slice.currency),
    t,
  );

  if (slice.paymentTypeId == null || slice.paymentTypeId < 1) {
    lines.push(t('disabledActionHints.requiredFields.paymentType'));
  }

  if (!isOfferType(slice.offerType ?? undefined)) {
    lines.push(t('disabledActionHints.requiredFields.offerType'));
  }

  if (slice.documentSerialTypeId == null || slice.documentSerialTypeId < 1) {
    lines.push(t('disabledActionHints.requiredFields.documentSerial'));
  }

  if (!slice.deliveryDate || String(slice.deliveryDate).trim().length === 0) {
    lines.push(t('disabledActionHints.requiredFields.deliveryDate'));
  }

  return lines;
}
