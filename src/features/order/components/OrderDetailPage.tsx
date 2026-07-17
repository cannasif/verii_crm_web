import { type Dispatch, type ReactElement, type SetStateAction, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, FormProvider, useFormState } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getDocumentReturnTo } from '@/lib/document-return-navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useOrder } from '../hooks/useOrder';
import { useStartApprovalFlow } from '../hooks/useStartApprovalFlow';
import { useOrderExchangeRates } from '../hooks/useOrderExchangeRates';
import { useOrderLines } from '../hooks/useOrderLines';
import { useOrderNotes } from '../hooks/useOrderNotes';
import { useUpdateOrderNotesList } from '../hooks/useUpdateOrderNotesList';
import { usePriceRuleOfOrder } from '../hooks/usePriceRuleOfOrder';
import { useUserDiscountLimitsBySalesperson } from '../hooks/useUserDiscountLimitsBySalesperson';
import { useCustomerOptions } from '@/features/customer-management/hooks/useCustomerOptions';
import { useCustomer } from '@/features/customer-management/hooks/useCustomer';
import { useOrderPdfExportPreview } from '../hooks/useOrderPdfExportPreview';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { recordCustomerDocumentSerialUsageSafely } from '@/features/document-serial-type-management/utils/customer-document-serial-usage';
import { CustomerDocumentSerialDocumentKind } from '@/features/document-serial-type-management/types/document-serial-type-types';
import { Button } from '@/components/ui/button';
import { DocumentDetailPageHeader } from '@/components/shared/DocumentDetailPageHeader';
import { CustomerCancellationDialog } from '@/components/shared/CustomerCancellationDialog';
import { DocumentDetailStatusAlerts } from '@/components/shared/DocumentDetailStatusAlerts';
import { FormSubmitTooltipWrap } from '@/components/shared/FormSubmitTooltipWrap';
import { SendForApprovalHintWrap } from '@/components/shared/SendForApprovalHintWrap';
import {
  DOCUMENT_DETAIL_BUTTON_APPROVAL,
  DOCUMENT_DETAIL_BUTTON_BASE,
  DOCUMENT_DETAIL_BUTTON_DANGER,
  DOCUMENT_DETAIL_BUTTON_PREVIEW,
  DOCUMENT_DETAIL_BUTTON_SAVE,
} from '@/lib/document-detail-button-styles';
import { useHeaderSaveTooltipState } from '@/lib/header-save-required-hints';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Layers, Loader2, FileCheck, FileText, XCircle, Eye, Save } from 'lucide-react';
import { OrderApprovalFlowTab } from './OrderApprovalFlowTab';
import { ReportTemplateTab, DocumentRuleType } from '@/features/report-designer';
import { cn } from '@/lib/utils';
import { createOrderSchema, type CreateOrderSchema } from '../schemas/order-schema';
import type { CreateOrderLineDto, OrderExchangeRateCreateDto, OrderLineFormState, OrderExchangeRateFormState, CreateOrderDto, PricingRuleLineGetDto, UserDiscountLimitDto, OrderLineGetDto } from '../types/order-types';
import { orderApi } from '../api/order-api';
import { QUOTATION_QUERY_KEYS, queryKeys } from '../utils/query-keys';
import { DEFAULT_OFFER_TYPE, normalizeOfferType } from '@/types/offer-type';
import type { QuotationNotesDto } from '@/features/quotation/types/quotation-types';
import { createEmptyQuotationNotes } from '@/features/quotation/components/QuotationNotesDialog';
import { orderNotesGetDtoToDto, orderNotesDtoToNotesList } from '../utils/notes-mapper';
import { OrderHeaderForm } from './OrderHeaderForm';
import { OrderLineTable } from './OrderLineTable';
import { OrderSummaryCard } from './OrderSummaryCard';
import { useOrderCalculations } from '../hooks/useOrderCalculations';
import { calculateLineTotalsAmounts } from '@/lib/line-discount-display';
import {
  fetchLocalizedStockMapByErpCodes,
  localizeLoadedLineProductName,
  resolveLoadedLineUnit,
} from '@/features/stock/utils/localized-stock-name';
import { createClientId } from '@/lib/create-client-id';
import { deduplicateDocumentLinesByBackendId, resolveDocumentLineBackendId } from '@/lib/document-line-list-update';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import { buildEffectiveExchangeRates } from '@/features/sales-documents/utils/exchange-rate-snapshot';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import { resolveWatchedDocumentCurrency } from '@/lib/line-unit-price-currency';
import { findExchangeRateByDovizTipi } from '../utils/price-conversion';
import { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';
import { useCrudPermissions } from '@/features/access-control/hooks/useCrudPermissions';
import { useCanEditOrder } from '../hooks/useCanEditOrder';
import { useCancelOrderByCustomer } from '../hooks/useCancelOrderByCustomer';

function parsePersistedId(formId: string | number | undefined, prefix: string): number | null {
  if (formId == null) return null;
  if (typeof formId === 'number' && Number.isFinite(formId) && formId > 0) return formId;
  const value = String(formId).trim();
  const prefixed = value.match(new RegExp(`^${prefix}-(\\d+)(?:-|$)`));
  if (prefixed) {
    const parsed = parseInt(prefixed[1], 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (/^\d+$/.test(value)) {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function addDaysToDateOnly(dateValue: string, days: number): string {
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export function OrderDetailPage(): ReactElement {
  const { t, i18n } = useTranslation(['order', 'approval', 'common']);
  const { canUpdate } = useCrudPermissions('sales.orders.update');
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setPageTitle } = useUIStore();
  const branch = useAuthStore((state) => state.branch);
  const orderId = id ? parseInt(id, 10) : 0;
  const returnTo = getDocumentReturnTo(location.state);

  const handleBackToList = useCallback(async (): Promise<void> => {
    if (returnTo) {
      navigate(returnTo);
      return;
    }
    await queryClient.refetchQueries({ queryKey: [QUOTATION_QUERY_KEYS.QUOTATIONS] });
    navigate('/orders');
  }, [queryClient, navigate, returnTo]);

  const { data: order, isLoading } = useOrder(orderId);
  const { data: canEditWhileWaiting = false, isLoading: isLoadingCanEdit } = useCanEditOrder(orderId);
  const { data: exchangeRatesData = [], isLoading: isLoadingExchangeRates } = useOrderExchangeRates(orderId);
  const { data: linesData = [], isPending: isPendingLines } = useOrderLines(orderId);
  const { data: notesData, isLoading: isLoadingNotes } = useOrderNotes(orderId);
  const updateNotesMutation = useUpdateOrderNotesList(orderId);
  const startApprovalFlow = useStartApprovalFlow();
  const cancelByCustomerMutation = useCancelOrderByCustomer();

  const [lines, setLinesState] = useState<OrderLineFormState[]>([]);
  const [exchangeRates, setExchangeRates] = useState<OrderExchangeRateFormState[]>([]);
  const [quotationNotes, setQuotationNotes] = useState<QuotationNotesDto>(createEmptyQuotationNotes);
  const [pricingRules, setPricingRules] = useState<PricingRuleLineGetDto[]>([]);
  const [temporarySallerData, setTemporarySallerData] = useState<UserDiscountLimitDto[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const linesInitializedRef = useRef(false);
  const linesDirtyRef = useRef(false);

  const setOrderLines = useCallback<Dispatch<SetStateAction<OrderLineFormState[]>>>((action) => {
    linesDirtyRef.current = true;
    setLinesState(action);
  }, []);
  const notesInitializedRef = useRef(false);
  const exchangeRatesInitializedRef = useRef(false);
  const formInitializedRef = useRef(false);
  const offerDateSyncInitializedRef = useRef(false);
  const [activeTab, setActiveTab] = useState('detail');
  const [customerCancellationOpen, setCustomerCancellationOpen] = useState(false);
  const orderStatus = Number((order as { status?: number; Status?: number })?.status ?? (order as { status?: number; Status?: number })?.Status);
  const isDraftDocument = orderStatus === 0;
  const isApprovalWaiting = orderStatus === 1;
  const isReadOnlyByStatus = [2, 3, 4, 5, 6, 7].includes(orderStatus);
  const isApprovalLockedForCurrentUser = isApprovalWaiting && !canEditWhileWaiting;
  const isReadOnly = isReadOnlyByStatus || isApprovalLockedForCurrentUser;
  const canCancelByCustomer = canUpdate && !order?.isERPIntegrated && ![4, 5, 6, 7].includes(orderStatus);
  const editEnabled = canUpdate && !isReadOnly;
  const linesEnabled = editEnabled;

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
        representativeId: null,
        koliBaskiDefinitionId: null,
      },
    },
  });
  const { isValid: isFormValid } = useFormState({ control: form.control });

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
          activityId: order.activityId || null,
          projectCode: projectCodeValue,
          ozelKod1: order.ozelKod1 ?? (raw.OzelKod1 as string) ?? '',
          ozelKod2: order.ozelKod2 ?? (raw.OzelKod2 as string) ?? '',
          status: order.status ?? null,
          description: order.description || null,
          paymentTypeId: order.paymentTypeId || null,
          paymentTermDays: order.paymentTermDays ?? null,
          documentSerialTypeId: order.documentSerialTypeId || null,
          offerNo: order.offerNo || null,
          revisionNo: order.revisionNo || null,
          revisionId: order.revisionId || null,
          generalDiscountRate: order.generalDiscountRate ?? null,
          generalDiscountAmount: order.generalDiscountAmount ?? null,
          koliBaskiDefinitionId: order.koliBaskiDefinitionId ?? (raw.KoliBaskiDefinitionId as number) ?? null,
          deliveryMethod: deliveryMethodValue,
        },
      });
      formInitializedRef.current = true;
      offerDateSyncInitializedRef.current = false;
    }
  }, [order, form]);

  useEffect(() => {
    linesInitializedRef.current = false;
    linesDirtyRef.current = false;
    notesInitializedRef.current = false;
    exchangeRatesInitializedRef.current = false;
    formInitializedRef.current = false;
    offerDateSyncInitializedRef.current = false;
  }, [orderId]);

  useEffect(() => {
    if (!orderId || orderId < 1) return;
    if (notesInitializedRef.current) return;
    if (notesData === undefined) return;
    setQuotationNotes(orderNotesGetDtoToDto(notesData ?? null));
    notesInitializedRef.current = true;
  }, [orderId, notesData]);

  const formatLoadedOrderLines = useCallback(async (sourceLines: OrderLineGetDto[]): Promise<OrderLineFormState[]> => {
    const stockByCode = await fetchLocalizedStockMapByErpCodes(
      sourceLines.map((line) => line.productCode ?? '')
    );

    return deduplicateDocumentLinesByBackendId(sourceLines.map((line, _index) => {
        const amounts = calculateLineTotalsAmounts(
          line.unitPrice,
          line.quantity,
          line.discountRate1,
          line.discountRate2,
          line.discountRate3,
          line.vatRate,
        );
        return {
          id: createClientId(),
          backendLineId: line.id && line.id > 0 ? line.id : null,
          isEditing: false,
          productCode: line.productCode || '',
          productName: localizeLoadedLineProductName(line, stockByCode, i18n.language),
          unit: resolveLoadedLineUnit(line, stockByCode),
          groupCode: line.groupCode || null,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountRate1: line.discountRate1,
          discountRate2: line.discountRate2,
          discountRate3: line.discountRate3,
          vatRate: line.vatRate,
          description: line.description || null,
          description1: line.description1 || null,
          description2: line.description2 || null,
          description3: line.description3 || null,
          profilDefinitionId: line.profilDefinitionId ?? null,
          demirDefinitionId: line.demirDefinitionId ?? null,
          vidaDefinitionId: line.vidaDefinitionId ?? null,
          vidaDefinitionName: line.vidaDefinitionName ?? null,
          baskiDefinitionId: line.baskiDefinitionId ?? null,
          baskiDefinitionName: line.baskiDefinitionName ?? null,
          baskiAciklama: line.baskiAciklama ?? null,
          pricingRuleHeaderId: line.pricingRuleHeaderId || null,
          imagePath: line.imagePath || null,
          relatedStockId: line.relatedStockId || null,
          relatedProductKey: line.relatedProductKey || null,
          isMainRelatedProduct: line.isMainRelatedProduct || false,
          approvalStatus: line.approvalStatus,
          ...amounts,
        };
      }));
  }, [i18n.language]);

  const replaceOrderLinesFromServer = useCallback(async (sourceLines: OrderLineGetDto[]): Promise<void> => {
    const formattedLines = await formatLoadedOrderLines(sourceLines);
    linesDirtyRef.current = false;
    setLinesState(formattedLines);
    linesInitializedRef.current = true;
  }, [formatLoadedOrderLines]);

  useEffect(() => {
    if (linesDirtyRef.current) return;
    if (!linesData || linesData.length === 0 || linesInitializedRef.current) return;

    let cancelled = false;

    const loadLines = async (): Promise<void> => {
      const formattedLines = await formatLoadedOrderLines(linesData);
      if (cancelled) return;
      if (linesDirtyRef.current) {
        linesInitializedRef.current = true;
        return;
      }

      setLinesState(formattedLines);
      linesInitializedRef.current = true;
    };

    void loadLines();

    return () => {
      cancelled = true;
    };
  }, [linesData, formatLoadedOrderLines]);

  const { calculateLineTotals } = useOrderCalculations();
  const { data: erpRates = [] } = useExchangeRate();
  const { currencyOptions: currencyOptionsForExchangeRates, currencyOptions } = useCurrencyOptions();

  useEffect(() => {
    if (exchangeRatesData && exchangeRatesData.length > 0 && !exchangeRatesInitializedRef.current && currencyOptionsForExchangeRates.length > 0) {
      const formattedExchangeRates: OrderExchangeRateFormState[] = exchangeRatesData.map((rate) => {
        const normalizedCurrency = String(rate.currency ?? '').trim();
        const numericCurrency = Number(normalizedCurrency);
        const resolvedDovizTipi = !Number.isNaN(numericCurrency)
          ? numericCurrency
          : undefined;
        const currencyOption = currencyOptionsForExchangeRates.find(
          (opt) =>
            (resolvedDovizTipi != null && opt.dovizTipi === resolvedDovizTipi) ||
            opt.dovizIsmi?.toUpperCase() === normalizedCurrency.toUpperCase() ||
            opt.code?.toUpperCase() === normalizedCurrency.toUpperCase()
        );
        
        return {
          id: `rate-${rate.id}`,
          currency: normalizedCurrency,
          exchangeRate: rate.exchangeRate,
          exchangeRateDate: rate.exchangeRateDate ? rate.exchangeRateDate.split('T')[0] : new Date().toISOString().split('T')[0],
          isOfficial: rate.isOfficial,
          dovizTipi: currencyOption?.dovizTipi ?? resolvedDovizTipi,
        };
      });
      setExchangeRates(formattedExchangeRates);
      exchangeRatesInitializedRef.current = true;
    }
  }, [exchangeRatesData, currencyOptionsForExchangeRates]);

  const watchedCurrencyValue = form.watch('order.currency');
  const watchedCurrency = useMemo(
    () => resolveWatchedDocumentCurrency(watchedCurrencyValue, currencyOptions, erpRates),
    [watchedCurrencyValue, currencyOptions, erpRates]
  );
  const watchedCustomerId = form.watch('order.potentialCustomerId');
  const watchedErpCustomerCode = form.watch('order.erpCustomerCode');
  const watchedRepresentativeId = form.watch('order.representativeId');
  const { data: customerOptions = [] } = useCustomerOptions(watchedRepresentativeId);
  const watchedOfferDate = form.watch('order.offerDate');
  const orderFormSlice = form.watch('order');

  const { hintLines: saveManualHintLines, schemaPayload: orderSchemaPayload } = useHeaderSaveTooltipState(
    form.control,
    'order',
    (key) => t(key, { ns: 'common' }),
  );

  const currencyCode = useMemo(() => {
    const found = currencyOptions.find((opt) => opt.dovizTipi === watchedCurrency);
    return found?.code || 'TRY';
  }, [watchedCurrency, currencyOptions]);

  const { data: selectedCustomer } = useCustomer(
    watchedCustomerId ?? 0,
    Boolean(watchedCustomerId && watchedCustomerId > 0),
  );

  const pdfShareFileName = `siparis-${order?.offerNo || 'detay'}.pdf`;

  const pdfExport = useOrderPdfExportPreview({
    lines,
    orderFormSlice,
    currencyCode,
    customerOptions,
    selectedCustomer,
    order,
    orderId,
    quotationNotes,
    detailShareFileName: pdfShareFileName,
    emptyLinesToastTitle: t('order.update.error'),
    asDraft: isDraftDocument,
  });

  useEffect(() => {
    if (!watchedOfferDate || isReadOnly) return;

    if (!offerDateSyncInitializedRef.current) {
      offerDateSyncInitializedRef.current = true;
      return;
    }

    form.setValue('order.deliveryDate', addDaysToDateOnly(watchedOfferDate, 21), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [form, isReadOnly, watchedOfferDate]);

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
        const { id, backendLineId, isEditing, relatedLines, vidaDefinitionName, baskiDefinitionName, ...cleanLineData } =
          line as OrderLineFormState & { relatedLines?: unknown[] };
        const persistedLineId = resolveDocumentLineBackendId({
          id: typeof id === 'number' ? String(id) : id ?? '',
          backendLineId,
        });
        void vidaDefinitionName;
        void baskiDefinitionName;
        return {
          ...cleanLineData,
          id: persistedLineId,
          orderId: orderId,
          productId: cleanLineData.productId ?? null,
          description: cleanLineData.description || null,
          description1: cleanLineData.description1 || null,
          description2: cleanLineData.description2 || null,
          description3: cleanLineData.description3 || null,
          profilDefinitionId: cleanLineData.profilDefinitionId ?? null,
          demirDefinitionId: cleanLineData.demirDefinitionId ?? null,
          vidaDefinitionId: cleanLineData.vidaDefinitionId ?? null,
          baskiDefinitionId: cleanLineData.baskiDefinitionId ?? null,
          baskiAciklama: cleanLineData.baskiAciklama?.trim() || null,
          pricingRuleHeaderId: cleanLineData.pricingRuleHeaderId && cleanLineData.pricingRuleHeaderId > 0 ? cleanLineData.pricingRuleHeaderId : null,
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
              id: parsePersistedId(id, 'rate'),
              ...rate,
              currency: currencyValue,
              orderId: orderId,
              isOfficial: rate.isOfficial ?? true,
            };
          })
        : undefined;
      
      if (currencyValue == null || currencyValue === '' || Number.isNaN(Number(currencyValue))) {
        throw new Error(t('order.update.invalidCurrency'));
      }

      const normalizedStatus =
        data.order.status == null || Number.isNaN(Number(data.order.status))
          ? Number.isFinite(orderStatus)
            ? orderStatus
            : 0
          : Number(data.order.status);

      const orderData: CreateOrderDto = {
        offerType: data.order.offerType,
        currency: currencyValue,
        potentialCustomerId: (data.order.potentialCustomerId && data.order.potentialCustomerId > 0) ? data.order.potentialCustomerId : null,
        erpCustomerCode: data.order.erpCustomerCode || null,
        deliveryDate: data.order.deliveryDate || null,
        shippingAddressId: (data.order.shippingAddressId && data.order.shippingAddressId > 0) ? data.order.shippingAddressId : null,
        representativeId: (data.order.representativeId && data.order.representativeId > 0) ? data.order.representativeId : null,
        activityId: (data.order.activityId && data.order.activityId > 0) ? data.order.activityId : null,
        projectCode: data.order.projectCode || null,
        status: normalizedStatus,
        description: data.order.description || null,
        paymentTypeId: (data.order.paymentTypeId && data.order.paymentTypeId > 0) ? data.order.paymentTypeId : null,
        paymentTermDays: data.order.paymentTermDays ?? null,
        documentSerialTypeId: (data.order.documentSerialTypeId && data.order.documentSerialTypeId > 0) ? data.order.documentSerialTypeId : null,
        offerDate: data.order.offerDate || null,
        offerNo: data.order.offerNo || null,
        revisionNo: data.order.revisionNo || null,
        revisionId: (data.order.revisionId && data.order.revisionId > 0) ? data.order.revisionId : null,
        generalDiscountRate: data.order.generalDiscountRate ?? null,
        generalDiscountAmount: data.order.generalDiscountAmount ?? null,
        koliBaskiDefinitionId: (data.order.koliBaskiDefinitionId && data.order.koliBaskiDefinitionId > 0) ? data.order.koliBaskiDefinitionId : null,
        salesTypeDefinitionId: data.order.deliveryMethod ? Number(data.order.deliveryMethod) : null,
        ozelKod1: data.order.ozelKod1 || null,
        ozelKod2: data.order.ozelKod2 || null,
        erpProjectCode: data.order.projectCode ?? null,
      };

      const notesList = orderNotesDtoToNotesList(quotationNotes);
      if (notesList.length > 15) {
        toast.error(t('order.update.error'), {
          description: t('quotation.notes.maxCountError'),
        });
        return;
      }

      setIsUpdating(true);

      const persistedLineIds = new Set(
        linesData.map((line) => line.id).filter((id): id is number => Number.isFinite(id) && id > 0)
      );
      const currentPersistedLineIds = new Set(
        linesToSend
          .map((line) => (typeof line.id === 'number' ? line.id : null))
          .filter((id): id is number => Number.isFinite(id ?? 0) && (id ?? 0) > 0)
      );
      const deletedLineIds = [...persistedLineIds].filter((id) => !currentPersistedLineIds.has(id));
      const newLines = linesToSend
        .filter((line) => !(typeof line.id === 'number' && line.id > 0))
        .map(({ id: _id, ...line }) => line as CreateOrderLineDto);
      const updatedLines = linesToSend
        .filter((line) => typeof line.id === 'number' && line.id > 0)
        .map((line) => ({
          ...line,
          id: line.id as number,
          orderId,
          createdAt: linesData.find((existing) => existing.id === line.id)?.createdAt ?? new Date().toISOString(),
        })) as OrderLineGetDto[];

      const rateRows = exchangeRatesToSend ?? [];
      const persistedRateIds = new Set(
        exchangeRatesData.map((rate) => rate.id).filter((id): id is number => Number.isFinite(id) && id > 0)
      );
      const currentPersistedRateIds = new Set(
        rateRows
          .map((rate) => rate.id ?? null)
          .filter((id): id is number => Number.isFinite(id ?? 0) && (id ?? 0) > 0)
      );
      const deletedRateIds = [...persistedRateIds].filter((id) => !currentPersistedRateIds.has(id));
      const newRates = rateRows
        .filter((rate) => !rate.id || rate.id <= 0)
        .map(({ id: _id, ...rate }) => rate as OrderExchangeRateCreateDto);
      const updatedRates = rateRows
        .filter((rate) => rate.id && rate.id > 0)
        .map((rate) => ({ id: rate.id as number, dto: { ...rate, id: undefined } as OrderExchangeRateCreateDto }));

      await orderApi.updateHeader(orderId, orderData);
      await Promise.all(deletedLineIds.map((lineId) => orderApi.deleteOrderLine(lineId)));
      if (updatedLines.length > 0) await orderApi.updateOrderLines(updatedLines);
      if (newLines.length > 0) await orderApi.createOrderLines(newLines);
      await Promise.all(deletedRateIds.map((rateId) => orderApi.deleteOrderExchangeRate(rateId)));
      await Promise.all(updatedRates.map((rate) => orderApi.updateOrderExchangeRate(rate.id, rate.dto)));
      await Promise.all(newRates.map((rate) => orderApi.createOrderExchangeRate(rate)));
      await updateNotesMutation.mutateAsync({ notes: notesList });
      await recordCustomerDocumentSerialUsageSafely({
        customerId: orderData.potentialCustomerId,
        documentKind: CustomerDocumentSerialDocumentKind.Order,
        documentSerialTypeId: orderData.documentSerialTypeId,
        documentId: orderId,
        documentNo: orderData.offerNo,
        requestBranchCode: order?.requestBranchCode?.trim() || branch?.code?.trim() || null,
      });

      const refreshedLines = await orderApi.getOrderLinesByOrderId(orderId);
      queryClient.setQueryData(queryKeys.orderLines(orderId), refreshedLines);
      await replaceOrderLinesFromServer(refreshedLines);

      await Promise.all([
        queryClient.refetchQueries({ queryKey: [QUOTATION_QUERY_KEYS.QUOTATIONS] }),
        queryClient.refetchQueries({ queryKey: queryKeys.order(orderId) }),
      ]);

      toast.success(t('order.update.success'), {
        description: t('order.update.successMessage'),
      });
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
    } finally {
      setIsUpdating(false);
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
      toast.error(t('order.update.error'), {
        description: t('order.exchangeRates.zeroRateError', {
          defaultValue: 'Lütfen devam edebilmek için kur değeri girin.',
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
        const updatedLine = { ...line, unitPrice: newUnitPrice };
        return calculateLineTotals(updatedLine);
      })
    );
    setOrderLines(updatedLines);
  };

  const handleFormSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (isReadOnly) return;
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

  const handleCancelByCustomer = async (reason: string): Promise<void> => {
    if (!order || !canCancelByCustomer) return;

    await cancelByCustomerMutation.mutateAsync({
      id: order.id,
      reason,
    });
    setCustomerCancellationOpen(false);
  };

  if (isLoading || isLoadingCanEdit || isLoadingExchangeRates || isPendingLines || isLoadingNotes) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 border border-zinc-300 dark:border-zinc-700/80 rounded-xl bg-white/50 dark:bg-card/50">
        <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
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
        <Button variant="outline" onClick={() => void handleBackToList()}>
          {t('order.backToOrders')}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 relative pb-10">
      <DocumentDetailPageHeader
        title={t('order.detail.title', { offerNo: order.offerNo || `#${order.id}` })}
        subtitle={
          <>
            <p>{t('order.detail.subtitle')}</p>
            {order.revisionNo != null && order.revisionNo !== '' ? (
              <p className="mt-1">
                {t('order.detail.revisionNo')}: {order.revisionNo}
              </p>
            ) : null}
          </>
        }
        onBack={() => void handleBackToList()}
        backLabel={t('order.backToOrders')}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="h-auto gap-1 overflow-x-auto rounded-xl border border-zinc-300/95 bg-zinc-100 p-1 shadow-none scrollbar-hide justify-start dark:border-zinc-800 dark:bg-black/90 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] w-full">
          <TabsTrigger
            value="detail"
            className={cn(
              'rounded-lg border border-transparent px-4 py-2 shrink-0 transition-colors',
              'text-zinc-600 dark:text-zinc-500',
              'data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:border-zinc-300',
              'dark:data-[state=active]:border-zinc-600 dark:data-[state=active]:bg-zinc-950 dark:data-[state=active]:shadow-[0_0_0_1px_rgba(236,72,153,0.2),0_0_28px_-8px_rgba(236,72,153,0.28)]',
              activeTab === 'detail' && 'data-[state=active]:text-primary dark:data-[state=active]:text-primary data-[state=active]:font-medium'
            )}
          >
            <Layers className="h-4 w-4 mr-2" />
            {t('order.detail.tabDetail')}
          </TabsTrigger>
          <TabsTrigger
            value="approval-flow"
            className={cn(
              'rounded-lg border border-transparent px-4 py-2 shrink-0 transition-colors',
              'text-zinc-600 dark:text-zinc-500',
              'data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:border-zinc-300',
              'dark:data-[state=active]:border-zinc-600 dark:data-[state=active]:bg-zinc-950 dark:data-[state=active]:shadow-[0_0_0_1px_rgba(236,72,153,0.2),0_0_28px_-8px_rgba(236,72,153,0.28)]',
              activeTab === 'approval-flow' && 'data-[state=active]:text-primary dark:data-[state=active]:text-primary data-[state=active]:font-medium'
            )}
          >
            <FileCheck className="h-4 w-4 mr-2" />
            {t('order.detail.tabApprovalFlow')}
          </TabsTrigger>
          <TabsTrigger
            value="report"
            className={cn(
              'rounded-lg border border-transparent px-4 py-2 shrink-0 transition-colors',
              'text-zinc-600 dark:text-zinc-500',
              'data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:border-zinc-300',
              'dark:data-[state=active]:border-zinc-600 dark:data-[state=active]:bg-zinc-950 dark:data-[state=active]:shadow-[0_0_0_1px_rgba(236,72,153,0.2),0_0_28px_-8px_rgba(236,72,153,0.28)]',
              activeTab === 'report' && 'data-[state=active]:text-primary dark:data-[state=active]:text-primary data-[state=active]:font-medium'
            )}
          >
            <FileText className="h-4 w-4 mr-2" />
            {t('order.detail.tabReport')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detail" className="mt-6 focus-visible:outline-none">
          <DocumentDetailStatusAlerts
            documentKind="order"
            status={orderStatus}
            isApprovalLockedForCurrentUser={isApprovalLockedForCurrentUser}
            cancellationReason={order.cancellationReason}
          />
          <FormProvider {...form}>
            <form onSubmit={handleFormSubmit} className="space-y-0">
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8 xl:gap-10 items-start">
                <div className="flex flex-col gap-6 min-w-0">
                  <section aria-label={t('order.sections.header')}>
                    <div className="rounded-xl border border-zinc-300 dark:border-zinc-600/90 bg-white dark:bg-zinc-950/40 p-4 sm:p-5 space-y-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-700/70 text-xs font-bold text-zinc-700 dark:text-zinc-200 border border-zinc-300/80 dark:border-zinc-600">
                          1
                        </span>
                        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
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
                      onCurrencyChange={async (_oldCurrency, newCurrency) => {
                        await handleCurrencyChange(String(newCurrency));
                      }}
                      initialCurrency={order?.currency}
                      revisionNo={order?.revisionNo}
                      orderId={orderId}
                      orderOfferNo={order?.offerNo}
                      readOnly={!editEnabled}
                      showDocumentSerialType={false}
                    />
                    </div>
                  </section>

                  <section aria-label={t('order.sections.lines')}>
                    <div className="rounded-xl border border-zinc-300 dark:border-zinc-600/90 bg-white dark:bg-zinc-950/40 p-4 sm:p-5 space-y-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-700/70 text-xs font-bold text-zinc-700 dark:text-zinc-200 border border-zinc-300/80 dark:border-zinc-600">
                          2
                        </span>
                        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                          {t('order.sections.lines')}
                        </h3>
                      </div>
                    <OrderLineTable
                      lines={lines}
                      setLines={setOrderLines}
                      currency={watchedCurrency}
                      exchangeRates={exchangeRates}
                      pricingRules={pricingRules}
                      userDiscountLimits={temporarySallerData}
                      customerId={watchedCustomerId}
                      erpCustomerCode={watchedErpCustomerCode}
                      representativeId={watchedRepresentativeId}
                      orderId={orderId}
                      enabled={linesEnabled}
                      offerType={form.watch('order.offerType')}
                      buildExportPdfBlob={pdfExport.buildExportPdfBlob}
                      exportPdfFileName={pdfShareFileName}
                      exportPdfAsDraft={isDraftDocument}
                    />
                    </div>
                  </section>
                </div>

                <aside className="xl:sticky xl:top-6">
                  <div className="rounded-xl border border-zinc-300 dark:border-zinc-600/90 bg-white dark:bg-zinc-950/40 p-4 sm:p-5 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200/90 dark:border-emerald-800/80">
                        3
                      </span>
                      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                        {t('order.sections.summary')}
                      </h3>
                    </div>
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-900/60 overflow-hidden">
                      <OrderSummaryCard lines={lines} currency={watchedCurrency} />
                    </div>
                  </div>
                </aside>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-8 mt-8 border-t border-zinc-200 dark:border-white/10">
                {!isReadOnly && (
                  <FormSubmitTooltipWrap
                    schema={createOrderSchema}
                    value={orderSchemaPayload}
                    isValid={isFormValid}
                    isPending={isUpdating}
                    manualHintLines={saveManualHintLines}
                  >
                    <Button
                      type="submit"
                      disabled={isUpdating || !isFormValid}
                      className={`group sm:min-w-[140px] ${DOCUMENT_DETAIL_BUTTON_BASE} ${DOCUMENT_DETAIL_BUTTON_SAVE}`}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isUpdating
                        ? t('order.saving')
                        : t('order.update.saveButton', { defaultValue: 'Güncellemeyi Kaydet' })}
                    </Button>
                  </FormSubmitTooltipWrap>
                )}

                <Button
                  type="button"
                  onClick={pdfExport.openPdfExportPreview}
                  className={`group ${DOCUMENT_DETAIL_BUTTON_BASE} ${DOCUMENT_DETAIL_BUTTON_PREVIEW}`}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {t('order.exportPreview.trigger')}
                </Button>

                {orderStatus === 0 && !isReadOnly && (
                  <SendForApprovalHintWrap documentType="order">
                    <Button
                      type="button"
                      onClick={handleStartApprovalFlow}
                      disabled={isUpdating || startApprovalFlow.isPending || !order}
                      className={`${DOCUMENT_DETAIL_BUTTON_BASE} ${DOCUMENT_DETAIL_BUTTON_APPROVAL}`}
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
                  </SendForApprovalHintWrap>
                )}

                {canCancelByCustomer && (
                  <Button
                    type="button"
                    onClick={() => setCustomerCancellationOpen(true)}
                    disabled={isUpdating || cancelByCustomerMutation.isPending || !order}
                    className={`${DOCUMENT_DETAIL_BUTTON_BASE} ${DOCUMENT_DETAIL_BUTTON_DANGER}`}
                  >
                    {cancelByCustomerMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    {t('order:customerCancel.button', { defaultValue: 'Müşteri İptali' })}
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
          <ReportTemplateTab
            entityId={orderId}
            ruleType={DocumentRuleType.Order}
            builtInTemplates={pdfExport.reportBuiltInTemplates}
          />
        </TabsContent>
      </Tabs>

      {pdfExport.renderPdfExportDialogs()}

      <CustomerCancellationDialog
        open={customerCancellationOpen}
        onOpenChange={setCustomerCancellationOpen}
        isPending={cancelByCustomerMutation.isPending}
        title={t('order:customerCancel.title', { defaultValue: 'Müşteri iptali' })}
        description={t('order:customerCancel.description', {
          defaultValue: 'Bu siparişi müşteri tarafından iptal edildi olarak işaretlemek üzeresiniz.',
        })}
        reasonLabel={t('order:customerCancel.reasonLabel', { defaultValue: 'İptal nedeni' })}
        reasonPlaceholder={t('order:customerCancel.reasonPlaceholder', { defaultValue: 'Müşterinin iptal nedenini yazın...' })}
        cancelLabel={t('common.cancel', { ns: 'common' })}
        confirmLabel={t('order:customerCancel.confirmButton', { defaultValue: 'İptal Et' })}
        onConfirm={handleCancelByCustomer}
      />
    </div>
  );
}
