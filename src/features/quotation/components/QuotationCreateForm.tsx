import { type ReactElement, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useForm, FormProvider, useFormState } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCreateQuotationBulk } from '../hooks/useCreateQuotationBulk';
import { usePriceRuleOfQuotation } from '../hooks/usePriceRuleOfQuotation';
import { useUserDiscountLimitsBySalesperson } from '../hooks/useUserDiscountLimitsBySalesperson';
import { useCustomerOptions } from '@/features/customer-management/hooks/useCustomerOptions';
import { useCustomer } from '@/features/customer-management/hooks/useCustomer';
import { resolveQuotationCustomerLabelForPdf } from '@/lib/resolve-quotation-customer-label';
import { QuotationHeaderForm } from './QuotationHeaderForm';
import { QuotationLineTable } from './QuotationLineTable';
import { QuotationSummaryCard } from './QuotationSummaryCard';
import { Button } from '@/components/ui/button';
import { FormSubmitTooltipWrap } from '@/components/shared/FormSubmitTooltipWrap';
import { useHeaderSaveTooltipState } from '@/lib/header-save-required-hints';
import { Save, X, Eye, FileText, Layers, Calculator } from 'lucide-react';
import { DocumentCreatePageHeader } from '@/components/shared/DocumentCreatePageHeader';
import { QuotationPdfExportPreviewDialog } from './QuotationPdfExportPreviewDialog';
import { QuotationWhatsappSendDialog } from './QuotationWhatsappSendDialog';
import { QuotationMailShareDialogs, type QuotationMailShareContext } from './QuotationMailShareDialogs';
import { isIntegratedQuotationShare } from '../config/quotation-share-config';
import { useQuotationNativeSharePrep } from '../hooks/useQuotationNativeSharePrep';
import { blobToFile, resolveCustomerPhone } from '../utils/quotation-share-utils';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import { createQuotationSchema, type CreateQuotationSchema } from '../schemas/quotation-schema';
import type { QuotationLineFormState, QuotationExchangeRateFormState, QuotationBulkCreateDto, CreateQuotationDto, PricingRuleLineGetDto, UserDiscountLimitDto, QuotationNotesDto } from '../types/quotation-types';
import { DEFAULT_OFFER_TYPE, normalizeOfferType } from '@/types/offer-type';
import { createEmptyQuotationNotes } from './QuotationNotesDialog';
import { mapQuotationNotesToPayload, quotationNotesDtoToNotesList } from '../utils/quotation-payload-mapper';
import { quotationApi } from '../api/quotation-api';
import { pdfReportTemplateApi } from '@/features/pdf-report/api/pdf-report-template-api';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { SalesDocumentDraftRestoreDialog } from '@/features/sales-drafts/SalesDocumentDraftRestoreDialog';
import { useSalesDocumentDraft } from '@/features/sales-drafts/useSalesDocumentDraft';
import { usePrefetchLineImagesForPdf } from '../hooks/usePrefetchLineImagesForPdf';
import { recordCustomerDocumentSerialUsageSafely } from '@/features/document-serial-type-management/utils/customer-document-serial-usage';
import { CustomerDocumentSerialDocumentKind } from '@/features/document-serial-type-management/types/document-serial-type-types';
import { useQuotationCalculations } from '../hooks/useQuotationCalculations';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import { buildEffectiveExchangeRates } from '@/features/sales-documents/utils/exchange-rate-snapshot';
import { applyExchangeRateChangeToLines } from '@/features/sales-documents/utils/apply-exchange-rate-to-lines';
import { findExchangeRateByDovizTipi } from '../utils/price-conversion';
import type { QuotationGetDto, QuotationLineGetDto } from '../types/quotation-types';
import {
  buildQuotationPreviewPdfBlob,
  type QuotationPreviewPdfLabels,
} from '../utils/build-quotation-preview-pdf';
import {
  buildPreviewPdfDocumentFooterDetails,
  buildPreviewPdfDocumentFooterLabels,
  buildPreviewPdfLineDetailLabels,
  buildPreviewPdfLineDiscountLabels,
  previewPdfLineHasDiscount,
  previewPdfHasGeneralDiscount,
  resolvePreviewPdfPaymentTypeName,
  resolvePreviewPdfShippingAddressText,
} from '../utils/build-preview-pdf-footer-details';
import { useWindoDefinitionOptions } from '@/features/windo-profil-demir-vida-management/hooks/useWindoDefinitionOptions';
import { usePaymentTypes } from '../hooks/usePaymentTypes';
import { useShippingAddresses } from '../hooks/useShippingAddresses';
import {
  DOCUMENT_DETAIL_BUTTON_BASE,
  DOCUMENT_DETAIL_BUTTON_PREVIEW,
  DOCUMENT_DETAIL_BUTTON_SAVE,
} from '@/lib/document-detail-button-styles';

const CREATE_SECTION_CARD_CLASSNAME =
  'rounded-2xl overflow-hidden border border-slate-400 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_28px_-22px_rgba(15,23,42,0.40)] ring-1 ring-slate-300/70 dark:border-white/16 dark:bg-[#120b1d]/82 dark:ring-white/12';
