import { type Dispatch, type ReactElement, type SetStateAction, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, FormProvider, useFormState } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getDocumentReturnTo } from '@/lib/document-return-navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useQuotation } from '../hooks/useQuotation';
import { useStartApprovalFlow } from '../hooks/useStartApprovalFlow';
import { useQuotationExchangeRates } from '../hooks/useQuotationExchangeRates';
import { useQuotationLines } from '../hooks/useQuotationLines';
import { useQuotationNotes } from '../hooks/useQuotationNotes';
import { useUpdateQuotationNotesList } from '../hooks/useUpdateQuotationNotesList';
import { usePriceRuleOfQuotation } from '../hooks/usePriceRuleOfQuotation';
import { useUserDiscountLimitsBySalesperson } from '../hooks/useUserDiscountLimitsBySalesperson';
import { useCustomerOptions } from '@/features/customer-management/hooks/useCustomerOptions';
import { useCustomer } from '@/features/customer-management/hooks/useCustomer';
import { resolveQuotationCustomerLabelForPdf } from '@/lib/resolve-quotation-customer-label';
import { resolveWatchedDocumentCurrency } from '@/lib/line-unit-price-currency';
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
  DOCUMENT_DETAIL_BUTTON_REVISE,
  DOCUMENT_DETAIL_BUTTON_SAVE,
} from '@/lib/document-detail-button-styles';
import { useHeaderSaveTooltipState } from '@/lib/header-save-required-hints';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Layers, Loader2, FileCheck, FileText, Save, Eye, XCircle, GitBranchPlus } from 'lucide-react';
import { QuotationApprovalFlowTab } from './QuotationApprovalFlowTab';
import { QuotationPdfExportPreviewDialog } from './QuotationPdfExportPreviewDialog';
import { QuotationWhatsappSendDialog } from './QuotationWhatsappSendDialog';
import { isIntegratedQuotationShare } from '../config/quotation-share-config';
import { useQuotationNativeSharePrep } from '../hooks/useQuotationNativeSharePrep';
import { blobToFile, resolveCustomerPhone } from '../utils/quotation-share-utils';
import { QuotationMailShareDialogs, type QuotationMailShareContext } from './QuotationMailShareDialogs';
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
import { ReportTemplateTab, DocumentRuleType } from '@/features/report-designer';
import { cn } from '@/lib/utils';
import { createQuotationSchema, type CreateQuotationSchema } from '../schemas/quotation-schema';
import type { CreateQuotationLineDto, QuotationExchangeRateCreateDto, QuotationLineFormState, QuotationExchangeRateFormState, CreateQuotationDto, PricingRuleLineGetDto, UserDiscountLimitDto, QuotationNotesDto, QuotationLineGetDto } from '../types/quotation-types';
import { quotationApi } from '../api/quotation-api';
import { QUOTATION_QUERY_KEYS, queryKeys } from '../utils/query-keys';
import { DEFAULT_OFFER_TYPE, normalizeOfferType } from '@/types/offer-type';
import { createEmptyQuotationNotes } from './QuotationNotesDialog';
import { quotationNotesGetDtoToDto, quotationNotesDtoToNotesList } from '../utils/quotation-payload-mapper';
import { QuotationHeaderForm } from './QuotationHeaderForm';
import { QuotationLineTable } from './QuotationLineTable';
import { QuotationSummaryCard } from './QuotationSummaryCard';
import { usePrefetchLineImagesForPdf } from '../hooks/usePrefetchLineImagesForPdf';
import { useQuotationCalculations } from '../hooks/useQuotationCalculations';
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
import { findExchangeRateByDovizTipi } from '../utils/price-conversion';
import { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';
import { useCrudPermissions } from '@/features/access-control/hooks/useCrudPermissions';
import { useCanEditQuotation } from '../hooks/useCanEditQuotation';
import { useCancelQuotationByCustomer } from '../hooks/useCancelQuotationByCustomer';
import { useCreateRevisionOfQuotation } from '../hooks/useCreateRevisionOfQuotation';

function addDaysToDateOnly(dateValue: string, days: number): string {
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function parseQuotationIdFromPath(pathname: string): number {
  const parts = pathname.split('/');
  const idx = parts.indexOf('quotations');
  if (idx === -1 || idx === parts.length - 1) return 0;
  const segment = parts[idx + 1];
  if (!segment || segment === 'create' || segment === 'waiting-approvals') return 0;
  const num = parseInt(segment, 10);
  return Number.isNaN(num) ? 0 : num;
}

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

export function QuotationDetailPage(): ReactElement {
  const { t, i18n } = useTranslation(['quotation', 'approval', 'common']);
  const branch = useAuthStore((state) => state.branch);
  const { canUpdate } = useCrudPermissions('sales.quotations.update');
  const { id: paramId } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setPageTitle } = useUIStore();
  const quotationIdFromPath = parseQuotationIdFromPath(location.pathname);
  const quotationId = quotationIdFromPath > 0 ? quotationIdFromPath : (paramId ? parseInt(paramId, 10) : 0) || 0;
  const returnTo = getDocumentReturnTo(location.state);

  const handleBackToList = useCallback(async (): Promise<void> => {
    if (returnTo) {
      navigate(returnTo);
      return;
    }
    await queryClient.refetchQueries({ queryKey: [QUOTATION_QUERY_KEYS.QUOTATIONS] });
    navigate('/quotations');
  }, [queryClient, navigate, returnTo]);

  const { data: quotation, isLoading } = useQuotation(quotationId);
  const { data: canEditWhileWaiting = false, isLoading: isLoadingCanEdit } = useCanEditQuotation(quotationId);
  const { data: exchangeRatesData = [], isLoading: isLoadingExchangeRates } = useQuotationExchangeRates(quotationId);
  const { data: linesData = [], isPending: isPendingLines } = useQuotationLines(quotationId);
  const { data: notesData, isLoading: isLoadingNotes } = useQuotationNotes(quotationId);
  const updateNotesMutation = useUpdateQuotationNotesList(quotationId);
  const startApprovalFlow = useStartApprovalFlow();
  const cancelByCustomerMutation = useCancelQuotationByCustomer();
  const createRevisionMutation = useCreateRevisionOfQuotation();
  const { profilMap, demirMap, vidaMap, baskiMap, koliBaskiMap } = useWindoDefinitionOptions();
  const { data: paymentTypes = [] } = usePaymentTypes();
  const [lines, setLinesState] = useState<QuotationLineFormState[]>([]);
  usePrefetchLineImagesForPdf(lines);
  const [exchangeRates, setExchangeRates] = useState<QuotationExchangeRateFormState[]>([]);
  const [quotationNotes, setQuotationNotes] = useState<QuotationNotesDto>(createEmptyQuotationNotes);
  const [pricingRules, setPricingRules] = useState<PricingRuleLineGetDto[]>([]);
  const [temporarySallerData, setTemporarySallerData] = useState<UserDiscountLimitDto[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const setQuotationLines = useCallback<Dispatch<SetStateAction<QuotationLineFormState[]>>>((action) => {
    linesDirtyRef.current = true;
    setLinesState(action);
  }, []);

  const linesInitializedRef = useRef(false);
  const linesDirtyRef = useRef(false);
  const exchangeRatesInitializedRef = useRef(false);
  const notesInitializedRef = useRef(false);
  const formInitializedRef = useRef(false);
  const [activeTab, setActiveTab] = useState('detail');
  const [pdfExportOpen, setPdfExportOpen] = useState(false);
  const [pendingSharePdfBlob, setPendingSharePdfBlob] = useState<Blob | null>(null);
  const [whatsappShareOpen, setWhatsappShareOpen] = useState(false);
  const [mailProviderPickerOpen, setMailProviderPickerOpen] = useState(false);
  const [googleMailOpen, setGoogleMailOpen] = useState(false);
  const [outlookMailOpen, setOutlookMailOpen] = useState(false);
  const [customerCancellationOpen, setCustomerCancellationOpen] = useState(false);
  const quotationStatus = Number((quotation as { status?: number; Status?: number })?.status ?? (quotation as { status?: number; Status?: number })?.Status);
  const isDraftDocument = quotationStatus === 0;
  const isApprovalWaiting = quotationStatus === 1;
  const isReadOnlyByStatus = [2, 3, 4, 5, 6, 7].includes(quotationStatus);
  const isApprovalLockedForCurrentUser = isApprovalWaiting && !canEditWhileWaiting;
  const isReadOnly = isReadOnlyByStatus || isApprovalLockedForCurrentUser;
  const canCancelByCustomer = canUpdate && !quotation?.isERPIntegrated && ![4, 5, 6, 7].includes(quotationStatus);
  const editEnabled = canUpdate && !isReadOnly;
  const linesEnabled = editEnabled;
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
        representativeId: null,
      },
    },
  });
  const { isValid: isFormValid } = useFormState({ control: form.control });
  const watchedCurrencyValue = form.watch('quotation.currency');
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

  // Başlık Ayarı
  useEffect(() => {
    if (quotation) {
      setPageTitle(
        t('detail.title', {
          offerNo: quotation.offerNo || `#${quotation.id}`,
        })
      );
    } else {
      setPageTitle(t('detail.title'));
    }
    return () => {
      setPageTitle(null);
    };
  }, [quotation, t, setPageTitle]);

  useEffect(() => {
    if (quotation && !formInitializedRef.current) {
      const raw = quotation as unknown as Record<string, unknown>;
      const salesTypeId = quotation.salesTypeDefinitionId ?? raw.SalesTypeDefinitionId;
      const deliveryMethodFromApi = quotation.deliveryMethod ?? raw.DeliveryMethod;
      const deliveryMethodValue =
        salesTypeId != null && salesTypeId !== ''
          ? String(salesTypeId)
          : deliveryMethodFromApi != null && deliveryMethodFromApi !== ''
            ? String(deliveryMethodFromApi)
            : null;
      form.reset({
        quotation: {
          offerType: normalizeOfferType(quotation.offerType),
          currency: quotation.currency || '',
          offerDate: quotation.offerDate ? quotation.offerDate.split('T')[0] : new Date().toISOString().split('T')[0],
          potentialCustomerId: quotation.potentialCustomerId || null,
          erpCustomerCode: quotation.erpCustomerCode || null,
          deliveryDate: quotation.deliveryDate
            ? quotation.deliveryDate.split('T')[0]
            : addDaysToDateOnly(
                quotation.offerDate ? quotation.offerDate.split('T')[0] : new Date().toISOString().split('T')[0],
                21
              ),
          shippingAddressId: quotation.shippingAddressId || null,
          representativeId: quotation.representativeId || null,
          activityId: quotation.activityId || null,
          status: quotation.status ?? null,
          description: quotation.description || null,
          paymentTypeId: quotation.paymentTypeId || undefined,
          paymentTermDays: quotation.paymentTermDays ?? null,
          documentSerialTypeId: quotation.documentSerialTypeId || null,
          offerNo: quotation.offerNo || null,
          revisionNo: quotation.revisionNo || null,
          revisionId: quotation.revisionId || null,
          generalDiscountRate: quotation.generalDiscountRate ?? null,
          generalDiscountAmount: quotation.generalDiscountAmount ?? null,
          deliveryMethod: deliveryMethodValue,
          koliBaskiDefinitionId: quotation.koliBaskiDefinitionId ?? (raw.KoliBaskiDefinitionId as number) ?? null,
          projectCode: quotation.erpProjectCode ?? (raw.ErpProjectCode as string) ?? (raw.ProjectCode as string) ?? null,
          ozelKod1: quotation.ozelKod1 ?? (raw.OzelKod1 as string) ?? '',
          ozelKod2: quotation.ozelKod2 ?? (raw.OzelKod2 as string) ?? '',
        },
      });
      formInitializedRef.current = true;
    }
  }, [quotation, form]);

  useEffect(() => {
    linesInitializedRef.current = false;
    linesDirtyRef.current = false;
    notesInitializedRef.current = false;
    exchangeRatesInitializedRef.current = false;
    formInitializedRef.current = false;
    offerDateSyncInitializedRef.current = false;
  }, [quotationId]);

  useEffect(() => {
    if (!quotationId || quotationId < 1) return;
    if (notesInitializedRef.current) return;
    if (notesData === undefined) return;
    setQuotationNotes(quotationNotesGetDtoToDto(notesData ?? null));
    notesInitializedRef.current = true;
  }, [quotationId, notesData]);

  const formatLoadedQuotationLines = useCallback(async (sourceLines: QuotationLineGetDto[]): Promise<QuotationLineFormState[]> => {
    const stockByCode = await fetchLocalizedStockMapByErpCodes(
      sourceLines.map((line) => line.productCode ?? '')
    );
    const backendId = (line: { id?: number }): number =>
      Number((line as { id?: number; Id?: number }).id ?? (line as { id?: number; Id?: number }).Id ?? 0);

    return deduplicateDocumentLinesByBackendId(sourceLines.map((line, _index) => {
        const idNum = backendId(line);
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
          backendLineId: idNum > 0 ? idNum : null,
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
          relatedStockId: line.productId ?? line.relatedStockId ?? null,
          relatedProductKey: line.relatedProductKey || null,
          isMainRelatedProduct: line.isMainRelatedProduct || false,
          approvalStatus: line.approvalStatus,
          ...amounts,
        };
      }));
  }, [i18n.language]);

  const replaceQuotationLinesFromServer = useCallback(async (sourceLines: QuotationLineGetDto[]): Promise<void> => {
    const formattedLines = await formatLoadedQuotationLines(sourceLines);
    linesDirtyRef.current = false;
    setLinesState(formattedLines);
    linesInitializedRef.current = true;
  }, [formatLoadedQuotationLines]);

  useEffect(() => {
    if (!quotationId || quotationId < 1) return;
    if (linesDirtyRef.current) return;
    if (!linesData || linesData.length === 0) return;
    if (linesInitializedRef.current) return;

    let cancelled = false;

    const loadLines = async (): Promise<void> => {
      const formattedLines = await formatLoadedQuotationLines(linesData);
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
  }, [quotationId, linesData, formatLoadedQuotationLines]);

  const { calculateLineTotals } = useQuotationCalculations();
  const { data: erpRates = [] } = useExchangeRate();
  const { currencyOptions: currencyOptionsForExchangeRates, currencyOptions } = useCurrencyOptions();

  const currencyCode = useMemo(() => {
    const currencyId = Number(watchedCurrencyValue);
    const option = currencyOptions.find(opt => opt.value === currencyId);
    return option?.code || 'TRY';
  }, [watchedCurrencyValue, currencyOptions]);

  useEffect(() => {
    if (exchangeRatesData && exchangeRatesData.length > 0 && !exchangeRatesInitializedRef.current && currencyOptionsForExchangeRates.length > 0) {
      const formattedExchangeRates: QuotationExchangeRateFormState[] = exchangeRatesData.map((rate) => {
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

  const watchedCurrency = useMemo(
    () => resolveWatchedDocumentCurrency(watchedCurrencyValue, currencyOptions, erpRates),
    [watchedCurrencyValue, currencyOptions, erpRates]
  );
  const watchedCustomerId = form.watch('quotation.potentialCustomerId');
  const watchedErpCustomerCode = form.watch('quotation.erpCustomerCode');
  const watchedRepresentativeId = form.watch('quotation.representativeId');
  const { data: customerOptions = [] } = useCustomerOptions(watchedRepresentativeId);
  const { data: selectedCustomer } = useCustomer(
    watchedCustomerId ?? 0,
    Boolean(watchedCustomerId && watchedCustomerId > 0)
  );
  const quotationFormSlice = form.watch('quotation');
  const previewCustomerId = quotationFormSlice.potentialCustomerId ?? quotation?.potentialCustomerId ?? undefined;
  const { data: shippingAddresses = [] } = useShippingAddresses(
    previewCustomerId != null && previewCustomerId > 0 ? previewCustomerId : undefined,
  );
  const { hintLines: saveManualHintLines, schemaPayload: quotationSchemaPayload } = useHeaderSaveTooltipState(
    form.control,
    'quotation',
    (key) => t(key, { ns: 'common' }),
  );

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

  const hasLineDiscounts = useMemo(
    () => lines.some((line) => previewPdfLineHasDiscount(line)),
    [lines],
  );

  const hasGeneralDiscount = useMemo(() => {
    const qc = quotationFormSlice;
    return previewPdfHasGeneralDiscount(
      qc.generalDiscountRate ?? quotation?.generalDiscountRate ?? null,
      qc.generalDiscountAmount ?? quotation?.generalDiscountAmount ?? null,
    );
  }, [quotationFormSlice, quotation]);

  const defaultShowDiscountDetails = hasLineDiscounts || hasGeneralDiscount;

  const buildPreviewPdfBlob = useCallback(async (options?: { draft?: boolean; showDiscount?: boolean; hideVat?: boolean }): Promise<Blob> => {
    const qc = quotationFormSlice;
    const customerLabel =
      (await resolveQuotationCustomerLabelForPdf({
        potentialCustomerId: qc.potentialCustomerId,
        erpCustomerCode: qc.erpCustomerCode,
        potentialCustomerName: quotation?.potentialCustomerName,
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

    const koliBaskiId = qc.koliBaskiDefinitionId ?? quotation?.koliBaskiDefinitionId ?? null;
    const koliBaskiName =
      quotation?.koliBaskiDefinitionName?.trim()
      || (koliBaskiId != null && koliBaskiId > 0 ? koliBaskiMap[koliBaskiId] : null)
      || null;

    const paymentTypeName = resolvePreviewPdfPaymentTypeName(
      qc.paymentTypeId ?? quotation?.paymentTypeId ?? null,
      quotation?.paymentTypeName ?? null,
      paymentTypes,
    );

    const footerDetails = buildPreviewPdfDocumentFooterDetails(
      {
        koliBaskiName,
        paymentTypeName,
        description: qc.description ?? quotation?.description ?? null,
        quotationNotes,
        shippingAddressText: resolvePreviewPdfShippingAddressText({
          shippingAddressId: qc.shippingAddressId ?? quotation?.shippingAddressId ?? null,
          shippingAddressText: quotation?.shippingAddressText ?? null,
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
      offerDate: qc.offerDate ?? quotation?.offerDate ?? null,
      offerNo: qc.offerNo ?? quotation?.offerNo ?? null,
      customerName: customerLabel,
      branchName: branch?.name?.trim() || t('pdfExportTemplate.notSpecified'),
      branchCode: quotation?.requestBranchCode?.trim() || branch?.code?.trim() || null,
      generalDiscountRate: qc.generalDiscountRate ?? quotation?.generalDiscountRate ?? null,
      generalDiscountAmount: qc.generalDiscountAmount ?? quotation?.generalDiscountAmount ?? null,
      labels,
      footerDetails,
      lineDetailLabels,
      lineDetailMaps: { profilMap, demirMap, vidaMap, baskiMap },
      lineDiscountLabels,
      showDiscount: options?.showDiscount ?? defaultShowDiscountDetails,
      draft: options?.draft ?? false,
      hideVat: options?.hideVat ?? false,
    });
  }, [
    quotationFormSlice,
    quotation,
    customerOptions,
    selectedCustomer,
    t,
    i18n.language,
    lines,
    currencyCode,
    branch,
    profilMap,
    demirMap,
    vidaMap,
    baskiMap,
    koliBaskiMap,
    paymentTypes,
    quotationNotes,
    shippingAddresses,
    defaultShowDiscountDetails,
  ]);

  const reportBuiltInTemplates = useMemo(
    () => [
      {
        id: 'v3rii-quotation-preview',
        title: t('pdfExportTemplate.builtInTemplateTitle', {
          defaultValue: 'V3RII Hazır Şablon (Önizleme)',
        }),
        isDefault: true,
        generate: () => buildPreviewPdfBlob({
          draft: isDraftDocument,
          showDiscount: defaultShowDiscountDetails,
        }),
      },
    ],
    [buildPreviewPdfBlob, defaultShowDiscountDetails, isDraftDocument, t]
  );

  const buildExportPdfBlob = useCallback(
    async ({ draft, showDiscount, hideVat }: { draft: boolean; showDiscount?: boolean; hideVat?: boolean }): Promise<Blob> =>
      buildPreviewPdfBlob({ draft, showDiscount, hideVat }),
    [buildPreviewPdfBlob],
  );

  const shareFileName = t('exportPreview.downloadFileName');
  const pdfShareFileName = `teklif-${quotation?.offerNo || 'detay'}.pdf`;

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

  const openPdfExportPreview = (): void => {
    if (lines.length === 0) {
      toast.error(t('update.error', { defaultValue: 'Güncelleme hatası' }), {
        description: t('lines.required'),
      });
      return;
    }
    setPdfExportOpen(true);
  };

  const mailShareContext = useMemo<QuotationMailShareContext | null>(() => {
    if (!isIntegratedQuotationShare) return null;
    if (
      !quotation
      || (!mailProviderPickerOpen && !googleMailOpen && !outlookMailOpen && !pendingSharePdfBlob)
    ) {
      return null;
    }

    const qc = quotationFormSlice;

    if (pendingSharePdfBlob) {
      return {
        recordId: quotation.id,
        customerId: qc.potentialCustomerId ?? quotation.potentialCustomerId,
        contactId: quotation.contactId,
        customerName: quotation.potentialCustomerName ?? selectedCustomer?.name,
        customerCode: qc.erpCustomerCode ?? quotation.erpCustomerCode,
        recordNo: qc.offerNo ?? quotation.offerNo,
        revisionNo: quotation.revisionNo,
        totalAmountDisplay: quotation.grandTotalDisplay ?? undefined,
        validUntil: quotation.validUntil,
        recordOwnerName: quotation.representativeName,
        attachmentFile: blobToFile(pendingSharePdfBlob, shareFileName),
        autoAttachPdfOnOpen: false,
      };
    }

    return {
      recordId: quotation.id,
      customerId: quotation.potentialCustomerId,
      contactId: quotation.contactId,
      customerName: quotation.potentialCustomerName,
      customerCode: quotation.erpCustomerCode,
      recordNo: quotation.offerNo,
      revisionNo: quotation.revisionNo,
      totalAmountDisplay: quotation.grandTotalDisplay ?? undefined,
      validUntil: quotation.validUntil,
      recordOwnerName: quotation.representativeName,
      autoAttachPdfOnOpen: true,
    };
  }, [
    quotation,
    mailProviderPickerOpen,
    googleMailOpen,
    outlookMailOpen,
    pendingSharePdfBlob,
    quotationFormSlice,
    selectedCustomer?.name,
    shareFileName,
  ]);

  const handleModalShareWhatsapp = (pdfBlob: Blob): void => {
    const customerId = quotationFormSlice.potentialCustomerId ?? quotation?.potentialCustomerId;
    if (!customerId || customerId <= 0) {
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
      fileName: pdfShareFileName,
      customerId,
      contactId: quotation?.contactId,
      customerPhone: selectedCustomer?.phone,
      customerPhone2: selectedCustomer?.phone2,
      message: t('share.whatsappMessage'),
    });
  };

  const handleModalShareMail = (pdfBlob: Blob): void => {
    const customerId = quotationFormSlice.potentialCustomerId ?? quotation?.potentialCustomerId;
    if (!customerId || customerId <= 0) {
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
      fileName: pdfShareFileName,
      customerId,
      contactId: quotation?.contactId,
      recordId: quotationId,
      customerEmail: selectedCustomer?.email,
      subject: t('share.mailSubject'),
      body: t('share.mailBody'),
    });
  };

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

  // Submit İşlemi
  const onSubmit = async (data: CreateQuotationSchema): Promise<void> => {
    if (isReadOnly) return;
    if (lines.length === 0) {
      toast.error(t('update.error'), {
        description: t('lines.required'),
      });
      return;
    }

    const noteKeys = ['note1', 'note2', 'note3', 'note4', 'note5', 'note6', 'note7', 'note8', 'note9', 'note10', 'note11', 'note12', 'note13', 'note14', 'note15'] as const;
    const overLimitNote = noteKeys.find((k) => (quotationNotes[k]?.length ?? 0) > 100);
    if (overLimitNote) {
      toast.error(t('update.error'), {
        description: t('notes.maxLengthError'),
      });
      return;
    }

    try {
      const linesToSend = lines.map((line) => {
        const { id, backendLineId, isEditing, relatedLines, vidaDefinitionName, baskiDefinitionName, ...cleanLineData } =
          line as QuotationLineFormState & { relatedLines?: unknown[] };
        const persistedLineId = resolveDocumentLineBackendId({
          id: typeof id === 'number' ? String(id) : id ?? '',
          backendLineId,
        });
        void vidaDefinitionName;
        void baskiDefinitionName;
        return {
          ...cleanLineData,
          id: persistedLineId,
          quotationId: quotationId,
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
          relatedStockId: cleanLineData.relatedStockId && cleanLineData.relatedStockId > 0 ? cleanLineData.relatedStockId : cleanLineData.productId ?? null,
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
              id: parsePersistedId(id, 'rate'),
              ...rate,
              currency: currencyValue,
              quotationId: quotationId,
              isOfficial: rate.isOfficial ?? true,
            };
          })
        : undefined;
      
      if (currencyValue == null || currencyValue === '' || Number.isNaN(Number(currencyValue))) {
        throw new Error(t('update.invalidCurrency'));
      }

      const normalizedStatus =
        data.quotation.status == null || Number.isNaN(Number(data.quotation.status))
          ? Number.isFinite(quotationStatus)
            ? quotationStatus
            : 0
          : Number(data.quotation.status);

      const quotationData: CreateQuotationDto = {
        offerType: data.quotation.offerType,
        currency: currencyValue,
        potentialCustomerId: (data.quotation.potentialCustomerId && data.quotation.potentialCustomerId > 0) ? data.quotation.potentialCustomerId : null,
        erpCustomerCode: data.quotation.erpCustomerCode || null,
        deliveryDate: data.quotation.deliveryDate || null,
        shippingAddressId: (data.quotation.shippingAddressId && data.quotation.shippingAddressId > 0) ? data.quotation.shippingAddressId : null,
        representativeId: (data.quotation.representativeId && data.quotation.representativeId > 0) ? data.quotation.representativeId : null,
        activityId: (data.quotation.activityId && data.quotation.activityId > 0) ? data.quotation.activityId : null,
        status: normalizedStatus,
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
        projectCode: data.quotation.projectCode || null,
        ozelKod1: data.quotation.ozelKod1 || null,
        ozelKod2: data.quotation.ozelKod2 || null,
        erpProjectCode: data.quotation.projectCode ?? null,
      };

      setIsUpdating(true);

      const persistedLineIds = new Set(
        linesData.map((line) => line.id).filter((id): id is number => Number.isFinite(id) && id > 0)
      );
      const currentPersistedLineIds = new Set(
        linesToSend
          .map((line) => line.id ?? null)
          .filter((id): id is number => Number.isFinite(id ?? 0) && (id ?? 0) > 0)
      );
      const deletedLineIds = [...persistedLineIds].filter((id) => !currentPersistedLineIds.has(id));
      const newLines = linesToSend
        .filter((line) => !line.id || line.id <= 0)
        .map(({ id: _id, ...line }) => line as CreateQuotationLineDto);
      const updatedLines = linesToSend
        .filter((line) => line.id && line.id > 0)
        .map((line) => ({
          ...line,
          id: line.id as number,
          quotationId,
          createdAt: linesData.find((existing) => existing.id === line.id)?.createdAt ?? new Date().toISOString(),
        })) as QuotationLineGetDto[];

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
        .map(({ id: _id, ...rate }) => rate as QuotationExchangeRateCreateDto);
      const updatedRates = rateRows
        .filter((rate) => rate.id && rate.id > 0)
        .map((rate) => ({ id: rate.id as number, dto: { ...rate, id: undefined } as QuotationExchangeRateCreateDto }));

      const notesList = quotationNotesDtoToNotesList(quotationNotes);
      if (notesList.length > 15) {
        toast.error(t('update.error'), {
          description: t('quotation.notes.maxCountError'),
        });
        return;
      }

      await quotationApi.updateHeader(quotationId, quotationData);
      await Promise.all(deletedLineIds.map((lineId) => quotationApi.deleteQuotationLine(lineId)));
      if (updatedLines.length > 0) await quotationApi.updateQuotationLines(updatedLines);
      if (newLines.length > 0) await quotationApi.createQuotationLines(newLines);
      await Promise.all(deletedRateIds.map((rateId) => quotationApi.deleteQuotationExchangeRate(rateId)));
      await Promise.all(updatedRates.map((rate) => quotationApi.updateQuotationExchangeRate(rate.id, rate.dto)));
      await Promise.all(newRates.map((rate) => quotationApi.createQuotationExchangeRate(rate)));
      await updateNotesMutation.mutateAsync({ notes: notesList });
      await recordCustomerDocumentSerialUsageSafely({
        customerId: quotationData.potentialCustomerId,
        documentKind: CustomerDocumentSerialDocumentKind.Quotation,
        documentSerialTypeId: quotationData.documentSerialTypeId,
        documentId: quotationId,
        documentNo: quotationData.offerNo,
        requestBranchCode: quotation?.requestBranchCode?.trim() || branch?.code?.trim() || null,
      });

      const refreshedLines = await quotationApi.getQuotationLinesByQuotationId(quotationId);
      queryClient.setQueryData(queryKeys.quotationLines(quotationId), refreshedLines);
      await replaceQuotationLinesFromServer(refreshedLines);

      await Promise.all([
        queryClient.refetchQueries({ queryKey: [QUOTATION_QUERY_KEYS.QUOTATIONS] }),
        queryClient.refetchQueries({ queryKey: queryKeys.quotation(quotationId) }),
      ]);

      toast.success(t('update.success'), {
        description: t('update.successMessage'),
      });
    } catch (error: unknown) {
      let errorMessage = t('update.errorMessage');
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
      toast.error(t('update.error'), {
        description: errorMessage,
        duration: 10000,
      });
    } finally {
      setIsUpdating(false);
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
        description: t('exchangeRates.zeroRateError', {
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
    setQuotationLines(updatedLines);
  };

  const handleExplicitCurrencyChange = async (
    oldCurrency: number,
    newCurrency: number
  ): Promise<void> => {
    await handleCurrencyChange(String(newCurrency), oldCurrency);
  };

  const handleFormSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (isReadOnly) return;
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error(t('update.error'), {
        description: 'Zorunlu alanlar doldurulmadı.',
      });
      return;
    }
    const formData = form.getValues();
    await onSubmit(formData);
  };

  const handleStartApprovalFlow = (): void => {
    if (!quotation) return;
    startApprovalFlow.mutate({
      entityId: quotation.id,
      documentType: PricingRuleType.Quotation,
      totalAmount: quotation.grandTotal,
    });
  };

  const handleRevision = async (): Promise<void> => {
    if (!quotation) return;
    try {
      const result = await createRevisionMutation.mutateAsync(quotation.id);
      if (result.success && result.data?.id) {
        navigate(`/quotations/${result.data.id}`);
      }
    } catch {
      void 0;
    }
  };

  const handleCancelByCustomer = async (reason: string): Promise<void> => {
    if (!quotation || !canCancelByCustomer) return;

    await cancelByCustomerMutation.mutateAsync({
      id: quotation.id,
      reason,
    });
    setCustomerCancellationOpen(false);
  };

  if (isLoading || isLoadingCanEdit || isLoadingExchangeRates || isPendingLines || isLoadingNotes) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 border border-zinc-300 dark:border-zinc-700/80 rounded-xl bg-white/50 dark:bg-card/50">
        <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
        <span className="text-muted-foreground animate-pulse text-sm font-medium">
          {t('loading')}
        </span>
      </div>
    );
  }

  // Not Found Durumu
  if (!quotation) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-lg font-medium text-muted-foreground mb-4">
          {t('detail.notFound')}
        </p>
        <Button variant="outline" onClick={() => void handleBackToList()}>
          {t('backToQuotations')}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 relative pb-10">
      <DocumentDetailPageHeader
        title={t('detail.title', { offerNo: quotation.offerNo || `#${quotation.id}` })}
        subtitle={
          <>
            <p>{t('detail.subtitle')}</p>
            {quotation.revisionNo != null && quotation.revisionNo !== '' ? (
              <p className="mt-1">
                {t('detail.revisionNo')}: {quotation.revisionNo}
              </p>
            ) : null}
          </>
        }
        onBack={() => void handleBackToList()}
        backLabel={t('backToQuotations')}
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
            {t('detail.tabDetail')}
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
            {t('detail.tabApprovalFlow')}
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
            {t('detail.tabReport')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detail" className="mt-6 focus-visible:outline-none">
          <DocumentDetailStatusAlerts
            documentKind="quotation"
            status={quotationStatus}
            isApprovalLockedForCurrentUser={isApprovalLockedForCurrentUser}
            cancellationReason={quotation.cancellationReason}
          />
          <FormProvider {...form}>
            <form onSubmit={handleFormSubmit} className="space-y-0">
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8 xl:gap-10 items-start">
                <div className="flex flex-col gap-6 min-w-0">
                  <section aria-label={t('sections.header')}>
                    <div className="rounded-xl border border-zinc-300 dark:border-zinc-600/90 bg-white dark:bg-zinc-950/40 p-4 sm:p-5 space-y-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-700/70 text-xs font-bold text-zinc-700 dark:text-zinc-200 border border-zinc-300/80 dark:border-zinc-600">
                          1
                        </span>
                        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                          {t('sections.header')}
                        </h3>
                      </div>
                    <QuotationHeaderForm
                      exchangeRates={exchangeRates}
                      onExchangeRatesChange={setExchangeRates}
                      quotationNotes={quotationNotes}
                      onQuotationNotesChange={setQuotationNotes}
                      onSaveNotes={async (notes) => {
                        const list = quotationNotesDtoToNotesList(notes);
                        if (list.length > 15) {
                          toast.error(t('update.error'), {
                            description: t('notes.maxCountError'),
                          });
                          throw new Error('maxCount');
                        }
                        const overLimit = (['note1', 'note2', 'note3', 'note4', 'note5', 'note6', 'note7', 'note8', 'note9', 'note10', 'note11', 'note12', 'note13', 'note14', 'note15'] as const).find((k) => (notes[k]?.length ?? 0) > 100);
                        if (overLimit) {
                          toast.error(t('update.error'), {
                            description: t('notes.maxLengthError'),
                          });
                          throw new Error('maxLength');
                        }
                        try {
                          await updateNotesMutation.mutateAsync({ notes: list });
                          toast.success(t('notes.saved'));
                        } catch (err) {
                          toast.error(t('update.error'), {
                            description: err instanceof Error ? err.message : t('notes.saveError'),
                          });
                          throw err;
                        }
                      }}
                      isSavingNotes={updateNotesMutation.isPending}
                      lines={lines}
                      onCurrencyChange={handleExplicitCurrencyChange}
                      onLinesChange={async () => {
                        const newCurrency = form.getValues('quotation.currency');
                        if (newCurrency) {
                          await handleCurrencyChange(newCurrency);
                        }
                      }}
                      initialCurrency={quotation?.currency}
                      revisionNo={quotation?.revisionNo}
                      quotationId={quotation?.id}
                      quotationOfferNo={quotation?.offerNo}
                      readOnly={!editEnabled}
                      showDocumentSerialType={false}
                    />
                    </div>
                  </section>

                  <section aria-label={t('sections.lines')}>
                    <div className="rounded-xl border border-zinc-300 dark:border-zinc-600/90 bg-white dark:bg-zinc-950/40 p-4 sm:p-5 space-y-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-700/70 text-xs font-bold text-zinc-700 dark:text-zinc-200 border border-zinc-300/80 dark:border-zinc-600">
                          2
                        </span>
                        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                          {t('sections.lines')}
                        </h3>
                      </div>
                    <QuotationLineTable
                      lines={lines}
                      setLines={setQuotationLines}
                      currency={watchedCurrency}
                      exchangeRates={exchangeRates}
                      pricingRules={pricingRules}
                      userDiscountLimits={temporarySallerData}
                      customerId={watchedCustomerId}
                      erpCustomerCode={watchedErpCustomerCode}
                      representativeId={watchedRepresentativeId}
                      quotationId={quotationId}
                      enabled={linesEnabled}
                      offerType={form.watch('quotation.offerType')}
                      offerNo={quotation?.offerNo ?? null}
                      customerName={quotation?.potentialCustomerName ?? null}
                      buildExportPdfBlob={buildPreviewPdfBlob}
                      exportPdfFileName={`teklif-${quotation?.offerNo || 'kalemler'}.pdf`}
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
                        {t('sections.summary')}
                      </h3>
                    </div>
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-900/60 overflow-hidden">
                      <QuotationSummaryCard lines={lines} currency={watchedCurrency} />
                    </div>
                  </div>
                </aside>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-8 mt-8 border-t border-zinc-200 dark:border-white/10">
                {!isReadOnly && (
                  <FormSubmitTooltipWrap
                    schema={createQuotationSchema}
                    value={quotationSchemaPayload}
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
                        ? t('saving')
                        : t('update.saveButton', { defaultValue: 'Güncellemeyi Kaydet' })
                      }
                    </Button>
                  </FormSubmitTooltipWrap>
                )}

                <Button
                  type="button"
                  onClick={openPdfExportPreview}
                  className={`group ${DOCUMENT_DETAIL_BUTTON_BASE} ${DOCUMENT_DETAIL_BUTTON_PREVIEW}`}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {t('exportPreview.trigger')}
                </Button>

                {quotationStatus === 3 && canUpdate && (
                  <Button
                    type="button"
                    onClick={() => {
                      void handleRevision();
                    }}
                    disabled={createRevisionMutation.isPending || !quotation}
                    className={`${DOCUMENT_DETAIL_BUTTON_BASE} ${DOCUMENT_DETAIL_BUTTON_REVISE}`}
                  >
                    {createRevisionMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('revision.pending', { defaultValue: 'Revize oluşturuluyor...' })}
                      </>
                    ) : (
                      <>
                        <GitBranchPlus className="h-4 w-4 mr-2" />
                        {t('list.revise', { defaultValue: 'Revize et' })}
                      </>
                    )}
                  </Button>
                )}

                {quotationStatus === 0 && !isReadOnly && (
                  <SendForApprovalHintWrap documentType="quotation">
                    <Button
                      type="button"
                      onClick={handleStartApprovalFlow}
                      disabled={startApprovalFlow.isPending || !quotation}
                      className={`${DOCUMENT_DETAIL_BUTTON_BASE} ${DOCUMENT_DETAIL_BUTTON_APPROVAL}`}
                    >
                      {startApprovalFlow.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t('approval.sending')}
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          {t('approval.sendForApproval')}
                        </>
                      )}
                    </Button>
                  </SendForApprovalHintWrap>
                )}

                {canCancelByCustomer && (
                  <Button
                    type="button"
                    onClick={() => setCustomerCancellationOpen(true)}
                    disabled={cancelByCustomerMutation.isPending || !quotation}
                    className={`${DOCUMENT_DETAIL_BUTTON_BASE} ${DOCUMENT_DETAIL_BUTTON_DANGER}`}
                  >
                    {cancelByCustomerMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    {t('quotation:customerCancel.button', { defaultValue: 'Müşteri İptali' })}
                  </Button>
                )}

              </div>
            </form>
          </FormProvider>
        </TabsContent>

        <TabsContent value="approval-flow" className="mt-6 focus-visible:outline-none">
          <QuotationApprovalFlowTab quotationId={quotationId} />
        </TabsContent>

        <TabsContent value="report" className="mt-6 focus-visible:outline-none">
          <ReportTemplateTab
            entityId={quotationId}
            ruleType={DocumentRuleType.Quotation}
            builtInTemplates={reportBuiltInTemplates}
          />
        </TabsContent>
      </Tabs>

      <QuotationPdfExportPreviewDialog
        open={pdfExportOpen}
        onOpenChange={setPdfExportOpen}
        buildPdfBlob={buildExportPdfBlob}
        asDraft={isDraftDocument}
        hasLineDiscounts={defaultShowDiscountDetails}
        fileName={shareFileName}
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

      <CustomerCancellationDialog
        open={customerCancellationOpen}
        onOpenChange={setCustomerCancellationOpen}
        isPending={cancelByCustomerMutation.isPending}
        title={t('quotation:customerCancel.title', { defaultValue: 'Müşteri iptali' })}
        description={t('quotation:customerCancel.description', {
          defaultValue: 'Bu teklifi müşteri tarafından iptal edildi olarak işaretlemek üzeresiniz.',
        })}
        reasonLabel={t('quotation:customerCancel.reasonLabel', { defaultValue: 'İptal nedeni' })}
        reasonPlaceholder={t('quotation:customerCancel.reasonPlaceholder', { defaultValue: 'Müşterinin iptal nedenini yazın...' })}
        cancelLabel={t('common.cancel', { ns: 'common' })}
        confirmLabel={t('quotation:customerCancel.confirmButton', { defaultValue: 'İptal Et' })}
        onConfirm={handleCancelByCustomer}
      />

      {isIntegratedQuotationShare ? (
        <>
          <QuotationWhatsappSendDialog
            open={whatsappShareOpen}
            onOpenChange={(open) => {
              setWhatsappShareOpen(open);
              if (!open) setPendingSharePdfBlob(null);
            }}
            quotationId={pendingSharePdfBlob ? undefined : quotationId}
            pdfBlob={pendingSharePdfBlob}
            fileName={pdfShareFileName}
            customerId={quotation?.potentialCustomerId}
            contactId={quotation?.contactId}
            customerName={quotation?.potentialCustomerName ?? selectedCustomer?.name}
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
