import { type ReactElement, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useForm, FormProvider, useFormState } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCreateDemandBulk } from '../hooks/useCreateDemandBulk';
import { usePriceRuleOfDemand } from '../hooks/usePriceRuleOfDemand';
import { useUserDiscountLimitsBySalesperson } from '../hooks/useUserDiscountLimitsBySalesperson';
import { useCustomerOptions } from '@/features/customer-management/hooks/useCustomerOptions';
import { DemandHeaderForm } from './DemandHeaderForm';
import { DemandLineTable } from './DemandLineTable';
import { DemandSummaryCard } from './DemandSummaryCard';
import { Button } from '@/components/ui/button';
import { FormSubmitTooltipWrap } from '@/components/shared/FormSubmitTooltipWrap';
import { useHeaderSaveTooltipState } from '@/lib/header-save-required-hints';
import { Save, X, FileText, Layers, Calculator, Eye } from 'lucide-react';
import { DocumentCreatePageHeader } from '@/components/shared/DocumentCreatePageHeader';
import { createDemandSchema, type CreateDemandSchema } from '../schemas/demand-schema';
import type { DemandLineFormState, DemandExchangeRateFormState, DemandBulkCreateDto, CreateDemandDto, PricingRuleLineGetDto, UserDiscountLimitDto } from '../types/demand-types';
import { DEFAULT_OFFER_TYPE, normalizeOfferType } from '@/types/offer-type';
import { createEmptyQuotationNotes } from '@/features/quotation/components/QuotationNotesDialog';
import type { QuotationNotesDto } from '@/features/quotation/types/quotation-types';
import { demandNotesDtoToNotesList } from '../utils/notes-mapper';
import { demandApi } from '../api/demand-api';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { SalesDocumentDraftRestoreDialog } from '@/features/sales-drafts/SalesDocumentDraftRestoreDialog';
import { useSalesDocumentDraft } from '@/features/sales-drafts/useSalesDocumentDraft';
import { useDemandCalculations } from '../hooks/useDemandCalculations';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import { useCustomer } from '@/features/customer-management/hooks/useCustomer';
import { useDemandPdfExportPreview } from '../hooks/useDemandPdfExportPreview';
import { recordCustomerDocumentSerialUsageSafely } from '@/features/document-serial-type-management/utils/customer-document-serial-usage';
import { CustomerDocumentSerialDocumentKind } from '@/features/document-serial-type-management/types/document-serial-type-types';
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
  '[&_label]:text-slate-800 dark:[&_label]:text-slate-200 [&_input]:border-slate-500/70 [&_input]:bg-white [&_input]:shadow-sm [&_input]:placeholder:text-slate-400 [&_input]:focus-visible:border-primary/85 [&_input]:focus-visible:ring-primary/20 dark:[&_input]:border-white/20 dark:[&_input]:bg-[#120d1d] dark:[&_input]:placeholder:text-slate-500 dark:[&_input]:focus-visible:border-primary/50 dark:[&_input]:focus-visible:ring-primary/20 [&_textarea]:border-slate-500/70 [&_textarea]:bg-white [&_textarea]:shadow-sm [&_textarea]:placeholder:text-slate-400 [&_textarea]:focus-visible:border-primary/85 [&_textarea]:focus-visible:ring-primary/20 dark:[&_textarea]:border-white/20 dark:[&_textarea]:bg-[#120d1d] dark:[&_textarea]:placeholder:text-slate-500 dark:[&_textarea]:focus-visible:border-primary/50 dark:[&_textarea]:focus-visible:ring-primary/20 [&_[data-slot=select-trigger]]:border-slate-500/70 [&_[data-slot=select-trigger]]:bg-white [&_[data-slot=select-trigger]]:shadow-sm dark:[&_[data-slot=select-trigger]]:border-white/20 dark:[&_[data-slot=select-trigger]]:bg-[#120d1d]';