const CREATE_SECTION_HEADER_CLASSNAME =
  'px-5 py-4 flex items-center gap-3 border-b border-slate-400/75 bg-slate-100/85 dark:border-white/12 dark:bg-white/[0.07]';
const CREATE_HEADER_FORM_SURFACE_CLASSNAME =
  '[&_label]:text-slate-800 dark:[&_label]:text-slate-200 [&_input]:border-slate-500/70 [&_input]:bg-white [&_input]:shadow-sm [&_input]:placeholder:text-slate-400 [&_input]:focus-visible:border-primary/85 [&_input]:focus-visible:ring-primary/20 dark:[&_input]:border-white/20 dark:[&_input]:bg-[#120d1d] dark:[&_input]:placeholder:text-slate-500 dark:[&_input]:focus-visible:border-primary/50 dark:[&_input]:focus-visible:ring-primary/20 [&_textarea]:border-slate-500/70 [&_textarea]:bg-white [&_textarea]:shadow-sm [&_textarea]:placeholder:text-slate-400 [&_textarea]:focus-visible:border-primary/85 [&_textarea]:focus-visible:ring-primary/20 dark:[&_textarea]:border-white/20 dark:[&_textarea]:bg-[#120d1d] dark:[&_textarea]:placeholder:text-slate-500 dark:[&_textarea]:focus-visible:border-primary/50 dark:[&_textarea]:focus-visible:ring-primary/20 [&_[data-slot=select-trigger]]:border-slate-500/70 [&_[data-slot=select-trigger]]:bg-white [&_[data-slot=select-trigger]]:shadow-sm dark:[&_[data-slot=select-trigger]]:border-white/20 dark:[&_[data-slot=select-trigger]]:bg-[#120d1d]';

