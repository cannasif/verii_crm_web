import { type ReactElement, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useForm, FormProvider, useFormState } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCreateOrderBulk } from '../hooks/useCreateOrderBulk';
import { usePriceRuleOfOrder } from '../hooks/usePriceRuleOfOrder';
import { useUserDiscountLimitsBySalesperson } from '../hooks/useUserDiscountLimitsBySalesperson';
import { useCustomerOptions } from '@/features/customer-management/hooks/useCustomerOptions';
import { useCustomer } from '@/features/customer-management/hooks/useCustomer';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import { useOrderPdfExportPreview } from '../hooks/useOrderPdfExportPreview';
import { OrderHeaderForm } from './OrderHeaderForm';
import { OrderLineTable } from './OrderLineTable';
import { OrderSummaryCard } from './OrderSummaryCard';
import { Button } from '@/components/ui/button';
import { FormSubmitTooltipWrap } from '@/components/shared/FormSubmitTooltipWrap';
import { buildHeaderSaveRequiredHintLines } from '@/lib/header-save-required-hints';
import { Save, X, Eye, FileText, Layers, Calculator } from 'lucide-react';
import { DocumentCreatePageHeader } from '@/components/shared/DocumentCreatePageHeader';
import { createOrderSchema, type CreateOrderSchema } from '../schemas/order-schema';
import type { OrderLineFormState, OrderExchangeRateFormState, OrderBulkCreateDto, CreateOrderDto, PricingRuleLineGetDto, UserDiscountLimitDto } from '../types/order-types';
import { DEFAULT_OFFER_TYPE, normalizeOfferType } from '@/types/offer-type';
import { createEmptyQuotationNotes } from '@/features/quotation/components/QuotationNotesDialog';
import type { QuotationNotesDto } from '@/features/quotation/types/quotation-types';
import { orderNotesDtoToNotesList } from '../utils/notes-mapper';
import { orderApi } from '../api/order-api';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { SalesDocumentDraftRestoreDialog } from '@/features/sales-drafts/SalesDocumentDraftRestoreDialog';
import { useSalesDocumentDraft } from '@/features/sales-drafts/useSalesDocumentDraft';
import { useOrderCalculations } from '../hooks/useOrderCalculations';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import { buildEffectiveExchangeRates } from '@/features/sales-documents/utils/exchange-rate-snapshot';
import { applyExchangeRateChangeToLines } from '@/features/sales-documents/utils/apply-exchange-rate-to-lines';
import { findExchangeRateByDovizTipi } from '../utils/price-conversion';
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
  '[&_label]:text-slate-800 dark:[&_label]:text-slate-200 [&_input]:border-slate-500/70 [&_input]:bg-white [&_input]:shadow-sm [&_input]:placeholder:text-slate-400 [&_input]:focus-visible:border-pink-500/85 [&_input]:focus-visible:ring-pink-200/70 dark:[&_input]:border-white/20 dark:[&_input]:bg-[#120d1d] dark:[&_input]:placeholder:text-slate-500 dark:[&_input]:focus-visible:border-pink-400/60 dark:[&_input]:focus-visible:ring-pink-400/20 [&_textarea]:border-slate-500/70 [&_textarea]:bg-white [&_textarea]:shadow-sm [&_textarea]:placeholder:text-slate-400 [&_textarea]:focus-visible:border-pink-500/85 [&_textarea]:focus-visible:ring-pink-200/70 dark:[&_textarea]:border-white/20 dark:[&_textarea]:bg-[#120d1d] dark:[&_textarea]:placeholder:text-slate-500 dark:[&_textarea]:focus-visible:border-pink-400/60 dark:[&_textarea]:focus-visible:ring-pink-400/20 [&_[data-slot=select-trigger]]:border-slate-500/70 [&_[data-slot=select-trigger]]:bg-white [&_[data-slot=select-trigger]]:shadow-sm dark:[&_[data-slot=select-trigger]]:border-white/20 dark:[&_[data-slot=select-trigger]]:bg-[#120d1d]';

function addDaysToDateOnly(dateValue: string, days: number): string {
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function extractOrderCreateErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(error.message) as {
      errors?: string[] | Record<string, string[]>;
      message?: string;
    };

    if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
      return parsed.errors[0];
    }

    if (parsed.errors && typeof parsed.errors === 'object') {
      const firstEntry = Object.values(parsed.errors).find(
        (value): value is string[] => Array.isArray(value) && value.length > 0,
      );
      if (firstEntry) {
        return firstEntry[0];
      }
    }

    if (parsed.message) {
      return parsed.message;
    }
  } catch {
    return error.message;
  }

  return error.message || fallback;
}

