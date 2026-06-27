import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useFormState } from 'react-hook-form';
import type { FieldValues, FieldNamesMarkedBoolean, UseFormReturn } from 'react-hook-form';
import {
  buildSalesDocumentDraftKey,
  deleteExpiredSalesDocumentDrafts,
  deleteSalesDocumentDraft,
  getSalesDocumentDraft,
  putSalesDocumentDraft,
  type SalesDocumentDraftPayload,
  type SalesDocumentDraftRecord,
  type SalesDocumentDraftType,
} from './sales-document-draft-store';

const DRAFT_TTL_DAYS = 14;
const AUTOSAVE_DELAY_MS = 900;

type SalesDocumentDraftRootKey = 'demand' | 'quotation' | 'order';

interface UseSalesDocumentDraftOptions<
  TFormValues extends FieldValues,
  TLine,
  TExchangeRate,
  TNotes,
> {
  documentType: SalesDocumentDraftType;
  rootKey: SalesDocumentDraftRootKey;
  userId?: string | number | null;
  branchCode?: string | number | null;
  form: UseFormReturn<TFormValues>;
  formValues: TFormValues;
  lines: TLine[];
  exchangeRates: TExchangeRate[];
  notes: TNotes;
  setLines: Dispatch<SetStateAction<TLine[]>>;
  setExchangeRates: Dispatch<SetStateAction<TExchangeRate[]>>;
  setNotes: Dispatch<SetStateAction<TNotes>>;
  createDefaultNotes: () => TNotes;
  enabled?: boolean;
}

type AnyDraftPayload = SalesDocumentDraftPayload<FieldValues, unknown, unknown, unknown>;
type DirtyFieldTree = Record<string, unknown>;

const MEANINGFUL_ROOT_KEYS = [
  'potentialCustomerId',
  'erpCustomerCode',
  'currency',
  'shippingAddressId',
  'paymentTypeId',
  'documentSerialTypeId',
  'deliveryMethod',
  'projectCode',
  'ozelKod1',
  'ozelKod2',
  'description',
  'generalDiscountRate',
  'generalDiscountAmount',
  'offerNo',
  'revisionNo',
] as const;

const STORED_MEANINGFUL_ROOT_KEYS = [
  'potentialCustomerId',
  'erpCustomerCode',
  'currency',
  'shippingAddressId',
  'paymentTypeId',
  'deliveryMethod',
  'projectCode',
  'description',
  'generalDiscountRate',
  'generalDiscountAmount',
] as const;

function isFileLike(value: unknown): boolean {
  return (
    (typeof File !== 'undefined' && value instanceof File) ||
    (typeof Blob !== 'undefined' && value instanceof Blob)
  );
}

function sanitizeForDraft<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, item) => {
      if (isFileLike(item)) return undefined;
      if (typeof item === 'string' && item.startsWith('blob:')) return undefined;
      return item;
    }),
  ) as T;
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0;
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.values(value).some(hasValue);
  return true;
}

function hasDirtyField(dirty: unknown): boolean {
  if (dirty === true) return true;
  if (!dirty || typeof dirty !== 'object' || Array.isArray(dirty)) return false;
  return Object.values(dirty as DirtyFieldTree).some(hasDirtyField);
}

function getDirtyChild(dirty: unknown, key: string): unknown {
  if (dirty === true) return true;
  if (!dirty || typeof dirty !== 'object' || Array.isArray(dirty)) return undefined;
  return (dirty as DirtyFieldTree)[key];
}

function hasStoredMeaningfulRootValue(root: Record<string, unknown>): boolean {
  return STORED_MEANINGFUL_ROOT_KEYS.some((key) => hasValue(root[key]));
}

function getPayloadRoot(
  payload: AnyDraftPayload,
  rootKey: SalesDocumentDraftRootKey,
): Record<string, unknown> {
  const root = payload.formValues[rootKey];
  return root && typeof root === 'object' && !Array.isArray(root)
    ? (root as Record<string, unknown>)
    : {};
}

export function hasMeaningfulSalesDocumentDraft(
  payload: AnyDraftPayload,
  rootKey: SalesDocumentDraftRootKey,
  dirtyFields?: FieldNamesMarkedBoolean<FieldValues>,
): boolean {
  const rootObject = getPayloadRoot(payload, rootKey);
  const dirtyRoot = dirtyFields ? dirtyFields[rootKey] : undefined;
  const hasDirtyRootValue = MEANINGFUL_ROOT_KEYS.some(
    (key) => hasDirtyField(getDirtyChild(dirtyRoot, key)) && hasValue(rootObject[key]),
  );

  return hasDirtyRootValue || payload.lines.length > 0 || hasValue(payload.notes);
}

