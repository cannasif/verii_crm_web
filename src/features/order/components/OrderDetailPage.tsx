import { type ReactElement, useState, useEffect, useMemo, useRef } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useOrder } from '../hooks/useOrder';
import { useStartApprovalFlow } from '../hooks/useStartApprovalFlow';
import { useOrderExchangeRates } from '../hooks/useOrderExchangeRates';
import { useOrderLines } from '../hooks/useOrderLines';
import { useOrderNotes } from '../hooks/useOrderNotes';
import { useUpdateOrderBulk } from '../hooks/useUpdateOrderBulk';
import { useUpdateOrderNotesList } from '../hooks/useUpdateOrderNotesList';
import { usePriceRuleOfOrder } from '../hooks/usePriceRuleOfOrder';
import { useUserDiscountLimitsBySalesperson } from '../hooks/useUserDiscountLimitsBySalesperson';
import { useCustomerOptions } from '@/features/customer-management/hooks/useCustomerOptions';
import { useUIStore } from '@/stores/ui-store';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Layers, Loader2, FileCheck, FileText } from 'lucide-react';
import { OrderApprovalFlowTab } from './OrderApprovalFlowTab';
import { ReportTemplateTab, DocumentRuleType } from '@/features/report-designer';
import { cn } from '@/lib/utils';
import { createOrderSchema, type CreateOrderSchema } from '../schemas/order-schema';
import type { OrderLineFormState, OrderExchangeRateFormState, OrderBulkCreateDto, CreateOrderDto, PricingRuleLineGetDto, UserDiscountLimitDto } from '../types/order-types';
import { DEFAULT_OFFER_TYPE, normalizeOfferType } from '@/types/offer-type';
import type { QuotationNotesDto } from '@/features/quotation/types/quotation-types';
import { createEmptyQuotationNotes } from '@/features/quotation/components/QuotationNotesDialog';
import { orderNotesGetDtoToDto, orderNotesDtoToNotesList } from '../utils/notes-mapper';
import { OrderHeaderForm } from './OrderHeaderForm';
import { OrderLineTable } from './OrderLineTable';
import { OrderSummaryCard } from './OrderSummaryCard';
import { useOrderCalculations } from '../hooks/useOrderCalculations';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import { findExchangeRateByDovizTipi } from '../utils/price-conversion';
import { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';

export function OrderDetailPage(): ReactElement {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setPageTitle } = useUIStore();
  const orderId = id ? parseInt(id, 10) : 0;

  const { data: order, isLoading } = useOrder(orderId);
  const { data: exchangeRatesData = [], isLoading: isLoadingExchangeRates } = useOrderExchangeRates(orderId);
  const { data: linesData = [], isLoading: isLoadingLines } = useOrderLines(orderId);
  const { data: notesData, isLoading: isLoadingNotes } = useOrderNotes(orderId);
  const updateMutation = useUpdateOrderBulk();
  const updateNotesMutation = useUpdateOrderNotesList(orderId);
  const startApprovalFlow = useStartApprovalFlow();
  const { data: customerOptions = [] } = useCustomerOptions();

  const [lines, setLines] = useState<OrderLineFormState[]>([]);
  const [exchangeRates, setExchangeRates] = useState<OrderExchangeRateFormState[]>([]);
  const [quotationNotes, setQuotationNotes] = useState<QuotationNotesDto>(createEmptyQuotationNotes);
  const [pricingRules, setPricingRules] = useState<PricingRuleLineGetDto[]>([]);
  const [temporarySallerData, setTemporarySallerData] = useState<UserDiscountLimitDto[]>([]);

  const linesInitializedRef = useRef(false);
  const notesInitializedRef = useRef(false);
  const exchangeRatesInitializedRef = useRef(false);
  const formInitializedRef = useRef(false);
  const [activeTab, setActiveTab] = useState('detail');
  const orderStatus = Number((order as { status?: number; Status?: number })?.status ?? (order as { status?: number; Status?: number })?.Status);
  const isReadOnly = orderStatus === 2 || orderStatus === 3 || orderStatus === 4;
  const isClosed = orderStatus === 4;
  const linesEnabled = !isReadOnly;

  const form = useForm<CreateOrderSchema>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      order: {
        offerType: DEFAULT_OFFER_TYPE,
        currency: '',
        offerDate: new Date().toISOString().split('T')[0],
        representativeId: null,
      },
    },
  });

  // Başlık Ayarı
  useEffect(() => {
    if (order) {
      setPageTitle(
        t('order.detail.title', {
          offerNo: order.offerNo || `#${order.id}`,
        })
      );
    } else {
      setPageTitle(t('order.detail.title'));
    }
    return () => {
      setPageTitle(null);
    };
  }, [order, t, setPageTitle]);

  useEffect(() => {
    if (order && !formInitializedRef.current) {
      const raw = order as unknown as Record<string, unknown>;
      const salesTypeId = order.salesTypeDefinitionId ?? raw.SalesTypeDefinitionId;
      const deliveryMethodFromApi = order.deliveryMethod ?? raw.DeliveryMethod;
      const deliveryMethodValue =
        salesTypeId != null && salesTypeId !== ''
          ? String(salesTypeId)
          : deliveryMethodFromApi != null && deliveryMethodFromApi !== ''
            ? String(deliveryMethodFromApi)
            : null;
      const projectCodeValue = order.erpProjectCode ?? order.projectCode ?? (raw.ErpProjectCode as string) ?? (raw.ProjectCode as string) ?? null;
      form.reset({
        order: {
          offerType: normalizeOfferType(order.offerType),
          currency: order.currency || '',
          offerDate: order.offerDate ? order.offerDate.split('T')[0] : new Date().toISOString().split('T')[0],
          potentialCustomerId: order.potentialCustomerId || null,
          erpCustomerCode: order.erpCustomerCode || null,
          deliveryDate: order.deliveryDate ? order.deliveryDate.split('T')[0] : null,
          shippingAddressId: order.shippingAddressId || null,
          representativeId: order.representativeId || null,
          projectCode: projectCodeValue,
          status: order.status || null,
          description: order.description || null,
          paymentTypeId: order.paymentTypeId || null,
          documentSerialTypeId: order.documentSerialTypeId || null,
          offerNo: order.offerNo || null,
          revisionNo: order.revisionNo || null,
          revisionId: order.revisionId || null,
          generalDiscountRate: order.generalDiscountRate ?? null,
          generalDiscountAmount: order.generalDiscountAmount ?? null,
          deliveryMethod: deliveryMethodValue,
        },
      });
      formInitializedRef.current = true;
    }
  }, [order, form]);

  useEffect(() => {
    linesInitializedRef.current = false;
    notesInitializedRef.current = false;
  }, [orderId]);

  useEffect(() => {
    if (!orderId || orderId < 1) return;
    if (notesInitializedRef.current) return;
    if (notesData === undefined) return;
    setQuotationNotes(orderNotesGetDtoToDto(notesData ?? null));
    notesInitializedRef.current = true;
  }, [orderId, notesData]);

  useEffect(() => {
    if (linesData && linesData.length > 0 && !linesInitializedRef.current) {
      const formattedLines: OrderLineFormState[] = linesData.map((line, index) => ({
        id: line.id && line.id > 0 ? `line-${line.id}-${index}` : `line-temp-${index}`,
        isEditing: false,
        productCode: line.productCode || '',
        productName: line.productName,
        groupCode: line.groupCode || null,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountRate1: line.discountRate1,
        discountAmount1: line.discountAmount1,
        discountRate2: line.discountRate2,
        discountAmount2: line.discountAmount2,
        discountRate3: line.discountRate3,
        discountAmount3: line.discountAmount3,
        vatRate: line.vatRate,
        vatAmount: line.vatAmount,
        lineTotal: line.lineTotal,
        lineGrandTotal: line.lineGrandTotal,
        description: line.description || null,
        description1: line.description1 || null,
        description2: line.description2 || null,
        description3: line.description3 || null,
        pricingRuleHeaderId: line.pricingRuleHeaderId || null,
        relatedStockId: line.relatedStockId || null,
        relatedProductKey: line.relatedProductKey || null,
        isMainRelatedProduct: line.isMainRelatedProduct || false,
        approvalStatus: line.approvalStatus,
      }));
      setLines(formattedLines);
      linesInitializedRef.current = true;
    }
  }, [linesData]);

  const { calculateLineTotals } = useOrderCalculations();
  const { data: erpRates = [] } = useExchangeRate();
  const { currencyOptions: currencyOptionsForExchangeRates } = useCurrencyOptions();

  useEffect(() => {
    if (exchangeRatesData && exchangeRatesData.length > 0 && !exchangeRatesInitializedRef.current && currencyOptionsForExchangeRates.length > 0) {
      const formattedExchangeRates: OrderExchangeRateFormState[] = exchangeRatesData.map((rate) => {
        const currencyOption = currencyOptionsForExchangeRates.find(
          (opt) => opt.dovizIsmi?.toUpperCase() === rate.currency.toUpperCase() || 
                   opt.code?.toUpperCase() === rate.currency.toUpperCase()
        );
        
        return {
          id: `rate-${rate.id}`,
          currency: rate.currency,
          exchangeRate: rate.exchangeRate,
          exchangeRateDate: rate.exchangeRateDate ? rate.exchangeRateDate.split('T')[0] : new Date().toISOString().split('T')[0],
          isOfficial: rate.isOfficial,
          dovizTipi: currencyOption?.dovizTipi,
        };
      });
      setExchangeRates(formattedExchangeRates);
      exchangeRatesInitializedRef.current = true;
    }
  }, [exchangeRatesData, currencyOptionsForExchangeRates]);

  const watchedCurrency = Number(form.watch('order.currency') ?? '2');
  const watchedCustomerId = form.watch('order.potentialCustomerId');
  const watchedErpCustomerCode = form.watch('order.erpCustomerCode');
  const watchedRepresentativeId = form.watch('order.representativeId');
  const watchedOfferDate = form.watch('order.offerDate');

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

  // Submit İşlemi
  const onSubmit = async (data: CreateOrderSchema): Promise<void> => {
    if (isReadOnly) return;
    if (lines.length === 0) {
      toast.error(t('order.update.error'), {
        description: t('order.lines.required'),
      });
      return;
    }

    const noteKeys = ['note1', 'note2', 'note3', 'note4', 'note5', 'note6', 'note7', 'note8', 'note9', 'note10', 'note11', 'note12', 'note13', 'note14', 'note15'] as const;
    const overLimitNote = noteKeys.find((k) => (quotationNotes[k]?.length ?? 0) > 100);
    if (overLimitNote) {
      toast.error(t('order.update.error'), {
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
          orderId: orderId,
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
            const currencyValue = rate.currency || (dovizTipi ? String(dovizTipi) : '');
            return {
              ...rate,
              currency: currencyValue,
              orderId: orderId,
              isOfficial: rate.isOfficial ?? true,
            };
          })
        : undefined;

      const currencyValue = typeof data.order.currency === 'string' 
        ? data.order.currency 
        : String(data.order.currency);
      
      if (currencyValue == null || currencyValue === '' || Number.isNaN(Number(currencyValue))) {
        throw new Error(t('order.update.invalidCurrency'));
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
        salesTypeDefinitionId: data.order.deliveryMethod ? Number(data.order.deliveryMethod) : null,
        erpProjectCode: data.order.projectCode ?? null,
      };

      const payload: OrderBulkCreateDto = {
        order: orderData,
        lines: linesToSend,
        exchangeRates: exchangeRatesToSend,
      };

      const result = await updateMutation.mutateAsync({ id: orderId, data: payload });

      const notesList = orderNotesDtoToNotesList(quotationNotes);
      if (notesList.length > 15) {
        toast.error(t('order.update.error'), {
          description: t('quotation.notes.maxCountError'),
        });
        return;
      }
      await updateNotesMutation.mutateAsync({ notes: notesList });

      if (result.success && result.data) {
        toast.success(t('order.update.success'), {
          description: t('order.update.successMessage'),
        });
      } else {
        throw new Error(result.message || t('order.update.errorMessage'));
      }
    } catch (error: unknown) {
      let errorMessage = t('order.update.errorMessage');
      if (error instanceof Error) {
          try {
             const parsedError = JSON.parse(error.message);
             if (parsedError?.errors) errorMessage = JSON.stringify(parsedError.errors);
             else if (parsedError?.message) errorMessage = parsedError.message;
             else errorMessage = error.message;
          } catch {
             errorMessage = error.message;
          }
      }
      toast.error(t('order.update.error'), {
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
          const updatedLine = { ...line, unitPrice: newUnitPrice };
          return calculateLineTotals(updatedLine);
        }
        return line;
      })
    );
    setLines(updatedLines);
  };

  const handleFormSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error(t('order.update.error'), {
        description: t('order.update.validationError'),
      });
      return;
    }
    const formData = form.getValues();
    await onSubmit(formData);
  };

  const handleStartApprovalFlow = (): void => {
    if (!order) return;
    startApprovalFlow.mutate({
      entityId: order.id,
      documentType: PricingRuleType.Order,
      totalAmount: order.grandTotal,
    });
  };

  if (isLoading || isLoadingExchangeRates || isLoadingLines || isLoadingNotes) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 border border-zinc-300 dark:border-zinc-700/80 rounded-xl bg-white/50 dark:bg-card/50">
        <div className="w-10 h-10 border-4 border-muted border-t-pink-500 rounded-full animate-spin" />
        <span className="text-muted-foreground animate-pulse text-sm font-medium">
          {t('order.loading')}
        </span>
      </div>
    );
  }

  // Not Found Durumu
  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-lg font-medium text-muted-foreground mb-4">
          {t('order.detail.notFound')}
        </p>
        <Button variant="outline" onClick={() => navigate('/orders')}>
          {t('order.backToOrders')}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 relative pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t('order.detail.title', { offerNo: order.offerNo || `#${order.id}` })}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t('order.detail.subtitle')}
            {order.revisionNo != null && order.revisionNo !== '' && (
              <span className="block mt-1">
                {t('order.detail.revisionNo')}: {order.revisionNo}
              </span>
            )}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 h-auto p-1 rounded-xl gap-1 w-full overflow-x-auto scrollbar-hide justify-start">
          <TabsTrigger
            value="detail"
            className={cn(
              'rounded-lg px-4 py-2 shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm',
              activeTab === 'detail' && 'text-pink-600 dark:text-pink-500 font-medium'
            )}
          >
            <Layers className="h-4 w-4 mr-2" />
            {t('order.detail.tabDetail')}
          </TabsTrigger>
          <TabsTrigger
            value="approval-flow"
            className={cn(
              'rounded-lg px-4 py-2 shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm',
              activeTab === 'approval-flow' && 'text-pink-600 dark:text-pink-500 font-medium'
            )}
          >
            <FileCheck className="h-4 w-4 mr-2" />
            {t('order.detail.tabApprovalFlow')}
          </TabsTrigger>
          <TabsTrigger
            value="report"
            className={cn(
              'rounded-lg px-4 py-2 shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm',
              activeTab === 'report' && 'text-pink-600 dark:text-pink-500 font-medium'
            )}
          >
            <FileText className="h-4 w-4 mr-2" />
            {t('order.detail.tabReport')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detail" className="mt-6 focus-visible:outline-none">
          {isClosed && (
            <Alert className="mb-4 border-zinc-300 bg-zinc-100 dark:bg-zinc-800/50 dark:border-zinc-600">
              <AlertDescription>{t('approval.closedReason')}</AlertDescription>
            </Alert>
          )}
          <FormProvider {...form}>
            <form onSubmit={handleFormSubmit} className="space-y-0">
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8 xl:gap-10 items-start">
                <div className="flex flex-col gap-6 min-w-0">
                  <section className="space-y-1" aria-label={t('order.sections.header')}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-200/80 dark:bg-zinc-700/50 text-xs font-bold text-zinc-600 dark:text-zinc-300">
                        1
                      </span>
                      <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                        {t('order.sections.header')}
                      </h3>
                    </div>
                    <OrderHeaderForm
                      exchangeRates={exchangeRates}
                      onExchangeRatesChange={setExchangeRates}
                      quotationNotes={quotationNotes}
                      onQuotationNotesChange={setQuotationNotes}
                      onSaveNotes={async (notes) => {
                        const list = orderNotesDtoToNotesList(notes);
                        if (list.length > 15) {
                          toast.error(t('order.update.error'), {
                            description: t('quotation.notes.maxCountError'),
                          });
                          throw new Error('maxCount');
                        }
                        const overLimit = (['note1', 'note2', 'note3', 'note4', 'note5', 'note6', 'note7', 'note8', 'note9', 'note10', 'note11', 'note12', 'note13', 'note14', 'note15'] as const).find((k) => (notes[k]?.length ?? 0) > 100);
                        if (overLimit) {
                          toast.error(t('order.update.error'), {
                            description: t('quotation.notes.maxLengthError'),
                          });
                          throw new Error('maxLength');
                        }
                        try {
                          await updateNotesMutation.mutateAsync({ notes: list });
                          toast.success(t('quotation.notes.saved'));
                        } catch (err) {
                          toast.error(t('order.update.error'), {
                            description: err instanceof Error ? err.message : t('quotation.notes.saveError'),
                          });
                          throw err;
                        }
                      }}
                      isSavingNotes={updateNotesMutation.isPending}
                      lines={lines}
                      onLinesChange={async () => {
                        const newCurrency = form.getValues('order.currency');
                        if (newCurrency) {
                          await handleCurrencyChange(newCurrency);
                        }
                      }}
                      initialCurrency={order?.currency}
                      revisionNo={order?.revisionNo}
                      orderId={orderId}
                      orderOfferNo={order?.offerNo}
                      readOnly={isReadOnly}
                      showDocumentSerialType={false}
                    />
                  </section>

                  <section className="space-y-1 pt-2" aria-label={t('order.sections.lines')}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-200/80 dark:bg-zinc-700/50 text-xs font-bold text-zinc-600 dark:text-zinc-300">
                        2
                      </span>
                      <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                        {t('order.sections.lines')}
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
                      orderId={orderId}
                      enabled={linesEnabled}
                    />
                  </section>
                </div>

                <aside className="xl:sticky xl:top-6">
                  <div className="flex items-center gap-2 mb-3 xl:mb-4">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      3
                    </span>
                    <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                      {t('order.sections.summary')}
                    </h3>
                  </div>
                  <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm overflow-hidden">
                    <OrderSummaryCard lines={lines} currency={watchedCurrency} />
                  </div>
                </aside>
              </div>

              <div className="flex items-center justify-end gap-3 pt-8 mt-8 border-t border-zinc-200 dark:border-white/10">
                {order?.status === 0 && !isReadOnly && orderStatus !== 4 && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleStartApprovalFlow}
                    disabled={startApprovalFlow.isPending || !order}
                    className="h-10"
                  >
                    {startApprovalFlow.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('order.approval.sending')}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        {t('order.approval.sendForApproval')}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </FormProvider>
        </TabsContent>

        <TabsContent value="approval-flow" className="mt-6 focus-visible:outline-none">
          <OrderApprovalFlowTab orderId={orderId} />
        </TabsContent>

        <TabsContent value="report" className="mt-6 focus-visible:outline-none">
          <ReportTemplateTab entityId={orderId} ruleType={DocumentRuleType.Order} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
