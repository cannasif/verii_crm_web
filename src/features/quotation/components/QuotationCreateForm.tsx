import { type ReactElement, useState, useEffect, useMemo, useRef } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCreateQuotationBulk } from '../hooks/useCreateQuotationBulk';
import { usePriceRuleOfQuotation } from '../hooks/usePriceRuleOfQuotation';
import { useUserDiscountLimitsBySalesperson } from '../hooks/useUserDiscountLimitsBySalesperson';
import { useCustomerOptions } from '@/features/customer-management/hooks/useCustomerOptions';
import { QuotationHeaderForm } from './QuotationHeaderForm';
import { QuotationLineTable } from './QuotationLineTable';
import { QuotationSummaryCard } from './QuotationSummaryCard';
import { Button } from '@/components/ui/button';
import { Save, X, FileDown, Mail, MessageCircle, Share2, ArrowLeft, FileText, Layers, Calculator } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import { formatCurrency } from '../utils/format-currency';
import { createQuotationSchema, type CreateQuotationSchema } from '../schemas/quotation-schema';
import type { QuotationLineFormState, QuotationExchangeRateFormState, QuotationBulkCreateDto, CreateQuotationDto, PricingRuleLineGetDto, UserDiscountLimitDto, QuotationNotesDto } from '../types/quotation-types';
import { DEFAULT_OFFER_TYPE, normalizeOfferType } from '@/types/offer-type';
import { createEmptyQuotationNotes } from './QuotationNotesDialog';
import { mapQuotationNotesToPayload, quotationNotesDtoToNotesList } from '../utils/quotation-payload-mapper';
import { quotationApi } from '../api/quotation-api';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { useQuotationCalculations } from '../hooks/useQuotationCalculations';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import { findExchangeRateByDovizTipi } from '../utils/price-conversion';

