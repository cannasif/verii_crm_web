import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCreateOrderBulk } from '../hooks/useCreateOrderBulk';
import { usePriceRuleOfOrder } from '../hooks/usePriceRuleOfOrder';
import { useUserDiscountLimitsBySalesperson } from '../hooks/useUserDiscountLimitsBySalesperson';
import { useCustomerOptions } from '@/features/customer-management/hooks/useCustomerOptions';
import { OrderHeaderForm } from './OrderHeaderForm';
import { OrderLineTable } from './OrderLineTable';
import { OrderSummaryCard } from './OrderSummaryCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, X, FileText, Layers, Calculator } from 'lucide-react';
import { createOrderSchema, type CreateOrderSchema } from '../schemas/order-schema';
import type { OrderLineFormState, OrderExchangeRateFormState, OrderBulkCreateDto, CreateOrderDto, PricingRuleLineGetDto, UserDiscountLimitDto } from '../types/order-types';
import { DEFAULT_OFFER_TYPE, normalizeOfferType } from '@/types/offer-type';
import { createEmptyQuotationNotes } from '@/features/quotation/components/QuotationNotesDialog';
import type { QuotationNotesDto } from '@/features/quotation/types/quotation-types';
import { orderNotesDtoToNotesList } from '../utils/notes-mapper';
import { orderApi } from '../api/order-api';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { useOrderCalculations } from '../hooks/useOrderCalculations';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import { findExchangeRateByDovizTipi } from '../utils/price-conversion';

