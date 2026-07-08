import { useMemo } from 'react';
import { useWatch, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import {
  buildDocumentLinePrerequisiteHintLines,
  type DocumentLinePrerequisitesInput,
} from '@/lib/document-line-prerequisites';
import { isOfferType } from '@/types/offer-type';

export type DocumentFormRootKey = 'demand' | 'quotation' | 'order';

/** Teklif / talep / sipariş üst formunda Kaydet tooltip’inde gösterilecek çekirdek zorunlular */
export type HeaderFormSliceForSaveHints = {
  potentialCustomerId?: number | null;
  erpCustomerCode?: string | null;
  representativeId?: number | null;
  currency?: string | null;
  paymentTypeId?: number | string | null;
  offerType?: string | null;
  documentSerialTypeId?: number | string | null;
  deliveryDate?: string | null;
  ozelKod1?: string | null;
};

function isPositiveSelection(value: number | string | null | undefined): boolean {
  if (value == null) {
    return false;
  }

  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) && numericValue >= 1;
}

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

  if (!slice.ozelKod1 || String(slice.ozelKod1).trim().length === 0) {
    lines.push(t('disabledActionHints.requiredFields.ozelKod1'));
  }

  if (!isPositiveSelection(slice.paymentTypeId)) {
    lines.push(t('disabledActionHints.requiredFields.paymentType'));
  }

  if (!isOfferType(slice.offerType ?? undefined)) {
    lines.push(t('disabledActionHints.requiredFields.offerType'));
  }

  if (!isPositiveSelection(slice.documentSerialTypeId)) {
    lines.push(t('disabledActionHints.requiredFields.documentSerial'));
  }

  if (!slice.deliveryDate || String(slice.deliveryDate).trim().length === 0) {
    lines.push(t('disabledActionHints.requiredFields.deliveryDate'));
  }

  return lines;
}

function fieldName<TFieldValues extends FieldValues>(
  rootKey: DocumentFormRootKey,
  suffix: string,
): FieldPath<TFieldValues> {
  return `${rootKey}.${suffix}` as FieldPath<TFieldValues>;
}

function useHeaderSaveWatchedSlice<TFieldValues extends FieldValues>(
  control: Control<TFieldValues>,
  rootKey: DocumentFormRootKey,
): HeaderFormSliceForSaveHints {
  const potentialCustomerId = useWatch({ control, name: fieldName<TFieldValues>(rootKey, 'potentialCustomerId') });
  const erpCustomerCode = useWatch({ control, name: fieldName<TFieldValues>(rootKey, 'erpCustomerCode') });
  const representativeId = useWatch({ control, name: fieldName<TFieldValues>(rootKey, 'representativeId') });
  const currencyRaw = useWatch({ control, name: fieldName<TFieldValues>(rootKey, 'currency') });
  const paymentTypeId = useWatch({ control, name: fieldName<TFieldValues>(rootKey, 'paymentTypeId') });
  const offerType = useWatch({ control, name: fieldName<TFieldValues>(rootKey, 'offerType') });
  const documentSerialTypeId = useWatch({ control, name: fieldName<TFieldValues>(rootKey, 'documentSerialTypeId') });
  const deliveryDate = useWatch({ control, name: fieldName<TFieldValues>(rootKey, 'deliveryDate') });
  const ozelKod1 = useWatch({ control, name: fieldName<TFieldValues>(rootKey, 'ozelKod1') });
  const ozelKod2 = useWatch({ control, name: fieldName<TFieldValues>(rootKey, 'ozelKod2') });
  const generalDiscountRate = useWatch({ control, name: fieldName<TFieldValues>(rootKey, 'generalDiscountRate') });
  const generalDiscountAmount = useWatch({ control, name: fieldName<TFieldValues>(rootKey, 'generalDiscountAmount') });
  const description = useWatch({ control, name: fieldName<TFieldValues>(rootKey, 'description') });
  const projectCode = useWatch({ control, name: fieldName<TFieldValues>(rootKey, 'projectCode') });
  const shippingAddressId = useWatch({ control, name: fieldName<TFieldValues>(rootKey, 'shippingAddressId') });
  const activityId = useWatch({ control, name: fieldName<TFieldValues>(rootKey, 'activityId') });
  const status = useWatch({ control, name: fieldName<TFieldValues>(rootKey, 'status') });
  const deliveryMethod = useWatch({ control, name: fieldName<TFieldValues>(rootKey, 'deliveryMethod') });
  const koliBaskiDefinitionId = useWatch({ control, name: fieldName<TFieldValues>(rootKey, 'koliBaskiDefinitionId') });
  const offerDate = useWatch({ control, name: fieldName<TFieldValues>(rootKey, 'offerDate') });
  const offerNo = useWatch({ control, name: fieldName<TFieldValues>(rootKey, 'offerNo') });
  const revisionNo = useWatch({ control, name: fieldName<TFieldValues>(rootKey, 'revisionNo') });
  const revisionId = useWatch({ control, name: fieldName<TFieldValues>(rootKey, 'revisionId') });

  return useMemo(
    () => ({
      potentialCustomerId,
      erpCustomerCode,
      representativeId,
      currency: currencyRaw,
      paymentTypeId,
      offerType,
      documentSerialTypeId,
      deliveryDate,
      ozelKod1,
      ozelKod2,
      generalDiscountRate,
      generalDiscountAmount,
      description,
      projectCode,
      shippingAddressId,
      activityId,
      status,
      deliveryMethod,
      koliBaskiDefinitionId,
      offerDate,
      offerNo,
      revisionNo,
      revisionId,
    }),
    [
      potentialCustomerId,
      erpCustomerCode,
      representativeId,
      currencyRaw,
      paymentTypeId,
      offerType,
      documentSerialTypeId,
      deliveryDate,
      ozelKod1,
      ozelKod2,
      generalDiscountRate,
      generalDiscountAmount,
      description,
      projectCode,
      shippingAddressId,
      activityId,
      status,
      deliveryMethod,
      koliBaskiDefinitionId,
      offerDate,
      offerNo,
      revisionNo,
      revisionId,
    ],
  );
}

export function useHeaderSaveTooltipState<TFieldValues extends FieldValues>(
  control: Control<TFieldValues>,
  rootKey: DocumentFormRootKey,
  t: (key: string) => string,
): { hintLines: string[]; schemaPayload: Record<string, unknown> } {
  const slice = useHeaderSaveWatchedSlice(control, rootKey);

  const currencyForPrerequisites =
    slice.currency === '' || slice.currency === null || slice.currency === undefined
      ? Number.NaN
      : Number(slice.currency);

  const hintLines = useMemo(
    () => buildHeaderSaveRequiredHintLines(slice, t, currencyForPrerequisites),
    [slice, t, currencyForPrerequisites],
  );

  const schemaPayload = useMemo(() => ({ [rootKey]: slice }), [rootKey, slice]);

  return { hintLines, schemaPayload };
}