function addDaysToDateOnly(dateValue: string, days: number): string {
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

async function finalizePendingQuotationImages(
  quotation: QuotationGetDto,
  draftLines: QuotationLineFormState[]
): Promise<void> {
  const createdLines = quotation.lines && quotation.lines.length > 0
    ? quotation.lines
    : await quotationApi.getQuotationLinesByQuotationId(quotation.id);

  for (let index = 0; index < draftLines.length; index += 1) {
    const draftLine = draftLines[index];
    const pendingImageFile = draftLine.pendingImageFile;
    const createdLine = createdLines[index];

    if (!pendingImageFile || !createdLine?.id) continue;

    const uploaded = await pdfReportTemplateApi.uploadAsset(pendingImageFile, {
      assetScope: 'quotation-line',
      quotationId: quotation.id,
      quotationLineId: createdLine.id,
      productCode: draftLine.productCode || createdLine.productCode || undefined,
    });

    await quotationApi.updateQuotationLines([
      {
        ...(createdLine as QuotationLineGetDto),
        imagePath: uploaded.relativeUrl,
      },
    ]);
  }
}

interface QuotationPrefillCustomerState {
  prefillCustomer?: {
    potentialCustomerId?: number | null;
    erpCustomerCode?: string | null;
    customerName?: string | null;
  };
}

export function QuotationCreateForm(): ReactElement {
  const { t, i18n } = useTranslation(['quotation', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const { setPageTitle } = useUIStore();
  const user = useAuthStore((state) => state.user);
  const branch = useAuthStore((state) => state.branch);

  const [lines, setLines] = useState<QuotationLineFormState[]>([]);
  usePrefetchLineImagesForPdf(lines);
  const [exchangeRates, setExchangeRates] = useState<QuotationExchangeRateFormState[]>([]);
  const [quotationNotes, setQuotationNotes] = useState<QuotationNotesDto>(createEmptyQuotationNotes);
  const [pricingRules, setPricingRules] = useState<PricingRuleLineGetDto[]>([]);
  const [temporarySallerData, setTemporarySallerData] = useState<UserDiscountLimitDto[]>([]);
  const [pdfExportOpen, setPdfExportOpen] = useState(false);
  const [whatsappShareOpen, setWhatsappShareOpen] = useState(false);
  const [mailProviderPickerOpen, setMailProviderPickerOpen] = useState(false);
  const [googleMailOpen, setGoogleMailOpen] = useState(false);
  const [outlookMailOpen, setOutlookMailOpen] = useState(false);
  const [pendingSharePdfBlob, setPendingSharePdfBlob] = useState<Blob | null>(null);
  const createMutation = useCreateQuotationBulk();
  const { currencyOptions } = useCurrencyOptions();

  useEffect(() => {
    setPageTitle(null);
    return () => {
      setPageTitle(null);
    };
  }, [setPageTitle]);

  const form = useForm<CreateQuotationSchema>({
    resolver: zodResolver(createQuotationSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      quotation: {
        offerType: DEFAULT_OFFER_TYPE,
        currency: '',
        offerDate: new Date().toISOString().split('T')[0],
        deliveryDate: addDaysToDateOnly(new Date().toISOString().split('T')[0], 21),
        representativeId: user?.id || null,
        activityId: null,
        ozelKod1: '',
        ozelKod2: '',
        generalDiscountRate: null,
        generalDiscountAmount: null,
        koliBaskiDefinitionId: null,
      },
    },
  });
  const { isValid: isFormValid } = useFormState({ control: form.control });
  const watchedCurrencyRaw = form.watch('quotation.currency');
  const watchedCurrency =
    watchedCurrencyRaw === '' || watchedCurrencyRaw === null || watchedCurrencyRaw === undefined
      ? Number.NaN
      : Number(watchedCurrencyRaw);
  const watchedCustomerId = form.watch('quotation.potentialCustomerId');
  const watchedErpCustomerCode = form.watch('quotation.erpCustomerCode');
  const watchedRepresentativeId = form.watch('quotation.representativeId');
  const watchedOfferDate = form.watch('quotation.offerDate');
  const quotationFormSlice = form.watch('quotation');
  const quotationDraftFormValues = form.watch();
  const { hintLines: saveManualHintLines, schemaPayload: quotationSchemaPayload } = useHeaderSaveTooltipState(
    form.control,
    'quotation',
    (key) => t(key, { ns: 'common' }),
  );
  const salesDraft = useSalesDocumentDraft({
    documentType: 'quotation',
    rootKey: 'quotation',
    userId: user?.id,
    branchCode: branch?.code ?? null,
    form,
    formValues: quotationDraftFormValues,
    lines,
    exchangeRates,
    notes: quotationNotes,
    setLines,
    setExchangeRates,
    setNotes: setQuotationNotes,
    createDefaultNotes: createEmptyQuotationNotes,
    enabled: !createMutation.isPending,
  });

  const { data: customerOptions = [] } = useCustomerOptions(watchedRepresentativeId);
  const { data: selectedCustomer } = useCustomer(
    watchedCustomerId ?? 0,
    Boolean(watchedCustomerId && watchedCustomerId > 0)
  );
  const { koliBaskiMap, profilMap, demirMap, vidaMap, baskiMap } = useWindoDefinitionOptions();
  const { data: paymentTypes = [] } = usePaymentTypes();
  const { data: shippingAddresses = [] } = useShippingAddresses(
    watchedCustomerId != null && watchedCustomerId > 0 ? watchedCustomerId : undefined,
  );
  const offerDateSyncInitializedRef = useRef(false);

  useEffect(() => {
    if (!watchedOfferDate) return;
    if (!offerDateSyncInitializedRef.current) {
      offerDateSyncInitializedRef.current = true;
      return;
    }
    const nextDeliveryDate = addDaysToDateOnly(watchedOfferDate, 21);
    if (form.getValues('quotation.deliveryDate') !== nextDeliveryDate) {
      form.setValue('quotation.deliveryDate', nextDeliveryDate, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [watchedOfferDate, form]);

  const prefillAppliedRef = useRef(false);
  useEffect(() => {
    if (prefillAppliedRef.current) return;
    const prefill = (location.state as QuotationPrefillCustomerState | null)?.prefillCustomer;
    if (!prefill) return;
    prefillAppliedRef.current = true;
    if (prefill.potentialCustomerId && prefill.potentialCustomerId > 0) {
      form.setValue('quotation.potentialCustomerId', prefill.potentialCustomerId, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    if (prefill.erpCustomerCode) {
      form.setValue('quotation.erpCustomerCode', prefill.erpCustomerCode, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [location.state, form]);

  const { calculateLineTotals } = useQuotationCalculations();

  const handleApplyExchangeRateChangeToLines = useCallback((oldExchangeRate: number, newExchangeRate: number): void => {
    setLines((prev) => applyExchangeRateChangeToLines(prev, oldExchangeRate, newExchangeRate));
  }, []);
  const { data: erpRates = [] } = useExchangeRate();

  useEffect(() => {
    if (erpRates.length > 0 && currencyOptions.length > 0) {
      setExchangeRates((prev) => {
        const mappedRates = erpRates.map((rate, index) => {
          const existing = prev.find((er) => er.dovizTipi === rate.dovizTipi);
          const erpRateValue = Number(rate.kurDegeri ?? 0);
          const existingRateValue = Number(existing?.exchangeRate ?? 0);
          const shouldUseErpRate =
            !existing ||
            existingRateValue <= 0 ||
            (existing.isOfficial !== false && existingRateValue === 1 && rate.dovizTipi !== 0 && erpRateValue > 0);

          return {
            id: existing?.id || `temp-${rate.dovizTipi}-${index}`,
            currency: existing?.currency || String(rate.dovizTipi),
            exchangeRate: shouldUseErpRate ? erpRateValue : existingRateValue,
            exchangeRateDate: existing?.exchangeRateDate || new Date().toISOString().split('T')[0],
            isOfficial: shouldUseErpRate ? rate.kurDegeri != null : existing?.isOfficial ?? rate.kurDegeri != null,
            dovizTipi: rate.dovizTipi,
          };
        });

        const isDifferent = mappedRates.some((mr, i) => {
          const pr = prev[i];
          return !pr || pr.exchangeRate !== mr.exchangeRate || pr.dovizTipi !== mr.dovizTipi;
        }) || mappedRates.length !== prev.length;

        return isDifferent ? mappedRates : prev;
      });
    }
  }, [erpRates, currencyOptions, setExchangeRates]);

  const customerCode = useMemo(() => {
    if (watchedErpCustomerCode) {
      return watchedErpCustomerCode;
    }
    if (watchedCustomerId) {
      const customer = customerOptions.find((c) => c.id === watchedCustomerId);
      return customer?.customerCode || null;
    }
    return null;
  }, [watchedErpCustomerCode, watchedCustomerId, customerOptions]);

  const { data: pricingRulesData } = usePriceRuleOfQuotation(
    customerCode,
    watchedRepresentativeId || undefined,
    watchedOfferDate || undefined
  );

  useEffect(() => {
    if (pricingRulesData) {
      setPricingRules(pricingRulesData);
    }
  }, [pricingRulesData]);

  const { data: userDiscountLimitsData } = useUserDiscountLimitsBySalesperson(watchedRepresentativeId);

  useEffect(() => {
    if (watchedRepresentativeId && userDiscountLimitsData) {
      setTemporarySallerData(userDiscountLimitsData);
    } else {
      setTemporarySallerData([]);
    }
  }, [watchedRepresentativeId, userDiscountLimitsData]);

  const onSubmit = async (data: CreateQuotationSchema): Promise<void> => {
    if (lines.length === 0) {
      toast.error(t('create.error'), {
        description: t('lines.required'),
      });
      return;
    }

    const noteKeys = ['note1', 'note2', 'note3', 'note4', 'note5', 'note6', 'note7', 'note8', 'note9', 'note10', 'note11', 'note12', 'note13', 'note14', 'note15'] as const;
    const overLimitNote = noteKeys.find((k) => (quotationNotes[k]?.length ?? 0) > 100);
    if (overLimitNote) {
      toast.error(t('create.error'), {
        description: t('notes.maxLengthError'),
      });
      return;
    }

    try {
      const linesToSend = lines.map((line) => {
        const {
          id: _ignoredId,
          isEditing,
          relatedLines,
          pendingImageFile: _pendingImageFile,
          pendingImagePreviewUrl: _pendingImagePreviewUrl,
          ...cleanLineData
        } = line as QuotationLineFormState & { relatedLines?: unknown[] };

        return {
          ...cleanLineData,
          quotationId: 0,
          productId: cleanLineData.productId ?? null,
          description: cleanLineData.description || null,
          description1: cleanLineData.description1 || null,
          description2: cleanLineData.description2 || null,
          description3: cleanLineData.description3 || null,
          baskiAciklama: cleanLineData.baskiAciklama?.trim() || null,
          pricingRuleHeaderId: cleanLineData.pricingRuleHeaderId && cleanLineData.pricingRuleHeaderId > 0 ? cleanLineData.pricingRuleHeaderId : null,
          relatedStockId: cleanLineData.relatedStockId && cleanLineData.relatedStockId > 0 ? cleanLineData.relatedStockId : null,
          erpProjectCode: cleanLineData.projectCode ?? null,
        };
      });

      const currencyValue = typeof data.quotation.currency === 'string'
        ? data.quotation.currency
        : String(data.quotation.currency);

      const effectiveExchangeRates = buildEffectiveExchangeRates(
        exchangeRates,
        erpRates,
        currencyValue,
        data.quotation.offerDate || null,
      );

      const exchangeRatesToSend = effectiveExchangeRates.length > 0
        ? effectiveExchangeRates.map(({ id, dovizTipi, ...rate }) => {
          const currencyValue = rate.currency || (dovizTipi != null ? String(dovizTipi) : '');
          return {
            ...rate,
            currency: currencyValue,
            quotationId: 0,
            isOfficial: rate.isOfficial ?? true,
          };
        })
        : [];

      if (currencyValue == null || currencyValue === '' || Number.isNaN(Number(currencyValue))) {
        throw new Error(t('create.invalidCurrency'));
      }

      const quotationData: CreateQuotationDto = {
        offerType: normalizeOfferType(data.quotation.offerType),
        currency: currencyValue,
        potentialCustomerId: (data.quotation.potentialCustomerId && data.quotation.potentialCustomerId > 0) ? data.quotation.potentialCustomerId : null,
        erpCustomerCode: data.quotation.erpCustomerCode || null,
        deliveryDate: data.quotation.deliveryDate || null,
        shippingAddressId: (data.quotation.shippingAddressId && data.quotation.shippingAddressId > 0) ? data.quotation.shippingAddressId : null,
        representativeId: (data.quotation.representativeId && data.quotation.representativeId > 0) ? data.quotation.representativeId : null,
        activityId: (data.quotation.activityId && data.quotation.activityId > 0) ? data.quotation.activityId : null,
        projectCode: data.quotation.projectCode || null,
        ozelKod1: data.quotation.ozelKod1 || null,
        ozelKod2: data.quotation.ozelKod2 || null,
        status: (data.quotation.status && data.quotation.status > 0) ? data.quotation.status : null,
        description: data.quotation.description || null,
        paymentTypeId: (data.quotation.paymentTypeId && data.quotation.paymentTypeId > 0) ? data.quotation.paymentTypeId : null,
        paymentTermDays: data.quotation.paymentTermDays ?? null,
        documentSerialTypeId: (data.quotation.documentSerialTypeId && data.quotation.documentSerialTypeId > 0) ? data.quotation.documentSerialTypeId : null,
        offerDate: data.quotation.offerDate || null,
        offerNo: data.quotation.offerNo || null,
        revisionNo: data.quotation.revisionNo || null,
        revisionId: (data.quotation.revisionId && data.quotation.revisionId > 0) ? data.quotation.revisionId : null,
        generalDiscountRate: data.quotation.generalDiscountRate ?? null,
        generalDiscountAmount: data.quotation.generalDiscountAmount ?? null,
        salesTypeDefinitionId: data.quotation.deliveryMethod ? Number(data.quotation.deliveryMethod) : null,
        koliBaskiDefinitionId: (data.quotation.koliBaskiDefinitionId && data.quotation.koliBaskiDefinitionId > 0) ? data.quotation.koliBaskiDefinitionId : null,
        erpProjectCode: data.quotation.projectCode ?? null,
      };

      const mappedQuotationNotes = mapQuotationNotesToPayload(quotationNotes);

      const payload: QuotationBulkCreateDto = {
        quotation: quotationData,
        lines: linesToSend,
        exchangeRates: exchangeRatesToSend,
        ...(mappedQuotationNotes && { quotationNotes: mappedQuotationNotes }),
      };

      const result = await createMutation.mutateAsync(payload);

      if (result.success && result.data) {
        await finalizePendingQuotationImages(result.data, lines);
        const notesList = quotationNotesDtoToNotesList(quotationNotes);
        if (notesList.length > 0) {
          await quotationApi.updateNotesListByQuotationId(result.data.id, { notes: notesList });
        }
        await recordCustomerDocumentSerialUsageSafely({
          customerId: quotationData.potentialCustomerId,
          documentKind: CustomerDocumentSerialDocumentKind.Quotation,
          documentSerialTypeId: quotationData.documentSerialTypeId,
          documentId: result.data.id,
          documentNo: result.data.offerNo ?? quotationData.offerNo,
          requestBranchCode: branch?.code ?? null,
        });
        toast.success(t('create.success'), {
          description: t('create.successMessage'),
        });
        await salesDraft.clearDraft();
        navigate(`/quotations/${result.data.id}`);
      } else {
        throw new Error(result.message || t('create.errorMessage'));
      }
    } catch (error: unknown) {
      let errorMessage = t('create.errorMessage');
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(t('create.error'), {
        description: errorMessage,
        duration: 10000,
      });
    }
  };

  const handleCurrencyChange = async (
    newCurrency: string,
    forcedOldCurrency?: number
  ): Promise<void> => {
    if (lines.length === 0) return;

    const oldCurrency = forcedOldCurrency ?? watchedCurrency;
    const newCurrencyNum = Number(newCurrency);

    if (oldCurrency === newCurrencyNum) return;

    const sampleOldRate = findExchangeRateByDovizTipi(oldCurrency, exchangeRates, erpRates);
    const sampleNewRate = findExchangeRateByDovizTipi(newCurrencyNum, exchangeRates, erpRates);

    if (!sampleOldRate || sampleOldRate <= 0 || !sampleNewRate || sampleNewRate <= 0) {
      toast.error(t('update.error'), {
        description: t('exchangeRates.zeroRateError'),
      });
      throw new Error('ZERO_RATE');
    }

    const updatedLines = await Promise.all(
      lines.map(async (line) => {
        const oldRate = findExchangeRateByDovizTipi(oldCurrency, exchangeRates, erpRates);
        const newRate = findExchangeRateByDovizTipi(newCurrencyNum, exchangeRates, erpRates);

        if (!oldRate || oldRate <= 0 || !newRate || newRate <= 0) {
          return line;
        }

        const conversionRatio = oldRate / newRate;
        const newUnitPrice = line.unitPrice * conversionRatio;

        const updatedLine = {
          ...line,
          unitPrice: newUnitPrice,
        };
        return calculateLineTotals(updatedLine);
      })
    );
    setLines(updatedLines);
  };

  const handleExplicitCurrencyChange = async (
    oldCurrency: number,
    newCurrency: number
  ): Promise<void> => {
    await handleCurrencyChange(String(newCurrency), oldCurrency);
  };

  const currencyCode = useMemo(() => {
    const found = currencyOptions.find((opt) => opt.dovizTipi === watchedCurrency);
    return found?.code || 'TRY';
  }, [watchedCurrency, currencyOptions]);

  const hasLineDiscounts = useMemo(
    () => lines.some((line) => previewPdfLineHasDiscount(line)),
    [lines],
  );

  const hasGeneralDiscount = useMemo(
    () => previewPdfHasGeneralDiscount(
      quotationFormSlice.generalDiscountRate,
      quotationFormSlice.generalDiscountAmount,
    ),
    [quotationFormSlice.generalDiscountRate, quotationFormSlice.generalDiscountAmount],
  );

  const defaultShowDiscountDetails = hasLineDiscounts || hasGeneralDiscount;

  const buildExportPdfBlob = useCallback(async ({ draft, showDiscount, hideVat }: { draft: boolean; showDiscount?: boolean; hideVat?: boolean }): Promise<Blob> => {
    const qc = quotationFormSlice;
    const customerLabel =
      (await resolveQuotationCustomerLabelForPdf({
        potentialCustomerId: qc.potentialCustomerId,
        erpCustomerCode: qc.erpCustomerCode,
        customerFromApi: selectedCustomer,
        customerOptions,
      })) || t('pdfExportTemplate.notSpecified');

    const labels: QuotationPreviewPdfLabels = {
      documentTitle: t('pdfExportTemplate.documentTitle'),
      senderLabel: t('pdfExportTemplate.senderLabel'),
      recipientLabel: t('pdfExportTemplate.recipientLabel'),
      metaDate: t('pdfExportTemplate.metaDate'),
      metaOfferNo: t('pdfExportTemplate.metaOfferNo'),
      notSpecified: t('pdfExportTemplate.notSpecified'),
      lineImage: t('pdfExportTemplate.lineImage'),
      productCode: t('lines.productCode'),
      productName: t('lines.productName'),
      quantity: t('lines.quantity'),
      unitPrice: t('lines.unitPrice'),
      unitPriceNet: t('pdfExportTemplate.unitPriceNet'),
      netUnitPriceColumn: t('pdfExportTemplate.netUnitPriceColumn'),
      lineDiscount: t('pdfExportTemplate.lineDiscount'),
      vatRate: t('pdfExportTemplate.vatRate'),
      lineTotal: t('lines.total'),
      priceDetail: t('pdfExportTemplate.priceDetail'),
      grossTotal: t('pdfExportTemplate.grossTotal'),
      lineDiscountTotal: t('pdfExportTemplate.lineDiscountTotal'),
      generalDiscount: t('pdfExportTemplate.generalDiscount'),
      netSubtotal: t('pdfExportTemplate.netSubtotal'),
      totalVat: t('pdfExportTemplate.totalVat'),
      grandTotalWithVat: t('pdfExportTemplate.grandTotalWithVat'),
      validityNote: t('pdfExportTemplate.validityNote'),
      draftWatermark: t('pdfExportTemplate.draftWatermark', { defaultValue: 'TASLAKTIR' }),
    };

    const koliBaskiId = qc.koliBaskiDefinitionId ?? null;
    const koliBaskiName =
      koliBaskiId != null && koliBaskiId > 0 ? koliBaskiMap[koliBaskiId] ?? null : null;
    const paymentTypeName = resolvePreviewPdfPaymentTypeName(
      qc.paymentTypeId ?? null,
      null,
      paymentTypes,
    );
    const footerDetails = buildPreviewPdfDocumentFooterDetails(
      {
        koliBaskiName,
        paymentTypeName,
        description: qc.description ?? null,
        quotationNotes,
        shippingAddressText: resolvePreviewPdfShippingAddressText({
          shippingAddressId: qc.shippingAddressId ?? null,
          shippingAddresses,
        }),
      },
      buildPreviewPdfDocumentFooterLabels(t),
    );
    const lineDetailLabels = buildPreviewPdfLineDetailLabels(t);
    const lineDiscountLabels = buildPreviewPdfLineDiscountLabels(t);

    return buildQuotationPreviewPdfBlob({
      lines,
      currencyCode,
      locale: i18n.language,
      offerDate: qc.offerDate,
      offerNo: qc.offerNo,
      customerName: customerLabel,
      branchName: branch?.name?.trim() || t('pdfExportTemplate.notSpecified'),
      branchCode: branch?.code?.trim() || null,
      generalDiscountRate: qc.generalDiscountRate,
      generalDiscountAmount: qc.generalDiscountAmount,
      labels,
      footerDetails,
      lineDetailLabels,
      lineDetailMaps: { profilMap, demirMap, vidaMap, baskiMap },
      lineDiscountLabels,
      showDiscount: showDiscount ?? defaultShowDiscountDetails,
      draft,
      hideVat: hideVat ?? false,
    });
  }, [
    lines,
    currencyCode,
    t,
    i18n.language,
    quotationFormSlice,
    customerOptions,
    selectedCustomer,
    branch,
    quotationNotes,
    koliBaskiMap,
    paymentTypes,
    shippingAddresses,
    profilMap,
    demirMap,
    vidaMap,
    baskiMap,
    defaultShowDiscountDetails,
  ]);

  const openPdfExportPreview = (): void => {
    if (lines.length === 0) {
      toast.error(t('create.error'), {
        description: t('lines.required'),
      });
      return;
    }
    setPdfExportOpen(true);
  };

  const shareFileName = t('exportPreview.downloadFileName');

  const nativeShareLabels = useMemo(
    () => ({
      phoneRequired: t('shareWhatsappDialog.phoneRequired'),
      emailRequired: t('share.nativeEmailRequired'),
      emailInvalid: t('share.nativeEmailInvalid'),
      shareOpened: t('share.nativeOpened'),
      whatsappFallback: t('share.nativeWhatsappFallback'),
      mailFallback: t('share.nativeMailFallback'),
      mailSentApi: t('share.nativeMailSentApi'),
      mailSendFailed: t('share.nativeMailSendFailed'),
      shareFailed: t('exportPreview.error'),
      shareCancelled: t('cancel'),
    }),
    [t],
  );

  const { openWhatsappPrep, openMailPrep, prepDialog } = useQuotationNativeSharePrep({
    labels: nativeShareLabels,
  });

  const mailShareContext = useMemo<QuotationMailShareContext | null>(() => {
    if (!isIntegratedQuotationShare) return null;
    if (!pendingSharePdfBlob && !mailProviderPickerOpen && !googleMailOpen && !outlookMailOpen) {
      return null;
    }

    const qc = quotationFormSlice;
    return {
      recordId: 0,
      customerId: qc.potentialCustomerId,
      customerName: selectedCustomer?.name ?? null,
      customerCode: qc.erpCustomerCode,
      recordNo: qc.offerNo,
      attachmentFile: pendingSharePdfBlob ? blobToFile(pendingSharePdfBlob, shareFileName) : null,
      autoAttachPdfOnOpen: false,
    };
  }, [
    pendingSharePdfBlob,
    mailProviderPickerOpen,
    googleMailOpen,
    outlookMailOpen,
    quotationFormSlice,
    selectedCustomer?.name,
    shareFileName,
  ]);

  const handleModalShareWhatsapp = (pdfBlob: Blob): void => {
    if (!watchedCustomerId || watchedCustomerId <= 0) {
      toast.error(t('shareWhatsappDialog.customerRequired'));
      return;
    }

    if (isIntegratedQuotationShare) {
      setPendingSharePdfBlob(pdfBlob);
      setWhatsappShareOpen(true);
      return;
    }

    openWhatsappPrep({
      pdfBlob,
      fileName: shareFileName,
      customerId: watchedCustomerId,
      customerPhone: selectedCustomer?.phone,
      customerPhone2: selectedCustomer?.phone2,
      message: t('share.whatsappMessage'),
    });
  };

  const handleModalShareMail = (pdfBlob: Blob): void => {
    if (!watchedCustomerId || watchedCustomerId <= 0) {
      toast.error(t('shareMailDialog.customerRequired'));
      return;
    }

    if (isIntegratedQuotationShare) {
      setPendingSharePdfBlob(pdfBlob);
      setMailProviderPickerOpen(true);
      return;
    }

    openMailPrep({
      pdfBlob,
      fileName: shareFileName,
      customerId: watchedCustomerId,
      recordId: 0,
      customerEmail: selectedCustomer?.email,
      subject: t('share.mailSubject'),
      body: t('share.mailBody'),
    });
  };

  const handleFormSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const formData = form.getValues();

    const isValid = await form.trigger();
    if (!isValid) {
      toast.error(t('create.error'), {
        description: t('create.validationError'),
      });
      return;
    }

    await onSubmit(formData);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto relative pb-10 px-4 md:px-6">
      <FormProvider {...form}>
        <SalesDocumentDraftRestoreDialog
          open={salesDraft.restoreDialogOpen}
          documentName={t('salesDraft.documentNames.quotation', {
            ns: 'common',
            defaultValue: 'teklif',
          })}
          updatedAt={salesDraft.pendingDraft?.updatedAt}
          onRestore={salesDraft.restoreDraft}
          onDiscard={salesDraft.discardDraft}
        />
        <form onSubmit={handleFormSubmit} className="space-y-0">

          <DocumentCreatePageHeader
            title={t('create.pageTitle')}
            description={t('create.pageDescription')}
            onBack={() => navigate(-1)}
            backLabel={t('back', { ns: 'common' })}
            helpTitle={t('create.helpTitle')}
            helpTriggerLabel={t('create.helpTriggerLabel')}
            helpSteps={[
              t('create.helpStep1'),
              t('create.helpStep2'),
              t('create.helpStep3'),
              t('create.helpStep4'),
            ]}
          />

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8 xl:gap-10 items-start mt-6">
            {/* SOL KISIM */}
            <div className="flex flex-col gap-6 min-w-0 h-fit">

              {/* --- 1. Bölüm: Teklif Bilgileri --- */}
              <section aria-label={t('sections.header')}>
                <div className={CREATE_SECTION_CARD_CLASSNAME}>
                  {/* Başlık Alanı */}
                  <div className={CREATE_SECTION_HEADER_CLASSNAME}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-bold shadow-sm">
                      1
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                        {t('sections.header')}
                      </h3>
                    </div>
                  </div>

                  {/* Form İçeriği */}
                  <div className={`border-t border-slate-300/75 bg-white/88 p-5 dark:border-white/8 dark:bg-[#130d21]/52 ${CREATE_HEADER_FORM_SURFACE_CLASSNAME}`}>
                    <QuotationHeaderForm
                      exchangeRates={exchangeRates}
                      onExchangeRatesChange={setExchangeRates}
                      onApplyExchangeRateChangeToLines={handleApplyExchangeRateChangeToLines}
                      quotationNotes={quotationNotes}
                      onQuotationNotesChange={setQuotationNotes}
                      lines={lines}
                      onCurrencyChange={handleExplicitCurrencyChange}
                      onLinesChange={async () => {
                        const newCurrency = form.getValues('quotation.currency');
                        if (newCurrency) {
                          await handleCurrencyChange(newCurrency);
                        }
                      }}
                    />
                  </div>
                </div>
              </section>

              {/* --- 2. Bölüm: Teklif Satırları --- */}
              <section aria-label={t('sections.lines')}>
                <div className={CREATE_SECTION_CARD_CLASSNAME}>
                  <div className={CREATE_SECTION_HEADER_CLASSNAME}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-bold shadow-sm">
                      2
                    </div>
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                        {t('sections.lines')}
                      </h3>
                    </div>
                  </div>
                  <div className="w-full overflow-x-auto p-0">
                    <QuotationLineTable
                      lines={lines}
                      setLines={setLines}
                      currency={watchedCurrency}
                      exchangeRates={exchangeRates}
                      pricingRules={pricingRules}
                      userDiscountLimits={temporarySallerData}
                      customerId={watchedCustomerId}
                      erpCustomerCode={watchedErpCustomerCode}
                      representativeId={watchedRepresentativeId}
                      offerType={form.watch('quotation.offerType')}
                      offerNo={form.watch('quotation.offerNo')}
                      customerName={customerOptions.find((c) => c.id === watchedCustomerId)?.name ?? null}
                      buildExportPdfBlob={buildExportPdfBlob}
                      exportPdfFileName={shareFileName}
                      exportPdfAsDraft
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* SAĞ KISIM: Özet */}
            <aside className="xl:sticky xl:top-6 w-full">
              <div className={CREATE_SECTION_CARD_CLASSNAME}>
                <div className={CREATE_SECTION_HEADER_CLASSNAME}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-sm">
                    3
                  </div>
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                      {t('sections.summary')}
                    </h3>
                  </div>
                </div>

                <div>
                  <QuotationSummaryCard lines={lines} currency={watchedCurrency} />
                </div>
              </div>
            </aside>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-8 mt-8 border-t border-zinc-200 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="group w-full sm:w-auto"
            >
              <X className="mr-2 h-4 w-4" />
              {t('cancel')}
            </Button>

            <Button
              type="button"
              onClick={openPdfExportPreview}
              className={`group ${DOCUMENT_DETAIL_BUTTON_BASE} ${DOCUMENT_DETAIL_BUTTON_PREVIEW}`}
            >
              <Eye className="mr-2 h-4 w-4" />
              {t('exportPreview.trigger')}
            </Button>

            <FormSubmitTooltipWrap
              schema={createQuotationSchema}
              value={quotationSchemaPayload}
              isValid={isFormValid}
              isPending={createMutation.isPending}
              manualHintLines={saveManualHintLines}
            >
              <Button
                type="submit"
                disabled={createMutation.isPending || !isFormValid}
                className={`group sm:min-w-[140px] ${DOCUMENT_DETAIL_BUTTON_BASE} ${DOCUMENT_DETAIL_BUTTON_SAVE}`}
              >
                <Save className="mr-2 h-4 w-4" />
                {createMutation.isPending
                  ? t('saving')
                  : t('save')
                }
              </Button>
            </FormSubmitTooltipWrap>
          </div>
        </form>
      </FormProvider>

      <QuotationPdfExportPreviewDialog
        open={pdfExportOpen}
        onOpenChange={setPdfExportOpen}
        buildPdfBlob={buildExportPdfBlob}
        asDraft
        hasLineDiscounts={defaultShowDiscountDetails}
        fileName={t('exportPreview.downloadFileName')}
        labels={{
          title: t('exportPreview.title'),
          subtitle: t('exportPreview.subtitle'),
          close: t('exportPreview.close'),
          loading: t('exportPreview.loading'),
          error: t('exportPreview.error'),
          download: t('exportPreview.download'),
          errorDismiss: t('exportPreview.errorDismiss'),
          shareWhatsapp: t('shareWhatsapp'),
          shareMail: t('shareMail'),
          showDiscount: t('exportPreview.showDiscount'),
          hideVat: t('exportPreview.hideVat'),
        }}
        onShareWhatsapp={handleModalShareWhatsapp}
        onShareMail={handleModalShareMail}
      />

      {prepDialog}

      {isIntegratedQuotationShare ? (
        <>
          <QuotationWhatsappSendDialog
            open={whatsappShareOpen}
            onOpenChange={setWhatsappShareOpen}
            pdfBlob={pendingSharePdfBlob}
            fileName={shareFileName}
            customerId={watchedCustomerId}
            customerName={selectedCustomer?.name}
            defaultPhone={resolveCustomerPhone(selectedCustomer?.phone, selectedCustomer?.phone2)}
            defaultMessage={t('share.whatsappMessage')}
          />

          <QuotationMailShareDialogs
            providerPickerOpen={mailProviderPickerOpen}
            onProviderPickerOpenChange={setMailProviderPickerOpen}
            googleMailOpen={googleMailOpen}
            onGoogleMailOpenChange={setGoogleMailOpen}
            outlookMailOpen={outlookMailOpen}
            onOutlookMailOpenChange={setOutlookMailOpen}
            shareContext={mailShareContext}
          />
        </>
      ) : null}
    </div>
  );
}
