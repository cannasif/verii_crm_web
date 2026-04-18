import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
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
import { buildHeaderSaveRequiredHintLines } from '@/lib/header-save-required-hints';
import { ArrowLeft, Save, X, FileText, Layers, Calculator } from 'lucide-react';
import { createDemandSchema, type CreateDemandSchema } from '../schemas/demand-schema';
import type { DemandLineFormState, DemandExchangeRateFormState, DemandBulkCreateDto, CreateDemandDto, PricingRuleLineGetDto, UserDiscountLimitDto } from '../types/demand-types';
import { DEFAULT_OFFER_TYPE, normalizeOfferType } from '@/types/offer-type';
import { createEmptyQuotationNotes } from '@/features/quotation/components/QuotationNotesDialog';
import type { QuotationNotesDto } from '@/features/quotation/types/quotation-types';
import { demandNotesDtoToNotesList } from '../utils/notes-mapper';
import { demandApi } from '../api/demand-api';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { useDemandCalculations } from '../hooks/useDemandCalculations';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import { findExchangeRateByDovizTipi } from '../utils/price-conversion';

const CREATE_SECTION_CARD_CLASSNAME =
  'rounded-2xl overflow-hidden border border-slate-400 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_28px_-22px_rgba(15,23,42,0.40)] ring-1 ring-slate-300/70 dark:border-white/16 dark:bg-[#120b1d]/82 dark:ring-white/12';
const CREATE_SECTION_HEADER_CLASSNAME =
  'px-5 py-4 flex items-center gap-3 border-b border-slate-400/75 bg-slate-100/85 dark:border-white/12 dark:bg-white/[0.07]';
const CREATE_HEADER_FORM_SURFACE_CLASSNAME =
  '[&_label]:text-slate-800 dark:[&_label]:text-slate-200 [&_input]:border-slate-500/70 [&_input]:bg-white [&_input]:shadow-sm [&_input]:placeholder:text-slate-400 [&_input]:focus-visible:border-pink-500/85 [&_input]:focus-visible:ring-pink-200/70 dark:[&_input]:border-white/20 dark:[&_input]:bg-[#120d1d] dark:[&_input]:placeholder:text-slate-500 dark:[&_input]:focus-visible:border-pink-400/60 dark:[&_input]:focus-visible:ring-pink-400/20 [&_textarea]:border-slate-500/70 [&_textarea]:bg-white [&_textarea]:shadow-sm [&_textarea]:placeholder:text-slate-400 [&_textarea]:focus-visible:border-pink-500/85 [&_textarea]:focus-visible:ring-pink-200/70 dark:[&_textarea]:border-white/20 dark:[&_textarea]:bg-[#120d1d] dark:[&_textarea]:placeholder:text-slate-500 dark:[&_textarea]:focus-visible:border-pink-400/60 dark:[&_textarea]:focus-visible:ring-pink-400/20 [&_[data-slot=select-trigger]]:border-slate-500/70 [&_[data-slot=select-trigger]]:bg-white [&_[data-slot=select-trigger]]:shadow-sm dark:[&_[data-slot=select-trigger]]:border-white/20 dark:[&_[data-slot=select-trigger]]:bg-[#120d1d]';

