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
import { ArrowLeft, Save, X } from 'lucide-react';
import { createOrderSchema, type CreateOrderSchema } from '../schemas/order-schema';
import type { OrderLineFormState, OrderExchangeRateFormState, OrderBulkCreateDto, CreateOrderDto, PricingRuleLineGetDto, UserDiscountLimitDto } from '../types/order-types';
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
    setPageTitle(t('order.create.title', 'Yeni Sipariş Oluştur'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  const form = useForm<CreateOrderSchema>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      order: {
        offerType: 'Domestic',
        currency: '',
        offerDate: new Date().toISOString().split('T')[0],
        representativeId: user?.id || null,
        generalDiscountRate: null,
        generalDiscountAmount: null,
      },
    },
  });

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
      toast.error(t('order.create.error', 'Sipariş Oluşturulamadı'), {
        description: t('order.lines.required', 'En az 1 satır eklenmelidir'),
      });
      return;
    }

    const noteKeys = ['note1', 'note2', 'note3', 'note4', 'note5', 'note6', 'note7', 'note8', 'note9', 'note10', 'note11', 'note12', 'note13', 'note14', 'note15'] as const;
    const overLimitNote = noteKeys.find((k) => (quotationNotes[k]?.length ?? 0) > 100);
    if (overLimitNote) {
      toast.error(t('order.create.error', 'Sipariş Oluşturulamadı'), {
        description: t('quotation.notes.maxLengthError', 'Her not en fazla 100 karakter olabilir. Lütfen kontrol edin.'),
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
          pricingRuleHeaderId: cleanLineData.pricingRuleHeaderId && cleanLineData.pricingRuleHeaderId > 0 ? cleanLineData.pricingRuleHeaderId : null,
          projectCode: cleanLineData.projectCode || null,
          relatedStockId: cleanLineData.relatedStockId && cleanLineData.relatedStockId > 0 ? cleanLineData.relatedStockId : null,
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
        throw new Error(t('order.create.invalidCurrency', 'Geçerli bir para birimi seçilmelidir'));
      }

      const orderData: CreateOrderDto = {
        offerType: data.order.offerType,
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
        toast.success(t('order.create.success', 'Sipariş Başarıyla Oluşturuldu'), {
          description: t('order.create.successMessage', 'Sipariş onay sürecine gönderildi.'),
        });
        navigate(`/orders/${result.data.id}`);
      } else {
        throw new Error(result.message || t('order.create.errorMessage', 'Sipariş oluşturulurken bir hata oluştu.'));
      }
    } catch (error: unknown) {
      let errorMessage = t('order.create.errorMessage', 'Sipariş oluşturulurken bir hata oluştu.');
      if (error instanceof Error) {
        errorMessage = error.message; 
      }
      toast.error(t('order.create.error', 'Sipariş Oluşturulamadı'), {
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
      toast.error(t('order.create.error', 'Sipariş Oluşturulamadı'), {
        description: t('order.create.paymentTypeRequired', 'Ödeme tipi seçilmelidir'),
      });
      return;
    }

    if (!formData.order.deliveryDate) {
      toast.error(t('order.create.error', 'Sipariş Oluşturulamadı'), {
        description: t('order.create.deliveryDateRequired', 'Teslimat tarihi girilmelidir'),
      });
      return;
    }
    
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error(t('order.create.error', 'Sipariş Oluşturulamadı'), {
        description: t('order.create.validationError', 'Lütfen form alanlarını kontrol ediniz.'),
      });
      return;
    }

    await onSubmit(formData);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto relative pb-10">
      <FormProvider {...form}>
        <form onSubmit={handleFormSubmit} className="space-y-0">
          <div className="flex items-center gap-5 mb-6">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => navigate(-1)}
              className="group h-12 w-12 rounded-2xl bg-white/80 dark:bg-zinc-900/50 border-zinc-200 dark:border-white/10 shadow-sm hover:border-pink-500/50 hover:shadow-pink-500/20 transition-all duration-300"
            >
              <ArrowLeft className="h-5 w-5 text-zinc-500 group-hover:text-pink-600 transition-colors" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                {t('order.create.title', 'Yeni Sipariş Oluştur')}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {t('order.create.subtitle', 'Müşteri için yeni bir satış siparişi oluşturun.')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8 xl:gap-10 items-start">
            <div className="flex flex-col gap-6 min-w-0">
              <section className="space-y-1" aria-label={t('order.sections.header', 'Müşteri ve belge bilgileri')}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-200/80 dark:bg-zinc-700/50 text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    1
                  </span>
                  <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                    {t('order.sections.header', 'Müşteri & Belge')}
                  </h3>
                </div>
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
              </section>

              <section className="space-y-1 pt-2" aria-label={t('order.sections.lines', 'Sipariş kalemleri')}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-200/80 dark:bg-zinc-700/50 text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    2
                  </span>
                  <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                    {t('order.sections.lines', 'Sipariş Kalemleri')}
                  </h3>
                </div>
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
              </section>
            </div>

            <aside className="xl:sticky xl:top-6">
              <div className="flex items-center gap-2 mb-3 xl:mb-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  3
                </span>
                <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  {t('order.sections.summary', 'Özet & Toplamlar')}
                </h3>
              </div>
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm overflow-hidden">
                <OrderSummaryCard lines={lines} currency={watchedCurrency} />
              </div>
            </aside>
          </div>

          <div className="flex items-center justify-end gap-3 pt-8 mt-8 border-t border-zinc-200 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="group"
            >
              <X className="mr-2 h-4 w-4" />
              {t('order.cancel', 'İptal')}
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="group bg-linear-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white min-w-[140px]"
            >
              <Save className="mr-2 h-4 w-4" />
              {createMutation.isPending
                ? t('order.saving', 'Kaydediliyor...')
                : t('order.save', 'Siparişi Kaydet')
              }
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}