function addDaysToDateOnly(dateValue: string, days: number): string {
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export function QuotationCreateForm(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setPageTitle } = useUIStore();
  const user = useAuthStore((state) => state.user);
  
  const [lines, setLines] = useState<QuotationLineFormState[]>([]);
  const [exchangeRates, setExchangeRates] = useState<QuotationExchangeRateFormState[]>([]);
  const [quotationNotes, setQuotationNotes] = useState<QuotationNotesDto>(createEmptyQuotationNotes);
  const [pricingRules, setPricingRules] = useState<PricingRuleLineGetDto[]>([]);
  const [temporarySallerData, setTemporarySallerData] = useState<UserDiscountLimitDto[]>([]);
  
  const createMutation = useCreateQuotationBulk();
  const { data: customerOptions = [] } = useCustomerOptions();
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
        generalDiscountRate: null,
        generalDiscountAmount: null,
      },
    },
  });
  const isFormValid = form.formState.isValid;

  const watchedCurrency = Number(form.watch('quotation.currency') ?? '2');
  const watchedCustomerId = form.watch('quotation.potentialCustomerId');
  const watchedErpCustomerCode = form.watch('quotation.erpCustomerCode');
  const watchedRepresentativeId = form.watch('quotation.representativeId');
  const watchedOfferDate = form.watch('quotation.offerDate');
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
  
  const { calculateLineTotals } = useQuotationCalculations();
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
      toast.error(t('quotation.create.error'), {
        description: t('quotation.lines.required'),
      });
      return;
    }

    const noteKeys = ['note1', 'note2', 'note3', 'note4', 'note5', 'note6', 'note7', 'note8', 'note9', 'note10', 'note11', 'note12', 'note13', 'note14', 'note15'] as const;
    const overLimitNote = noteKeys.find((k) => (quotationNotes[k]?.length ?? 0) > 100);
    if (overLimitNote) {
      toast.error(t('quotation.create.error'), {
        description: t('quotation.notes.maxLengthError'),
      });
      return;
    }

    try {
      const linesToSend = lines.map((line) => {
        const { id, isEditing, ...lineData } = line;
        const { relatedLines, ...cleanLineData } = lineData as QuotationLineFormState & { relatedLines?: unknown[] };
        
        return {
          ...cleanLineData,
          quotationId: 0,
          productId: 0,
          description: cleanLineData.description || null,
          description1: cleanLineData.description1 || null,
          description2: cleanLineData.description2 || null,
          description3: cleanLineData.description3 || null,
          pricingRuleHeaderId: cleanLineData.pricingRuleHeaderId && cleanLineData.pricingRuleHeaderId > 0 ? cleanLineData.pricingRuleHeaderId : null,
          relatedStockId: cleanLineData.relatedStockId && cleanLineData.relatedStockId > 0 ? cleanLineData.relatedStockId : null,
          erpProjectCode: cleanLineData.projectCode ?? null,
        };
      });

      const exchangeRatesToSend = exchangeRates.length > 0
        ? exchangeRates.map(({ id, dovizTipi, ...rate }) => {
            const currencyValue = rate.currency || (dovizTipi != null ? String(dovizTipi) : '');
            return {
              ...rate,
              currency: currencyValue,
              quotationId: 0,
              isOfficial: rate.isOfficial ?? true,
            };
          })
        : [];

      const currencyValue = typeof data.quotation.currency === 'string' 
        ? data.quotation.currency 
        : String(data.quotation.currency);
      
      if (currencyValue == null || currencyValue === '' || Number.isNaN(Number(currencyValue))) {
        throw new Error(t('quotation.create.invalidCurrency'));
      }

      const quotationData: CreateQuotationDto = {
        offerType: normalizeOfferType(data.quotation.offerType),
        currency: currencyValue,
        potentialCustomerId: (data.quotation.potentialCustomerId && data.quotation.potentialCustomerId > 0) ? data.quotation.potentialCustomerId : null,
        erpCustomerCode: data.quotation.erpCustomerCode || null,
        deliveryDate: data.quotation.deliveryDate || null,
        shippingAddressId: (data.quotation.shippingAddressId && data.quotation.shippingAddressId > 0) ? data.quotation.shippingAddressId : null,
        representativeId: (data.quotation.representativeId && data.quotation.representativeId > 0) ? data.quotation.representativeId : null,
        projectCode: data.quotation.projectCode || null,
        status: (data.quotation.status && data.quotation.status > 0) ? data.quotation.status : null,
        description: data.quotation.description || null,
        paymentTypeId: (data.quotation.paymentTypeId && data.quotation.paymentTypeId > 0) ? data.quotation.paymentTypeId : null,
        documentSerialTypeId: (data.quotation.documentSerialTypeId && data.quotation.documentSerialTypeId > 0) ? data.quotation.documentSerialTypeId : null,
        offerDate: data.quotation.offerDate || null,
        offerNo: data.quotation.offerNo || null,
        revisionNo: data.quotation.revisionNo || null,
        revisionId: (data.quotation.revisionId && data.quotation.revisionId > 0) ? data.quotation.revisionId : null,
        generalDiscountRate: data.quotation.generalDiscountRate ?? null,
        generalDiscountAmount: data.quotation.generalDiscountAmount ?? null,
        salesTypeDefinitionId: data.quotation.deliveryMethod ? Number(data.quotation.deliveryMethod) : null,
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
        const notesList = quotationNotesDtoToNotesList(quotationNotes);
        if (notesList.length > 0) {
          await quotationApi.updateNotesListByQuotationId(result.data.id, { notes: notesList });
        }
        toast.success(t('quotation.create.success'), {
          description: t('quotation.create.successMessage'),
        });
        navigate(`/quotations/${result.data.id}`);
      } else {
        throw new Error(result.message || t('quotation.create.errorMessage'));
      }
    } catch (error: unknown) {
      let errorMessage = t('quotation.create.errorMessage');
      if (error instanceof Error) {
        errorMessage = error.message; 
      }
      toast.error(t('quotation.create.error'), {
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

    const updatedLines = await Promise.all(
      lines.map(async (line) => {
        const oldRate = findExchangeRateByDovizTipi(oldCurrency, exchangeRates, erpRates);
        const newRate = findExchangeRateByDovizTipi(newCurrencyNum, exchangeRates, erpRates);

        if (oldRate && oldRate > 0 && newRate && newRate > 0) {
          const conversionRatio = oldRate / newRate;
          const newUnitPrice = line.unitPrice * conversionRatio;
          
          const updatedLine = {
            ...line,
            unitPrice: newUnitPrice,
          };
          return calculateLineTotals(updatedLine);
        }
        return line;
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

  const generatePDF = async () => {
    const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new JsPDF();
    
    doc.setFontSize(18);
    doc.text(t('quotation.create.title'), 14, 20);
    doc.setFontSize(11);
    doc.text(`${t('quotation.date')}: ${new Date().toLocaleDateString('tr-TR')}`, 14, 28);

    const headers = [[
      t('quotation.lines.productCode'),
      t('quotation.lines.productName'),
      t('quotation.lines.quantity'),
      t('quotation.lines.unitPrice'),
      t('quotation.lines.vatRate'),
      t('quotation.lines.total')
    ]];

    const data = lines.map(line => [
      line.productCode,
      line.productName,
      line.quantity,
      formatCurrency(line.unitPrice, currencyCode),
      `%${line.vatRate}`,
      formatCurrency(line.lineTotal, currencyCode)
    ]);

    autoTable(doc, {
      startY: 35,
      head: headers,
      body: data,
      styles: { font: 'helvetica', fontStyle: 'normal' },
      theme: 'grid',
    });

    return doc;
  };

  const handleExportPDF = async () => {
    const doc = await generatePDF();
    doc.save("teklif.pdf");
  };

  const handleShareWhatsApp = async () => {
    const doc = await generatePDF();
    doc.save("teklif.pdf");
    const text = encodeURIComponent(t('quotation.share.whatsappMessage'));
    window.open(`https://wa.me/?text=${text}`, '_blank');
    toast.info(t('quotation.share.downloaded'));
  };

  const handleShareMail = async () => {
    const doc = await generatePDF();
    doc.save("teklif.pdf");
    const subject = encodeURIComponent(t('quotation.share.mailSubject'));
    const body = encodeURIComponent(t('quotation.share.mailBody'));
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    toast.info(t('quotation.share.downloaded'));
  };

  const handleFormSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const formData = form.getValues();
    
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error(t('quotation.create.error'), {
        description: 'Zorunlu alanlar doldurulmadı.',
      });
      return;
    }

    await onSubmit(formData);
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
                  {t('common.back')}
                </Button>
              </div>

              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-900 dark:text-white">
                {t('quotation.create.title')}
              </h1>
              
              <p className="text-sm md:text-base text-zinc-500 dark:text-zinc-400 mt-3 max-w-2xl mx-auto leading-relaxed">
                {t('quotation.create.subtitle')}
              </p>

              <div className="h-1.5 w-24 bg-linear-to-r from-pink-500 to-purple-600 rounded-full mt-6 shadow-lg shadow-pink-500/20" />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8 xl:gap-10 items-start">
            {/* SOL KISIM */}
            <div className="flex flex-col gap-6 min-w-0 h-fit">
              
              {/* --- 1. Bölüm: Teklif Bilgileri --- */}
              <section aria-label={t('quotation.sections.header')}>
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden shadow-sm">
                  {/* Başlık Alanı */}
                  <div className="px-5 py-4 border-b border-zinc-100 dark:border-white/5 flex items-center gap-3 bg-zinc-50/50 dark:bg-white/5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-bold shadow-sm">
                      1
                    </div>
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                            {t('quotation.sections.header')}
                        </h3>
                    </div>
                  </div>

                  {/* Form İçeriği */}
                  <div className="p-5">
                    <QuotationHeaderForm
                      exchangeRates={exchangeRates}
                      onExchangeRatesChange={setExchangeRates}
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
              <section aria-label={t('quotation.sections.lines')}>
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden shadow-sm">
                   <div className="px-5 py-4 border-b border-zinc-100 dark:border-white/5 flex items-center gap-3 bg-zinc-50/50 dark:bg-white/5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-bold shadow-sm">
                      2
                    </div>
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                            {t('quotation.sections.lines')}
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
                        offerNo={form.watch('quotation.offerNo')}
                        customerName={customerOptions.find((c) => c.id === watchedCustomerId)?.name ?? null}
                      />
                  </div>
                </div>
              </section>
            </div>

            {/* SAĞ KISIM: Özet */}
            <aside className="xl:sticky xl:top-6 w-full">
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-zinc-100 dark:border-white/5 flex items-center gap-3 bg-zinc-50/50 dark:bg-white/5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-sm">
                      3
                    </div>
                    <div className="flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                            {t('quotation.sections.summary')}
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
              {t('quotation.cancel')}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="group w-full sm:w-auto">
                  <Share2 className="mr-2 h-4 w-4" />
                  {t('quotation.export')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-[#130822] border-slate-100 dark:border-white/10">
                <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                  <FileDown className="mr-2 h-4 w-4 text-slate-500" />
                  {t('quotation.exportPdf')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareWhatsApp} className="cursor-pointer">
                  <MessageCircle className="mr-2 h-4 w-4 text-green-500" />
                  {t('quotation.shareWhatsapp')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareMail} className="cursor-pointer">
                  <Mail className="mr-2 h-4 w-4 text-blue-500" />
                  {t('quotation.shareMail')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="submit"
              disabled={createMutation.isPending || !isFormValid}
              className="group w-full sm:w-auto sm:min-w-[140px] bg-linear-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white"
            >
              <Save className="mr-2 h-4 w-4" />
              {createMutation.isPending
                ? t('quotation.saving')
                : t('quotation.save')
              }
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
