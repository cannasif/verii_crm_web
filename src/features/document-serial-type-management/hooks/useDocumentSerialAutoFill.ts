import { useCallback, useEffect, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import type { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';
import type {
  CustomerDocumentSerialDocumentKind,
  CustomerDocumentSerialSuggestionDto,
  DocumentSerialTypeGetDto,
} from '../types/document-serial-type-types';
import { formatSuggestedDocumentNumber } from '../utils/format-suggested-document-number';
import {
  getLastDocumentSerialTypeId,
  saveLastDocumentSerialTypeId,
} from '../utils/document-serial-preference-store';
import { useCustomerDocumentSerialSuggestion } from './useCustomerDocumentSerialSuggestion';

export type SalesDocumentSerialRootKey = 'demand' | 'quotation' | 'order';

interface UseDocumentSerialAutoFillParams {
  rootKey: SalesDocumentSerialRootKey;
  ruleType: PricingRuleType;
  documentId?: number | null;
  readOnly?: boolean;
  availableDocumentSerialTypes: DocumentSerialTypeGetDto[];
  watchedDocumentSerialTypeId?: number | null;
  watchedRepresentativeId?: number | null;
  watchedCustomerId?: number | null;
  documentKind?: CustomerDocumentSerialDocumentKind | null;
  userId?: string | number | null;
  branchCode?: string | number | null;
}

interface UseDocumentSerialAutoFillReturn {
  handleDocumentSerialTypeSelect: (documentSerialTypeId: number | null) => void;
  customerSerialSuggestion?: CustomerDocumentSerialSuggestionDto | null;
  customerSuggestedSerialType?: DocumentSerialTypeGetDto;
  isCustomerSerialSuggestionLoading: boolean;
  applyCustomerSerialSuggestion: () => void;
}

export function useDocumentSerialAutoFill({
  rootKey,
  ruleType,
  documentId,
  readOnly = false,
  availableDocumentSerialTypes,
  watchedDocumentSerialTypeId,
  watchedRepresentativeId,
  watchedCustomerId,
  documentKind,
  userId,
  branchCode,
}: UseDocumentSerialAutoFillParams): UseDocumentSerialAutoFillReturn {
  const form = useFormContext();
  const lastAppliedSerialTypeIdRef = useRef<number | null>(null);
  const isCreateMode = documentId == null || documentId <= 0;

  const serialTypeField = `${rootKey}.documentSerialTypeId`;
  const offerNoField = `${rootKey}.offerNo`;
  const customerSuggestionQuery = useCustomerDocumentSerialSuggestion(
    watchedCustomerId,
    documentKind,
    branchCode,
    !readOnly,
  );

  const customerSuggestedSerialType = customerSuggestionQuery.data?.documentSerialTypeId
    ? availableDocumentSerialTypes.find((item) => item.id === customerSuggestionQuery.data?.documentSerialTypeId)
    : undefined;

  const applySuggestedOfferNo = useCallback(
    (serialType: DocumentSerialTypeGetDto): void => {
      if (readOnly || !isCreateMode) return;

      form.setValue(offerNoField, formatSuggestedDocumentNumber(serialType), {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [form, isCreateMode, offerNoField, readOnly],
  );

  const handleDocumentSerialTypeSelect = useCallback(
    (documentSerialTypeId: number | null): void => {
      form.setValue(serialTypeField, documentSerialTypeId, {
        shouldDirty: true,
        shouldValidate: true,
      });

      if (!documentSerialTypeId || documentSerialTypeId <= 0) {
        lastAppliedSerialTypeIdRef.current = null;
        return;
      }

      const serialType = availableDocumentSerialTypes.find((item) => item.id === documentSerialTypeId);
      if (!serialType) return;

      if (isCreateMode && !readOnly) {
        saveLastDocumentSerialTypeId(
          ruleType,
          userId,
          branchCode,
          watchedRepresentativeId ?? null,
          documentSerialTypeId,
        );
      }

      if (lastAppliedSerialTypeIdRef.current !== documentSerialTypeId) {
        lastAppliedSerialTypeIdRef.current = documentSerialTypeId;
        applySuggestedOfferNo(serialType);
      }
    },
    [
      applySuggestedOfferNo,
      availableDocumentSerialTypes,
      branchCode,
      form,
      isCreateMode,
      readOnly,
      ruleType,
      serialTypeField,
      userId,
      watchedRepresentativeId,
    ],
  );

  const applyCustomerSerialSuggestion = useCallback((): void => {
    if (!customerSuggestedSerialType) return;
    handleDocumentSerialTypeSelect(customerSuggestedSerialType.id);
  }, [customerSuggestedSerialType, handleDocumentSerialTypeSelect]);

  useEffect(() => {
    if (readOnly || !isCreateMode) return;
    if (!watchedRepresentativeId || watchedRepresentativeId <= 0) return;
    if (availableDocumentSerialTypes.length === 0) return;

    const currentSerialTypeId = form.getValues(serialTypeField) as number | null | undefined;
    if (currentSerialTypeId != null && currentSerialTypeId > 0) {
      const existingSerialType = availableDocumentSerialTypes.find((item) => item.id === currentSerialTypeId);
      const currentOfferNo = String(form.getValues(offerNoField) ?? '').trim();
      if (existingSerialType && !currentOfferNo) {
        lastAppliedSerialTypeIdRef.current = currentSerialTypeId;
        applySuggestedOfferNo(existingSerialType);
      }
      return;
    }

    const preferredId = getLastDocumentSerialTypeId(
      ruleType,
      userId,
      branchCode,
      watchedRepresentativeId,
    );
    const preferredSerialType = preferredId
      ? availableDocumentSerialTypes.find((item) => item.id === preferredId)
      : undefined;
    const fallbackSerialType =
      preferredSerialType
      ?? (availableDocumentSerialTypes.length === 1 ? availableDocumentSerialTypes[0] : undefined);

    if (fallbackSerialType) {
      handleDocumentSerialTypeSelect(fallbackSerialType.id);
    }
  }, [
    applySuggestedOfferNo,
    availableDocumentSerialTypes,
    branchCode,
    form,
    handleDocumentSerialTypeSelect,
    isCreateMode,
    offerNoField,
    readOnly,
    ruleType,
    serialTypeField,
    userId,
    watchedRepresentativeId,
  ]);

  useEffect(() => {
    if (!watchedDocumentSerialTypeId || watchedDocumentSerialTypeId <= 0) return;
    if (lastAppliedSerialTypeIdRef.current === watchedDocumentSerialTypeId) return;

    const serialType = availableDocumentSerialTypes.find((item) => item.id === watchedDocumentSerialTypeId);
    if (!serialType) return;

    lastAppliedSerialTypeIdRef.current = watchedDocumentSerialTypeId;
    if (isCreateMode && !readOnly) {
      applySuggestedOfferNo(serialType);
    }
  }, [
    applySuggestedOfferNo,
    availableDocumentSerialTypes,
    isCreateMode,
    readOnly,
    watchedDocumentSerialTypeId,
  ]);

  return {
    handleDocumentSerialTypeSelect,
    customerSerialSuggestion: customerSuggestionQuery.data,
    customerSuggestedSerialType,
    isCustomerSerialSuggestionLoading: customerSuggestionQuery.isLoading,
    applyCustomerSerialSuggestion,
  };
}