export function DemandCreateForm(): ReactElement {
  const { t } = useTranslation('demand'); 
  
  const navigate = useNavigate();
  const { setPageTitle } = useUIStore();
  const user = useAuthStore((state) => state.user);
  
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
        representativeId: user?.id || null,
        generalDiscountRate: null,
        generalDiscountAmount: null,
      },
    },
  });
  const isFormValid = form.formState.isValid;

  const watchedCurrencyRaw = form.watch('demand.currency');
  const watchedCurrency =
    watchedCurrencyRaw === '' || watchedCurrencyRaw === null || watchedCurrencyRaw === undefined
      ? Number.NaN
      : Number(watchedCurrencyRaw);
  const watchedCustomerId = form.watch('demand.potentialCustomerId');
  const watchedErpCustomerCode = form.watch('demand.erpCustomerCode');
  const watchedRepresentativeId = form.watch('demand.representativeId');
  const watchedOfferDate = form.watch('demand.offerDate');
  const demandFormSlice = form.watch('demand');
  const demandSchemaPayload = useMemo(() => ({ demand: demandFormSlice }), [demandFormSlice]);

  const saveManualHintLines = useMemo(
    () =>
      buildHeaderSaveRequiredHintLines(demandFormSlice, (key) =>
        t(key, { ns: 'common' }),
      ),
    [demandFormSlice, t],
  );
  const { data: customerOptions = [] } = useCustomerOptions(watchedRepresentativeId);
  
  const { calculateLineTotals } = useDemandCalculations();
  const { data: erpRates = [] } = useExchangeRate();

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
          pricingRuleHeaderId: cleanLineData.pricingRuleHeaderId && cleanLineData.pricingRuleHeaderId > 0 ? cleanLineData.pricingRuleHeaderId : null,
          projectCode: cleanLineData.projectCode || null,
          relatedStockId: cleanLineData.relatedStockId && cleanLineData.relatedStockId > 0 ? cleanLineData.relatedStockId : null,
          erpProjectCode: cleanLineData.projectCode ?? null,
        };
      });

      const exchangeRatesToSend = exchangeRates.length > 0
        ? exchangeRates.map(({ id, dovizTipi, ...rate }) => {
            const currencyValue = rate.currency || (dovizTipi ? String(dovizTipi) : '');
            return {
              ...rate,
              currency: currencyValue,
              demandId: 0,
              isOfficial: rate.isOfficial ?? true,
            };
          })
        : [];

      const currencyValue = typeof data.demand.currency === 'string' 
        ? data.demand.currency 
        : String(data.demand.currency);
      
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
        projectCode: data.demand.projectCode || null,
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
        toast.success(t('create.success'), {
          description: t('create.successMessage'),
        });
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
        <form onSubmit={handleFormSubmit} className="space-y-0">
          
          {/* Header */}
          <div className="relative mb-10 pt-6">
            <div className="absolute left-0 top-6 hidden lg:block">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => navigate(-1)}
                className="group h-11 w-11 rounded-xl bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-white/10 hover:border-pink-500/50 hover:shadow-[0_0_20px_-5px_rgba(236,72,153,0.3)] transition-all duration-300"
              >
                <ArrowLeft className="h-5 w-5 text-zinc-500 group-hover:text-pink-600 transition-colors" />
              </Button>
            </div>

            <div className="flex flex-col items-center justify-center text-center px-4">
              <div className="lg:hidden self-start mb-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(-1)}
                  className="rounded-lg border-zinc-200 dark:border-zinc-800"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('back')}
                </Button>
              </div>

              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-900 dark:text-white">
                {t('create.title')}
              </h1>
              
              <p className="text-sm md:text-base text-zinc-500 dark:text-zinc-400 mt-3 max-w-2xl mx-auto leading-relaxed">
                {t('create.subtitle')}
              </p>

              <div className="h-1.5 w-24 bg-linear-to-r from-pink-500 to-purple-600 rounded-full mt-6 shadow-lg shadow-pink-500/20" />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8 xl:gap-10 items-start">
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
                  className="group w-full sm:w-auto h-11 px-6 rounded-xl border-zinc-200 dark:border-zinc-800 font-bold text-zinc-600 dark:text-zinc-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-900/20 dark:hover:text-rose-400 dark:hover:border-rose-800/50 transition-all duration-300"
                >
                  <X className="mr-2 h-4 w-4 transition-colors" />
                  {t('cancel')}
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
                    className="group w-full sm:w-auto sm:min-w-[140px] h-11 rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-bold shadow-lg shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all duration-300 border-0 disabled:opacity-50 disabled:hover:scale-100"
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
    </div>
  );
}