interface OrderPrefillCustomerState {
  prefillCustomer?: {
    potentialCustomerId?: number | null;
    erpCustomerCode?: string | null;
    customerName?: string | null;
  };
}

export function OrderCreateForm(): ReactElement {
  const { t } = useTranslation(['order', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const { setPageTitle } = useUIStore();
  const user = useAuthStore((state) => state.user);
  const branch = useAuthStore((state) => state.branch);

  const [lines, setLines] = useState<OrderLineFormState[]>([]);
  const [exchangeRates, setExchangeRates] = useState<OrderExchangeRateFormState[]>([]);
  const [quotationNotes, setQuotationNotes] = useState<QuotationNotesDto>(createEmptyQuotationNotes);
  const [pricingRules, setPricingRules] = useState<PricingRuleLineGetDto[]>([]);
  const [temporarySallerData, setTemporarySallerData] = useState<UserDiscountLimitDto[]>([]);

  const createMutation = useCreateOrderBulk();

  useEffect(() => {
    setPageTitle(null);
    return () => {
      setPageTitle(null);
    };
  }, [setPageTitle]);

  const form = useForm<CreateOrderSchema>({
    resolver: zodResolver(createOrderSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      order: {
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

  const prefillAppliedRef = useRef(false);
  useEffect(() => {
    if (prefillAppliedRef.current) return;
    const prefill = (location.state as OrderPrefillCustomerState | null)?.prefillCustomer;
    if (!prefill) return;
    prefillAppliedRef.current = true;
    if (prefill.potentialCustomerId && prefill.potentialCustomerId > 0) {
      form.setValue('order.potentialCustomerId', prefill.potentialCustomerId, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    if (prefill.erpCustomerCode) {
      form.setValue('order.erpCustomerCode', prefill.erpCustomerCode, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [location.state, form]);

  const watchedCurrencyRaw = form.watch('order.currency');
  const watchedCurrency =
    watchedCurrencyRaw === '' || watchedCurrencyRaw === null || watchedCurrencyRaw === undefined
      ? Number.NaN
      : Number(watchedCurrencyRaw);
  const watchedCustomerId = form.watch('order.potentialCustomerId');
  const watchedErpCustomerCode = form.watch('order.erpCustomerCode');
  const watchedRepresentativeId = form.watch('order.representativeId');
  const watchedOfferDate = form.watch('order.offerDate');
  const orderFormSlice = form.watch('order');
  const orderDraftFormValues = form.watch();
  const orderSchemaPayload = useMemo(() => ({ order: orderFormSlice }), [orderFormSlice]);
  const salesDraft = useSalesDocumentDraft({
    documentType: 'order',
    rootKey: 'order',
    userId: user?.id,
    branchCode: branch?.code ?? branch?.id,
    form,
    formValues: orderDraftFormValues,
    lines,
    exchangeRates,
    notes: quotationNotes,
    setLines,
    setExchangeRates,
    setNotes: setQuotationNotes,
    createDefaultNotes: createEmptyQuotationNotes,
    enabled: !createMutation.isPending,
  });

  const saveManualHintLines = useMemo(
    () =>
      buildHeaderSaveRequiredHintLines(orderFormSlice, (key) => t(key, { ns: 'common' }), watchedCurrency),
    [orderFormSlice, watchedCurrency, t],
  );
  const { data: customerOptions = [] } = useCustomerOptions(watchedRepresentativeId);
  const { data: selectedCustomer } = useCustomer(
    watchedCustomerId ?? 0,
    Boolean(watchedCustomerId && watchedCustomerId > 0),
  );
  const { currencyOptions } = useCurrencyOptions();
  const offerDateSyncInitializedRef = useRef(false);

  const currencyCode = useMemo(() => {
    const found = currencyOptions.find((opt) => opt.dovizTipi === watchedCurrency);
    return found?.code || 'TRY';
  }, [watchedCurrency, currencyOptions]);

  const pdfExport = useOrderPdfExportPreview({
    lines,
    orderFormSlice,
    currencyCode,
    customerOptions,
    selectedCustomer,
  });

  useEffect(() => {
    if (!watchedOfferDate) return;
    if (!offerDateSyncInitializedRef.current) {
      offerDateSyncInitializedRef.current = true;
      return;
    }
    const nextDeliveryDate = addDaysToDateOnly(watchedOfferDate, 21);
    if (form.getValues('order.deliveryDate') !== nextDeliveryDate) {
      form.setValue('order.deliveryDate', nextDeliveryDate, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [watchedOfferDate, form]);

  const { calculateLineTotals } = useOrderCalculations();

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

  const { data: pricingRulesData } = usePriceRuleOfOrder(
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

  const onSubmit = async (data: CreateOrderSchema): Promise<void> => {
    if (lines.length === 0) {
      toast.error(t('create.error'), {
        description: t('lines.required'),
      });
      return;
    }

    const noteKeys = ['note1', 'note2', 'note3', 'note4', 'note5', 'note6', 'note7', 'note8', 'note9', 'note10', 'note11', 'note12', 'note13', 'note14', 'note15'] as const;
    const overLimitNote = noteKeys.find((k) => (quotationNotes[k]?.length ?? 0) > 400);
    if (overLimitNote) {
      toast.error(t('create.error'), {
        description: t('create.notesMaxLengthError'),
      });
      return;
    }

    try {
      const linesToSend = lines.map((line) => {
        const { id, isEditing, ...lineData } = line;
        const { relatedLines, ...cleanLineData } = lineData as OrderLineFormState & { relatedLines?: unknown[] };

        return {
          ...cleanLineData,
          orderId: 0,
          productId:
            cleanLineData.productId != null && cleanLineData.productId > 0
              ? cleanLineData.productId
              : null,
          description: cleanLineData.description || null,
          description1: cleanLineData.description1 || null,
          description2: cleanLineData.description2 || null,
          description3: cleanLineData.description3 || null,
          baskiAciklama: cleanLineData.baskiAciklama?.trim() || null,
          pricingRuleHeaderId: cleanLineData.pricingRuleHeaderId && cleanLineData.pricingRuleHeaderId > 0 ? cleanLineData.pricingRuleHeaderId : null,
          projectCode: cleanLineData.projectCode || null,
          relatedStockId: cleanLineData.relatedStockId && cleanLineData.relatedStockId > 0 ? cleanLineData.relatedStockId : null,
          erpProjectCode: cleanLineData.projectCode ?? null,
        };
      });

      const currencyValue = typeof data.order.currency === 'string'
        ? data.order.currency
        : String(data.order.currency);

      const effectiveExchangeRates = buildEffectiveExchangeRates(
        exchangeRates,
        erpRates,
        currencyValue,
        data.order.offerDate || null,
      );

      const exchangeRatesToSend = effectiveExchangeRates.length > 0
        ? effectiveExchangeRates.map(({ id, dovizTipi, ...rate }) => {
          const currencyValue = rate.currency || (dovizTipi != null ? String(dovizTipi) : '');
          return {
            ...rate,
            currency: currencyValue,
            orderId: 0,
            isOfficial: rate.isOfficial ?? true,
          };
        })
        : [];

      if (currencyValue == null || currencyValue === '' || Number.isNaN(Number(currencyValue))) {
        throw new Error(t('create.invalidCurrency'));
      }

      const orderData: CreateOrderDto = {
        offerType: normalizeOfferType(data.order.offerType),
        currency: currencyValue,
        potentialCustomerId: (data.order.potentialCustomerId && data.order.potentialCustomerId > 0) ? data.order.potentialCustomerId : null,
        erpCustomerCode: data.order.erpCustomerCode || null,
        deliveryDate: data.order.deliveryDate || null,
        shippingAddressId: (data.order.shippingAddressId && data.order.shippingAddressId > 0) ? data.order.shippingAddressId : null,
        representativeId: (data.order.representativeId && data.order.representativeId > 0) ? data.order.representativeId : null,
        activityId: (data.order.activityId && data.order.activityId > 0) ? data.order.activityId : null,
        projectCode: data.order.projectCode || null,
        ozelKod1: data.order.ozelKod1 || null,
        ozelKod2: data.order.ozelKod2 || null,
        status: (data.order.status && data.order.status > 0) ? data.order.status : null,
        description: data.order.description || null,
        paymentTypeId: (data.order.paymentTypeId && data.order.paymentTypeId > 0) ? data.order.paymentTypeId : null,
        documentSerialTypeId: (data.order.documentSerialTypeId && data.order.documentSerialTypeId > 0) ? data.order.documentSerialTypeId : null,
        offerDate: data.order.offerDate || null,
        offerNo: data.order.offerNo || null,
        revisionNo: data.order.revisionNo || null,
        revisionId: (data.order.revisionId && data.order.revisionId > 0) ? data.order.revisionId : null,
        generalDiscountRate: data.order.generalDiscountRate ?? null,
        generalDiscountAmount: data.order.generalDiscountAmount ?? null,
        salesTypeDefinitionId: data.order.deliveryMethod ? Number(data.order.deliveryMethod) : null,
        koliBaskiDefinitionId: (data.order.koliBaskiDefinitionId && data.order.koliBaskiDefinitionId > 0) ? data.order.koliBaskiDefinitionId : null,
        erpProjectCode: data.order.projectCode ?? null,
      };

      const payload: OrderBulkCreateDto = {
        order: orderData,
        lines: linesToSend,
        exchangeRates: exchangeRatesToSend,
      };

      const result = await createMutation.mutateAsync(payload);

      if (result.success && result.data) {
        const notesList = orderNotesDtoToNotesList(quotationNotes);
        if (notesList.length > 0) {
          await orderApi.updateNotesListByOrderId(result.data.id, { notes: notesList });
        }
        toast.success(t('create.success'), {
          description: t('create.successMessage'),
        });
        await salesDraft.clearDraft();
        navigate(`/orders/${result.data.id}`);
      } else {
        throw new Error(result.message || t('create.errorMessage'));
      }
    } catch (error: unknown) {
      const errorMessage = extractOrderCreateErrorMessage(error, t('create.errorMessage'));
      toast.error(t('create.error'), {
        description: errorMessage,
        duration: 10000,
      });
    }
  };

  const handleCurrencyChange = async (newCurrency: string): Promise<void> => {
    if (lines.length === 0) return;

    const oldCurrency = watchedCurrency;
    const newCurrencyNum = Number(newCurrency);

    if (oldCurrency === newCurrencyNum) return;

    const sampleOldRate = findExchangeRateByDovizTipi(oldCurrency, exchangeRates, erpRates);
    const sampleNewRate = findExchangeRateByDovizTipi(newCurrencyNum, exchangeRates, erpRates);

    if (!sampleOldRate || sampleOldRate <= 0 || !sampleNewRate || sampleNewRate <= 0) {
      toast.error(t('update.error'), {
        description: t('exchangeRates.zeroRateError', {
          defaultValue: 'Lutfen devam edebilmek icin kur degeri girin.',
        }),
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

  const handleFormSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    const isValid = await form.trigger();
    if (!isValid) {
      toast.error(t('create.error'), {
        description: t('create.validationError'),
      });
      return;
    }

    await onSubmit(form.getValues());
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto relative pb-10 px-4 md:px-6">
      <FormProvider {...form}>
        <SalesDocumentDraftRestoreDialog
          open={salesDraft.restoreDialogOpen}
          documentName={t('salesDraft.documentNames.order', {
            ns: 'common',
            defaultValue: 'sipariş',
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
            {/* Left Content Column */}
            <div className="flex flex-col gap-6 min-w-0 h-fit">

              {/* Section 1: Order Information */}
              <section aria-label={t('sections.header')}>
                <div className={CREATE_SECTION_CARD_CLASSNAME}>
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

                  <div className={`border-t border-slate-300/75 bg-white/88 p-5 dark:border-white/8 dark:bg-[#130d21]/52 ${CREATE_HEADER_FORM_SURFACE_CLASSNAME}`}>
                    <OrderHeaderForm
                      exchangeRates={exchangeRates}
                      onExchangeRatesChange={setExchangeRates}
                      onApplyExchangeRateChangeToLines={handleApplyExchangeRateChangeToLines}
                      quotationNotes={quotationNotes}
                      onQuotationNotesChange={setQuotationNotes}
                      lines={lines}
                      onCurrencyChange={async (_oldCurrency, newCurrency) => {
                        await handleCurrencyChange(String(newCurrency));
                      }}
                      onLinesChange={async () => {
                        const newCurrency = form.getValues('order.currency');
                        if (newCurrency) {
                          await handleCurrencyChange(newCurrency);
                        }
                      }}
                    />
                  </div>
                </div>
              </section>

              {/* Section 2: Order Lines */}
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
                    <OrderLineTable
                      lines={lines}
                      setLines={setLines}
                      currency={watchedCurrency}
                      exchangeRates={exchangeRates}
                      pricingRules={pricingRules}
                      userDiscountLimits={temporarySallerData}
                      customerId={watchedCustomerId}
                      erpCustomerCode={watchedErpCustomerCode}
                      representativeId={watchedRepresentativeId}
                      offerType={form.watch('order.offerType')}
                      buildExportPdfBlob={pdfExport.buildExportPdfBlob}
                      exportPdfFileName={pdfExport.shareFileName}
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* Sidebar Sticky Column */}
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
                  <OrderSummaryCard lines={lines} currency={watchedCurrency} />
                </div>
              </div>
            </aside>
          </div>

          {/* Action Buttons */}
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
              onClick={pdfExport.openPdfExportPreview}
              className={`group ${DOCUMENT_DETAIL_BUTTON_BASE} ${DOCUMENT_DETAIL_BUTTON_PREVIEW}`}
            >
              <Eye className="mr-2 h-4 w-4" />
              {t('exportPreview.trigger')}
            </Button>

            <FormSubmitTooltipWrap
              schema={createOrderSchema}
              value={orderSchemaPayload}
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

      {pdfExport.renderPdfExportDialogs()}
    </div>
  );
}
