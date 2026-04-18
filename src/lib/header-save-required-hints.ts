import { isOfferType } from '@/types/offer-type';

/** Teklif / talep / sipariş üst formunda Kaydet tooltip’inde gösterilecek çekirdek zorunlular */
export type HeaderFormSliceForSaveHints = {
  potentialCustomerId?: number | null;
  erpCustomerCode?: string | null;
  currency?: string | null;
  paymentTypeId?: number | null;
  offerType?: string | null;
  documentSerialTypeId?: number | null;
};

export function buildHeaderSaveRequiredHintLines(
  slice: HeaderFormSliceForSaveHints,
  t: (key: string) => string,
): string[] {
  const lines: string[] = [];

  const hasCustomer =
    (slice.potentialCustomerId != null && slice.potentialCustomerId > 0) ||
    (slice.erpCustomerCode != null && String(slice.erpCustomerCode).trim().length > 0);
  if (!hasCustomer) {
    lines.push(t('disabledActionHints.requiredFields.customer'));
  }

  if (slice.currency == null || String(slice.currency).trim() === '') {
    lines.push(t('disabledActionHints.requiredFields.currency'));
  }

  if (slice.paymentTypeId == null || slice.paymentTypeId < 1) {
    lines.push(t('disabledActionHints.requiredFields.paymentType'));
  }

  if (!isOfferType(slice.offerType ?? undefined)) {
    lines.push(t('disabledActionHints.requiredFields.offerType'));
  }

  if (slice.documentSerialTypeId == null || slice.documentSerialTypeId < 1) {
    lines.push(t('disabledActionHints.requiredFields.documentSerial'));
  }

  return lines;
}