function addDaysToDateOnly(dateValue: string, days: number): string {
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export function DemandCreateForm(): ReactElement {
  const { t } = useTranslation('demand');

  const navigate = useNavigate();
  const { setPageTitle } = useUIStore();
  const user = useAuthStore((state) => state.user);
  const branch = useAuthStore((state) => state.branch);

  const [lines, setLines] = useState<DemandLineFormState[]>([]);
  const [exchangeRates, setExchangeRates] = useState<DemandExchangeRateFormState[]>([]);
  const [quotationNotes, setQuotationNotes] = useState<QuotationNotesDto>(createEmptyQuotationNotes);
  const [pricingRules, setPricingRules] = useState<PricingRuleLineGetDto[]>([]);
  const [temporarySallerData, setTemporarySallerData] = useState<UserDiscountLimitDto[]>([]);

  const createMutation = useCreateDemandBulk();

  useEffect(() => {
    setPageTitle(null);
    return () => {
      setPageTitle(null);
    };
  }, [setPageTitle]);

  const form = useForm<CreateDemandSchema>({
    resolver: zodResolver(createDemandSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      demand: {
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
  const watchedCurrencyRaw = form.watch('demand.currency');
  const watchedCurrency =
    watchedCurrencyRaw === '' || watchedCurrencyRaw === null || watchedCurrencyRaw === undefined
      ? Number.NaN
      : Number(watchedCurrencyRaw);
  const watchedCustomerId = form.watch('demand.potentialCustomerId');
  const watchedErpCustomerCode = form.watch('demand.erpCustomerCode');
  const watchedRepresentativeId = form.watch('demand.representativeId');
  const watchedOfferDate = form.watch('demand.offerDate');
  const { hintLines: saveManualHintLines, schemaPayload: demandSchemaPayload } = useHeaderSaveTooltipState(
    form.control,
    'demand',
    (key) => t(key, { ns: 'common' }),
  );
  const demandDraftFormValues = form.watch();
  const salesDraft = useSalesDocumentDraft({
    documentType: 'demand',
    rootKey: 'demand',
    userId: user?.id,
    branchCode: branch?.code ?? null,
    form,
    formValues: demandDraftFormValues,
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
    Boolean(watchedCustomerId && watchedCustomerId > 0),
  );
  const offerDateSyncInitializedRef = useRef(false);
  const demandFormSlice = form.watch('demand');
  const { currencyOptions } = useCurrencyOptions();
  const currencyCode = useMemo(() => {
    const found = currencyOptions.find((opt) => opt.dovizTipi === watchedCurrency);
    return found?.code || 'TRY';
  }, [watchedCurrency, currencyOptions]);

  const pdfExport = useDemandPdfExportPreview({
    lines,
    demandFormSlice,
    currencyCode,
    customerOptions,
    selectedCustomer,
    quotationNotes,
    asDraft: true,
  });

  useEffect(() => {
    if (!watchedOfferDate) return;
    if (!offerDateSyncInitializedRef.current) {
      offerDateSyncInitializedRef.current = true;
      return;
    }
    const nextDeliveryDate = addDaysToDateOnly(watchedOfferDate, 21);
    if (form.getValues('demand.deliveryDate') !== nextDeliveryDate) {
      form.setValue('demand.deliveryDate', nextDeliveryDate, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [watchedOfferDate, form]);

  const { calculateLineTotals } = useDemandCalculations();

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

  const { data: pricingRulesData } = usePriceRuleOfDemand(
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

  const onSubmit = async (data: CreateDemandSchema): Promise<void> => {
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
        const { relatedLines, ...cleanLineData } = lineData as DemandLineFormState & { relatedLines?: unknown[] };

        return {
          ...cleanLineData,
          demandId: 0,
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

      const currencyValue = typeof data.demand.currency === 'string'
        ? data.demand.currency
        : String(data.demand.currency);

      const effectiveExchangeRates = buildEffectiveExchangeRates(
        exchangeRates,
        erpRates,
        currencyValue,
        data.demand.offerDate || null,
      );

      const exchangeRatesToSend = effectiveExchangeRates.length > 0
        ? effectiveExchangeRates.map(({ id, dovizTipi, ...rate }) => {
          const currencyValue = rate.currency || (dovizTipi != null ? String(dovizTipi) : '');
          return {
            ...rate,
            currency: currencyValue,
            demandId: 0,
            isOfficial: rate.isOfficial ?? true,
          };
        })
        : [];

      if (currencyValue == null || currencyValue === '' || Number.isNaN(Number(currencyValue))) {
        throw new Error(t('create.invalidCurrency'));
      }

      const demandData: CreateDemandDto = {
        offerType: normalizeOfferType(data.demand.offerType),
        currency: currencyValue,
        potentialCustomerId: (data.demand.potentialCustomerId && data.demand.potentialCustomerId > 0) ? data.demand.potentialCustomerId : null,
        erpCustomerCode: data.demand.erpCustomerCode || null,
        deliveryDate: data.demand.deliveryDate || null,
        shippingAddressId: (data.demand.shippingAddressId && data.demand.shippingAddressId > 0) ? data.demand.shippingAddressId : null,
        representativeId: (data.demand.representativeId && data.demand.representativeId > 0) ? data.demand.representativeId : null,
        activityId: (data.demand.activityId && data.demand.activityId > 0) ? data.demand.activityId : null,
        projectCode: data.demand.projectCode || null,
        ozelKod1: data.demand.ozelKod1 || null,
        ozelKod2: data.demand.ozelKod2 || null,
        status: (data.demand.status && data.demand.status > 0) ? data.demand.status : null,
        description: data.demand.description || null,
        paymentTypeId: (data.demand.paymentTypeId && data.demand.paymentTypeId > 0) ? data.demand.paymentTypeId : null,
        documentSerialTypeId: (data.demand.documentSerialTypeId && data.demand.documentSerialTypeId > 0) ? data.demand.documentSerialTypeId : null,
        offerDate: data.demand.offerDate || null,
        offerNo: data.demand.offerNo || null,
        revisionNo: data.demand.revisionNo || null,
        revisionId: (data.demand.revisionId && data.demand.revisionId > 0) ? data.demand.revisionId : null,
        generalDiscountRate: data.demand.generalDiscountRate ?? null,
        generalDiscountAmount: data.demand.generalDiscountAmount ?? null,
        salesTypeDefinitionId: data.demand.deliveryMethod ? Number(data.demand.deliveryMethod) : null,
        koliBaskiDefinitionId: (data.demand.koliBaskiDefinitionId && data.demand.koliBaskiDefinitionId > 0) ? data.demand.koliBaskiDefinitionId : null,
        erpProjectCode: data.demand.projectCode ?? null,
      };

      const payload: DemandBulkCreateDto = {
        demand: demandData,
        lines: linesToSend,
        exchangeRates: exchangeRatesToSend,
      };

      const result = await createMutation.mutateAsync(payload);

      if (result.success && result.data) {
        const notesList = demandNotesDtoToNotesList(quotationNotes);
        if (notesList.length > 0) {
          await demandApi.updateNotesListByDemandId(result.data.id, { notes: notesList });
        }
        await recordCustomerDocumentSerialUsageSafely({
          customerId: demandData.potentialCustomerId,
          documentKind: CustomerDocumentSerialDocumentKind.Demand,
          documentSerialTypeId: demandData.documentSerialTypeId,
          documentId: result.data.id,
          documentNo: result.data.offerNo ?? demandData.offerNo,
          requestBranchCode: branch?.code ?? null,
        });
        toast.success(t('create.success'), {
          description: t('create.successMessage'),
        });
        await salesDraft.clearDraft();
        navigate(`/demands/${result.data.id}`);
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

  const handleCurrencyChange = async (newCurrency: string): Promise<void> => {
    if (lines.length === 0) return;

    const oldCurrency = watchedCurrency;
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
          documentName={t('salesDraft.documentNames.demand', {
            ns: 'common',
            defaultValue: 'talep',
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
            backLabel={t('back')}
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
            {/* SOL KISIM: h-fit ekli */}
            <div className="flex flex-col gap-6 min-w-0 h-fit">

              {/* --- 1. Bölüm: Talep Bilgileri --- */}
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
                    <DemandHeaderForm
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
                        const newCurrency = form.getValues('demand.currency');
                        if (newCurrency) {
                          await handleCurrencyChange(newCurrency);
                        }
                      }}
                    />
                  </div>
                </div>
              </section>

              {/* --- 2. Bölüm: Talep Satırları --- */}
              <section aria-label={t('lines.title')}>
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
                  {/* PADDING KALDIRILDI VE TABLE TAM OTURTULDU */}
                  <div className="w-full overflow-x-auto p-0">
                    <DemandLineTable
                      lines={lines}
                      setLines={setLines}
                      currency={watchedCurrency}
                      exchangeRates={exchangeRates}
                      pricingRules={pricingRules}
                      userDiscountLimits={temporarySallerData}
                      customerId={watchedCustomerId}
                      erpCustomerCode={watchedErpCustomerCode}
                      representativeId={watchedRepresentativeId}
                      offerType={form.watch('demand.offerType')}
                      buildExportPdfBlob={pdfExport.buildExportPdfBlob}
                      exportPdfFileName={pdfExport.shareFileName}
                      exportPdfAsDraft
                    />
                  </div>
                </div>
              </section>
            </div>

            <aside className="xl:sticky xl:top-6 w-full">
              {/* --- 3. Bölüm: Özet & Toplamlar --- */}
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
                  <DemandSummaryCard lines={lines} currency={watchedCurrency} />
                </div>
              </div>
            </aside>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-8 mt-8 border-t border-zinc-200 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="group w-full sm:w-auto h-11 px-6 rounded-xl border-zinc-200 dark:border-zinc-800 font-bold text-zinc-600 dark:text-zinc-300 hover:bg-accent hover:text-primary hover:border-primary/20 dark:hover:bg-primary/20 dark:hover:text-primary dark:hover:border-primary/50 transition-all duration-300"
            >
              <X className="mr-2 h-4 w-4 transition-colors" />
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
              schema={createDemandSchema}
              value={demandSchemaPayload}
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