export function OrderCreateForm(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setPageTitle } = useUIStore();
  const user = useAuthStore((state) => state.user);
  
  const [lines, setLines] = useState<OrderLineFormState[]>([]);
  const [exchangeRates, setExchangeRates] = useState<OrderExchangeRateFormState[]>([]);
  const [quotationNotes, setQuotationNotes] = useState<QuotationNotesDto>(createEmptyQuotationNotes);
  const [pricingRules, setPricingRules] = useState<PricingRuleLineGetDto[]>([]);
  const [temporarySallerData, setTemporarySallerData] = useState<UserDiscountLimitDto[]>([]);
  
  const createMutation = useCreateOrderBulk();
  const { data: customerOptions = [] } = useCustomerOptions();

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
        representativeId: user?.id || null,
        generalDiscountRate: null,
        generalDiscountAmount: null,
      },
    },
  });
  const isFormValid = form.formState.isValid;

  const watchedCurrency = Number(form.watch('order.currency') ?? '2');
  const watchedCustomerId = form.watch('order.potentialCustomerId');
  const watchedErpCustomerCode = form.watch('order.erpCustomerCode');
  const watchedRepresentativeId = form.watch('order.representativeId');
  const watchedOfferDate = form.watch('order.offerDate');
  
  const { calculateLineTotals } = useOrderCalculations();
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
      toast.error(t('order.create.error'), {
        description: t('order.lines.required'),
      });
      return;
    }

    const noteKeys = ['note1', 'note2', 'note3', 'note4', 'note5', 'note6', 'note7', 'note8', 'note9', 'note10', 'note11', 'note12', 'note13', 'note14', 'note15'] as const;
    const overLimitNote = noteKeys.find((k) => (quotationNotes[k]?.length ?? 0) > 400);
    if (overLimitNote) {
      toast.error(t('order.create.error'), {
        description: t('quotation.notes.maxLengthError'),
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
          productId: 0,
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
              orderId: 0,
              isOfficial: rate.isOfficial ?? true,
            };
          })
        : [];

      const currencyValue = typeof data.order.currency === 'string' 
        ? data.order.currency 
        : String(data.order.currency);
      
      if (currencyValue == null || currencyValue === '' || Number.isNaN(Number(currencyValue))) {
        throw new Error(t('order.create.invalidCurrency'));
      }

      const orderData: CreateOrderDto = {
        offerType: normalizeOfferType(data.order.offerType),
        currency: currencyValue,
        potentialCustomerId: (data.order.potentialCustomerId && data.order.potentialCustomerId > 0) ? data.order.potentialCustomerId : null,
        erpCustomerCode: data.order.erpCustomerCode || null,
        deliveryDate: data.order.deliveryDate || null,
        shippingAddressId: (data.order.shippingAddressId && data.order.shippingAddressId > 0) ? data.order.shippingAddressId : null,
        representativeId: (data.order.representativeId && data.order.representativeId > 0) ? data.order.representativeId : null,
        projectCode: data.order.projectCode || null,
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
        toast.success(t('order.create.success'), {
          description: t('order.create.successMessage'),
        });
        navigate(`/orders/${result.data.id}`);
      } else {
        throw new Error(result.message || t('order.create.errorMessage'));
      }
    } catch (error: unknown) {
      let errorMessage = t('order.create.errorMessage');
      if (error instanceof Error) {
        errorMessage = error.message; 
      }
      toast.error(t('order.create.error'), {
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

  const handleFormSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const formData = form.getValues();

    if (!formData.order.paymentTypeId) {
      toast.error(t('order.create.error'), {
        description: t('order.create.paymentTypeRequired'),
      });
      return;
    }

    if (!formData.order.deliveryDate) {
      toast.error(t('order.create.error'), {
        description: t('order.create.deliveryDateRequired'),
      });
      return;
    }
    
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error(t('order.create.error'), {
        description: t('order.create.validationError'),
      });
      return;
    }

    await onSubmit(formData);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto relative pb-10 px-4 md:px-6">
      <FormProvider {...form}>
        <form onSubmit={handleFormSubmit} className="space-y-0">
          
          {/* Header Section */}
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
                  {t('common.back', 'Geri')}
                </Button>
              </div>

              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-900 dark:text-white">
                {t('order.create.title')}
              </h1>
              
              <p className="text-sm md:text-base text-zinc-500 dark:text-zinc-400 mt-3 max-w-2xl mx-auto leading-relaxed">
                {t('order.create.subtitle')}
              </p>

              <div className="h-1.5 w-24 bg-linear-to-r from-pink-500 to-purple-600 rounded-full mt-6 shadow-lg shadow-pink-500/20" />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8 xl:gap-10 items-start">
            {/* Left Content Column */}
            <div className="flex flex-col gap-6 min-w-0 h-fit">
              
              {/* Section 1: Order Information */}
              <section aria-label={t('order.sections.header')}>
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden shadow-sm">
                  <div className="px-5 py-4 border-b border-zinc-100 dark:border-white/5 flex items-center gap-3 bg-zinc-50/50 dark:bg-white/5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-bold shadow-sm">
                      1
                    </div>
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                            {t('order.sections.header')}
                        </h3>
                    </div>
                  </div>

                  <div className="p-5">
                    <OrderHeaderForm
                      exchangeRates={exchangeRates}
                      onExchangeRatesChange={setExchangeRates}
                      quotationNotes={quotationNotes}
                      onQuotationNotesChange={setQuotationNotes}
                      lines={lines}
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
              <section aria-label={t('order.sections.lines')}>
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden shadow-sm">
                   <div className="px-5 py-4 border-b border-zinc-100 dark:border-white/5 flex items-center gap-3 bg-zinc-50/50 dark:bg-white/5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-bold shadow-sm">
                      2
                    </div>
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                            {t('order.sections.lines')}
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
                      />
                  </div>
                </div>
              </section>
            </div>

            {/* Sidebar Sticky Column */}
            <aside className="xl:sticky xl:top-6 w-full">
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-zinc-100 dark:border-white/5 flex items-center gap-3 bg-zinc-50/50 dark:bg-white/5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-sm">
                      3
                    </div>
                    <div className="flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                            {t('order.sections.summary')}
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
              {t('order.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !isFormValid}
              className="group w-full sm:w-auto sm:min-w-[140px] bg-linear-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white"
            >
              <Save className="mr-2 h-4 w-4" />
              {createMutation.isPending
                ? t('order.saving')
                : t('order.save')
              }
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