function hasStoredMeaningfulSalesDocumentDraft(
  payload: AnyDraftPayload,
  rootKey: SalesDocumentDraftRootKey,
): boolean {
  return (
    hasStoredMeaningfulRootValue(getPayloadRoot(payload, rootKey)) ||
    payload.lines.length > 0 ||
    hasValue(payload.notes)
  );
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function useSalesDocumentDraft<
  TFormValues extends FieldValues,
  TLine,
  TExchangeRate,
  TNotes,
>({
  documentType,
  rootKey,
  userId,
  branchCode,
  form,
  formValues,
  lines,
  exchangeRates,
  notes,
  setLines,
  setExchangeRates,
  setNotes,
  createDefaultNotes,
  enabled = true,
}: UseSalesDocumentDraftOptions<TFormValues, TLine, TExchangeRate, TNotes>) {
  type Payload = SalesDocumentDraftPayload<TFormValues, TLine, TExchangeRate, TNotes>;
  const { dirtyFields } = useFormState({ control: form.control });

  const draftKey = useMemo(() => {
    if (userId === null || userId === undefined || userId === '') return null;
    return buildSalesDocumentDraftKey({ userId, branchCode, documentType });
  }, [branchCode, documentType, userId]);

  const [pendingDraft, setPendingDraft] = useState<SalesDocumentDraftRecord<Payload> | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [draftLoadComplete, setDraftLoadComplete] = useState(false);
  const isRestoringRef = useRef(false);

  const buildPayload = useCallback((): Payload => {
    return sanitizeForDraft({
      formValues,
      lines,
      exchangeRates,
      notes,
    });
  }, [exchangeRates, formValues, lines, notes]);

  const clearDraft = useCallback(async (): Promise<void> => {
    if (!draftKey) return;
    await deleteSalesDocumentDraft(draftKey);
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey) {
      setDraftLoadComplete(true);
      return;
    }
    let active = true;
    setDraftLoadComplete(false);

    const loadDraft = async (): Promise<void> => {
      await deleteExpiredSalesDocumentDrafts();
      const record = await getSalesDocumentDraft<Payload>(draftKey);
      if (!active) return;
      if (!record) {
        setDraftLoadComplete(true);
        return;
      }

      const isExpired = new Date(record.expiresAt).getTime() <= Date.now();
      if (isExpired || !hasStoredMeaningfulSalesDocumentDraft(record.payload as AnyDraftPayload, rootKey)) {
        await deleteSalesDocumentDraft(draftKey);
        if (active) setDraftLoadComplete(true);
        return;
      }

      setPendingDraft(record);
      setRestoreDialogOpen(true);
      setDraftLoadComplete(true);
    };

    void loadDraft();

    return () => {
      active = false;
    };
  }, [draftKey, rootKey]);

  useEffect(() => {
    if (!draftKey || !enabled || !draftLoadComplete || restoreDialogOpen || isRestoringRef.current) return;

    const payload = buildPayload();
    if (!hasMeaningfulSalesDocumentDraft(payload as AnyDraftPayload, rootKey, dirtyFields)) {
      void deleteSalesDocumentDraft(draftKey);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const now = new Date();
      void putSalesDocumentDraft<Payload>({
        key: draftKey,
        userId: String(userId),
        branchCode: branchCode === null || branchCode === undefined || branchCode === '' ? 'default' : String(branchCode),
        documentType,
        schemaVersion: 1,
        updatedAt: now.toISOString(),
        expiresAt: addDays(now, DRAFT_TTL_DAYS).toISOString(),
        payload,
      });
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [
    branchCode,
    buildPayload,
    documentType,
    dirtyFields,
    draftKey,
    draftLoadComplete,
    enabled,
    restoreDialogOpen,
    rootKey,
    userId,
  ]);

  const restoreDraft = useCallback((): void => {
    if (!pendingDraft) return;

    isRestoringRef.current = true;
    form.reset(pendingDraft.payload.formValues);
    setLines(pendingDraft.payload.lines ?? []);
    setExchangeRates(pendingDraft.payload.exchangeRates ?? []);
    setNotes(pendingDraft.payload.notes ?? createDefaultNotes());
    setPendingDraft(null);
    setRestoreDialogOpen(false);

    window.setTimeout(() => {
      isRestoringRef.current = false;
    }, 0);
  }, [createDefaultNotes, form, pendingDraft, setExchangeRates, setLines, setNotes]);

  const discardDraft = useCallback(async (): Promise<void> => {
    await clearDraft();
    setPendingDraft(null);
    setRestoreDialogOpen(false);
  }, [clearDraft]);

  return {
    pendingDraft,
    restoreDialogOpen,
    restoreDraft,
    discardDraft,
    clearDraft,
  };
}
