import { type Dispatch, type ReactElement, type SetStateAction, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, FormProvider, useFormState } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useDemand } from '../hooks/useDemand';
import { useStartApprovalFlow } from '../hooks/useStartApprovalFlow';
import { useDemandExchangeRates } from '../hooks/useDemandExchangeRates';
import { useDemandLines } from '../hooks/useDemandLines';
import { useDemandNotes } from '../hooks/useDemandNotes';
import { useUpdateDemandNotesList } from '../hooks/useUpdateDemandNotesList';
import { usePriceRuleOfDemand } from '../hooks/usePriceRuleOfDemand';
import { useUserDiscountLimitsBySalesperson } from '../hooks/useUserDiscountLimitsBySalesperson';
import { useCustomerOptions } from '@/features/customer-management/hooks/useCustomerOptions';
import { useUIStore } from '@/stores/ui-store';
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
  DOCUMENT_DETAIL_BUTTON_SAVE,
} from '@/lib/document-detail-button-styles';
import { buildHeaderSaveRequiredHintLines } from '@/lib/header-save-required-hints';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Layers, Loader2, FileCheck, FileText, XCircle, Save } from 'lucide-react';
import { DemandApprovalFlowTab } from './DemandApprovalFlowTab';
import { DemandReportTab } from '@/features/report-designer';
import { cn } from '@/lib/utils';
import { createDemandSchema, type CreateDemandSchema } from '../schemas/demand-schema';
import type { CreateDemandLineDto, DemandExchangeRateCreateDto, DemandLineFormState, DemandExchangeRateFormState, CreateDemandDto, PricingRuleLineGetDto, UserDiscountLimitDto, DemandLineGetDto } from '../types/demand-types';
import { demandApi } from '../api/demand-api';
import { DEMAND_QUERY_KEYS, queryKeys } from '../utils/query-keys';
import { DEFAULT_OFFER_TYPE, normalizeOfferType } from '@/types/offer-type';
import type { QuotationNotesDto } from '@/features/quotation/types/quotation-types';
import { createEmptyQuotationNotes } from '@/features/quotation/components/QuotationNotesDialog';
import { demandNotesGetDtoToDto, demandNotesDtoToNotesList } from '../utils/notes-mapper';
import { DemandHeaderForm } from './DemandHeaderForm';
import { DemandLineTable } from './DemandLineTable';
import { DemandSummaryCard } from './DemandSummaryCard';
import { useDemandCalculations } from '../hooks/useDemandCalculations';
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
import { useCanEditDemand } from '../hooks/useCanEditDemand';
import { useCancelDemandByCustomer } from '../hooks/useCancelDemandByCustomer';

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

export function DemandDetailPage(): ReactElement {
  const { t, i18n } = useTranslation(['demand', 'approval', 'common']);
  const { canUpdate } = useCrudPermissions('sales.demands.update');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setPageTitle } = useUIStore();
  const demandId = id ? parseInt(id, 10) : 0;

  const handleBackToList = useCallback(async (): Promise<void> => {
    await queryClient.refetchQueries({ queryKey: [DEMAND_QUERY_KEYS.DEMANDS] });
    navigate('/demands');
  }, [queryClient, navigate]);

  const { data: demand, isLoading } = useDemand(demandId);
  const { data: canEditWhileWaiting = false, isLoading: isLoadingCanEdit } = useCanEditDemand(demandId);
  const { data: exchangeRatesData = [], isLoading: isLoadingExchangeRates } = useDemandExchangeRates(demandId);
  const { data: linesData = [], isPending: isPendingLines } = useDemandLines(demandId);
  const { data: notesData, isLoading: isLoadingNotes } = useDemandNotes(demandId);
  const updateNotesMutation = useUpdateDemandNotesList(demandId);
  const startApprovalFlow = useStartApprovalFlow();
  const cancelByCustomerMutation = useCancelDemandByCustomer();

  const [lines, setLinesState] = useState<DemandLineFormState[]>([]);
  const [exchangeRates, setExchangeRates] = useState<DemandExchangeRateFormState[]>([]);
  const [quotationNotes, setQuotationNotes] = useState<QuotationNotesDto>(createEmptyQuotationNotes);
  const [pricingRules, setPricingRules] = useState<PricingRuleLineGetDto[]>([]);
  const [temporarySallerData, setTemporarySallerData] = useState<UserDiscountLimitDto[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const linesInitializedRef = useRef(false);
  const linesDirtyRef = useRef(false);

  const setDemandLines = useCallback<Dispatch<SetStateAction<DemandLineFormState[]>>>((action) => {
    linesDirtyRef.current = true;
    setLinesState(action);
  }, []);
  const notesInitializedRef = useRef(false);
  const exchangeRatesInitializedRef = useRef(false);
  const formInitializedRef = useRef(false);
  const offerDateSyncInitializedRef = useRef(false);
  const [activeTab, setActiveTab] = useState('detail');
  const [customerCancellationOpen, setCustomerCancellationOpen] = useState(false);
  const demandStatus = Number((demand as { status?: number; Status?: number })?.status ?? (demand as { status?: number; Status?: number })?.Status);
  const isApprovalWaiting = demandStatus === 1;
  const isReadOnlyByStatus = [2, 3, 4, 5, 6, 7].includes(demandStatus);
  const isApprovalLockedForCurrentUser = isApprovalWaiting && !canEditWhileWaiting;
  const isReadOnly = isReadOnlyByStatus || isApprovalLockedForCurrentUser;
  const canCancelByCustomer = canUpdate && !demand?.isERPIntegrated && ![4, 5, 6, 7].includes(demandStatus);
  const editEnabled = canUpdate && !isReadOnly;
  const linesEnabled = editEnabled;

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
        representativeId: null,
        koliBaskiDefinitionId: null,
      },
    },
  });
  const { isValid: isFormValid } = useFormState({ control: form.control });

  // Başlık Ayarı
  useEffect(() => {
    if (demand) {
      setPageTitle(
        t('detail.title', {
          offerNo: demand.offerNo || `#${demand.id}`,
        })
      );
    } else {
      setPageTitle(t('detail.title'));
    }
    return () => {
      setPageTitle(null);
    };
  }, [demand, t, setPageTitle]);

  useEffect(() => {
    if (demand && !formInitializedRef.current) {
      const raw = demand as unknown as Record<string, unknown>;
      const salesTypeId = demand.salesTypeDefinitionId ?? raw.SalesTypeDefinitionId;
      const deliveryMethodFromApi = demand.deliveryMethod ?? raw.DeliveryMethod;
      const deliveryMethodValue =
        salesTypeId != null && salesTypeId !== ''
          ? String(salesTypeId)
          : deliveryMethodFromApi != null && deliveryMethodFromApi !== ''
            ? String(deliveryMethodFromApi)
            : null;
      const projectCodeValue = demand.erpProjectCode ?? demand.projectCode ?? (raw.ErpProjectCode as string) ?? (raw.ProjectCode as string) ?? null;
      form.reset({
        demand: {
          offerType: normalizeOfferType(demand.offerType),
          currency: demand.currency || '',
          offerDate: demand.offerDate ? demand.offerDate.split('T')[0] : new Date().toISOString().split('T')[0],
          potentialCustomerId: demand.potentialCustomerId || null,
          erpCustomerCode: demand.erpCustomerCode || null,
          deliveryDate: demand.deliveryDate ? demand.deliveryDate.split('T')[0] : null,
          shippingAddressId: demand.shippingAddressId || null,
          representativeId: demand.representativeId || null,
          activityId: demand.activityId || null,
          projectCode: projectCodeValue,
          ozelKod1: demand.ozelKod1 ?? (raw.OzelKod1 as string) ?? '',
          ozelKod2: demand.ozelKod2 ?? (raw.OzelKod2 as string) ?? '',
          status: demand.status ?? null,
          description: demand.description || null,
          paymentTypeId: demand.paymentTypeId || null,
          documentSerialTypeId: demand.documentSerialTypeId || null,
          offerNo: demand.offerNo || null,
          revisionNo: demand.revisionNo || null,
          revisionId: demand.revisionId || null,
          generalDiscountRate: demand.generalDiscountRate ?? null,
          generalDiscountAmount: demand.generalDiscountAmount ?? null,
          koliBaskiDefinitionId: demand.koliBaskiDefinitionId ?? (raw.KoliBaskiDefinitionId as number) ?? null,
          deliveryMethod: deliveryMethodValue,
        },
      });
      formInitializedRef.current = true;
      offerDateSyncInitializedRef.current = false;
    }
  }, [demand, form]);

  useEffect(() => {
    linesInitializedRef.current = false;
    linesDirtyRef.current = false;
    notesInitializedRef.current = false;
    exchangeRatesInitializedRef.current = false;
    formInitializedRef.current = false;
    offerDateSyncInitializedRef.current = false;
  }, [demandId]);

  useEffect(() => {
    if (!demandId || demandId < 1) return;
    if (notesInitializedRef.current) return;
    if (notesData === undefined) return;
    setQuotationNotes(demandNotesGetDtoToDto(notesData ?? null));
    notesInitializedRef.current = true;
  }, [demandId, notesData]);

  const formatLoadedDemandLines = useCallback(async (sourceLines: DemandLineGetDto[]): Promise<DemandLineFormState[]> => {
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

  const replaceDemandLinesFromServer = useCallback(async (sourceLines: DemandLineGetDto[]): Promise<void> => {
    const formattedLines = await formatLoadedDemandLines(sourceLines);
    linesDirtyRef.current = false;
    setLinesState(formattedLines);
    linesInitializedRef.current = true;
  }, [formatLoadedDemandLines]);

  useEffect(() => {
    if (linesDirtyRef.current) return;
    if (!linesData || linesData.length === 0 || linesInitializedRef.current) return;

    let cancelled = false;

    const loadLines = async (): Promise<void> => {
      const formattedLines = await formatLoadedDemandLines(linesData);
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
  }, [linesData, formatLoadedDemandLines]);

  const { calculateLineTotals } = useDemandCalculations();
  const { data: erpRates = [] } = useExchangeRate();
  const { currencyOptions: currencyOptionsForExchangeRates, currencyOptions } = useCurrencyOptions();

  useEffect(() => {
    if (exchangeRatesData && exchangeRatesData.length > 0 && !exchangeRatesInitializedRef.current && currencyOptionsForExchangeRates.length > 0) {
      const formattedExchangeRates: DemandExchangeRateFormState[] = exchangeRatesData.map((rate) => {
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

  const watchedCurrencyValue = form.watch('demand.currency');
  const watchedCurrency = useMemo(
    () => resolveWatchedDocumentCurrency(watchedCurrencyValue, currencyOptions, erpRates),
    [watchedCurrencyValue, currencyOptions, erpRates]
  );
  const watchedCustomerId = form.watch('demand.potentialCustomerId');
  const watchedErpCustomerCode = form.watch('demand.erpCustomerCode');
  const watchedRepresentativeId = form.watch('demand.representativeId');
  const { data: customerOptions = [] } = useCustomerOptions(watchedRepresentativeId);
  const watchedOfferDate = form.watch('demand.offerDate');
  const demandFormSlice = form.watch('demand');

  const demandSchemaPayload = useMemo(
    () => ({ demand: demandFormSlice }),
    [demandFormSlice],
  );

  const saveManualHintLines = useMemo(
    () =>
      buildHeaderSaveRequiredHintLines(demandFormSlice, (key) => t(key, { ns: 'common' }), watchedCurrency),
    [demandFormSlice, watchedCurrency, t],
  );

  useEffect(() => {
    if (!watchedOfferDate || isReadOnly) return;

    if (!offerDateSyncInitializedRef.current) {
      offerDateSyncInitializedRef.current = true;
      return;
    }

    form.setValue('demand.deliveryDate', addDaysToDateOnly(watchedOfferDate, 21), {
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

  // Submit İşlemi
  const onSubmit = async (data: CreateDemandSchema): Promise<void> => {
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
        description: t('quotation.notes.maxLengthError'),
      });
      return;
    }

    try {
      const linesToSend = lines.map((line) => {
        const { id, backendLineId, isEditing, relatedLines, vidaDefinitionName, baskiDefinitionName, ...cleanLineData } =
          line as DemandLineFormState & { relatedLines?: unknown[] };
        const persistedLineId = resolveDocumentLineBackendId({
          id: typeof id === 'number' ? String(id) : id ?? '',
          backendLineId,
        });
        void vidaDefinitionName;
        void baskiDefinitionName;
        return {
          ...cleanLineData,
          id: persistedLineId,
          demandId: demandId,
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
              id: parsePersistedId(id, 'rate'),
              ...rate,
              currency: currencyValue,
              demandId: demandId,
              isOfficial: rate.isOfficial ?? true,
            };
          })
        : undefined;
      
      if (currencyValue == null || currencyValue === '' || Number.isNaN(Number(currencyValue))) {
        throw new Error(t('update.invalidCurrency'));
      }

      const normalizedStatus =
        data.demand.status == null || Number.isNaN(Number(data.demand.status))
          ? Number.isFinite(demandStatus)
            ? demandStatus
            : 0
          : Number(data.demand.status);

      const demandData: CreateDemandDto = {
        offerType: data.demand.offerType,
        currency: currencyValue,
        potentialCustomerId: (data.demand.potentialCustomerId && data.demand.potentialCustomerId > 0) ? data.demand.potentialCustomerId : null,
        erpCustomerCode: data.demand.erpCustomerCode || null,
        deliveryDate: data.demand.deliveryDate || null,
        shippingAddressId: (data.demand.shippingAddressId && data.demand.shippingAddressId > 0) ? data.demand.shippingAddressId : null,
        representativeId: (data.demand.representativeId && data.demand.representativeId > 0) ? data.demand.representativeId : null,
        activityId: (data.demand.activityId && data.demand.activityId > 0) ? data.demand.activityId : null,
        projectCode: data.demand.projectCode || null,
        status: normalizedStatus,
        description: data.demand.description || null,
        paymentTypeId: (data.demand.paymentTypeId && data.demand.paymentTypeId > 0) ? data.demand.paymentTypeId : null,
        documentSerialTypeId: (data.demand.documentSerialTypeId && data.demand.documentSerialTypeId > 0) ? data.demand.documentSerialTypeId : null,
        offerDate: data.demand.offerDate || null,
        offerNo: data.demand.offerNo || null,
        revisionNo: data.demand.revisionNo || null,
        revisionId: (data.demand.revisionId && data.demand.revisionId > 0) ? data.demand.revisionId : null,
        generalDiscountRate: data.demand.generalDiscountRate ?? null,
        generalDiscountAmount: data.demand.generalDiscountAmount ?? null,
        koliBaskiDefinitionId: (data.demand.koliBaskiDefinitionId && data.demand.koliBaskiDefinitionId > 0) ? data.demand.koliBaskiDefinitionId : null,
        salesTypeDefinitionId: data.demand.deliveryMethod ? Number(data.demand.deliveryMethod) : null,
        ozelKod1: data.demand.ozelKod1 || null,
        ozelKod2: data.demand.ozelKod2 || null,
        erpProjectCode: data.demand.projectCode ?? null,
      };

      const notesList = demandNotesDtoToNotesList(quotationNotes);
      if (notesList.length > 15) {
        toast.error(t('update.error'), {
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
        .map(({ id: _id, ...line }) => line as CreateDemandLineDto);
      const updatedLines = linesToSend
        .filter((line) => typeof line.id === 'number' && line.id > 0)
        .map((line) => ({
          ...line,
          id: line.id as number,
          demandId,
          createdAt: linesData.find((existing) => existing.id === line.id)?.createdAt ?? new Date().toISOString(),
        })) as DemandLineGetDto[];

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
        .map(({ id: _id, ...rate }) => rate as DemandExchangeRateCreateDto);
      const updatedRates = rateRows
        .filter((rate) => rate.id && rate.id > 0)
        .map((rate) => ({ id: rate.id as number, dto: { ...rate, id: undefined } as DemandExchangeRateCreateDto }));

      await demandApi.updateHeader(demandId, demandData);
      await Promise.all(deletedLineIds.map((lineId) => demandApi.deleteDemandLine(lineId)));
      if (updatedLines.length > 0) await demandApi.updateDemandLines(updatedLines);
      if (newLines.length > 0) await demandApi.createDemandLines(newLines);
      await Promise.all(deletedRateIds.map((rateId) => demandApi.deleteDemandExchangeRate(rateId)));
      await Promise.all(updatedRates.map((rate) => demandApi.updateDemandExchangeRate(rate.id, rate.dto)));
      await Promise.all(newRates.map((rate) => demandApi.createDemandExchangeRate(rate)));
      await updateNotesMutation.mutateAsync({ notes: notesList });

      const refreshedLines = await demandApi.getDemandLinesByDemandId(demandId);
      queryClient.setQueryData(queryKeys.demandLines(demandId), refreshedLines);
      await replaceDemandLinesFromServer(refreshedLines);

      await Promise.all([
        queryClient.refetchQueries({ queryKey: [DEMAND_QUERY_KEYS.DEMANDS] }),
        queryClient.refetchQueries({ queryKey: queryKeys.demand(demandId) }),
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

  const handleCurrencyChange = async (newCurrency: string): Promise<void> => {
    if (lines.length === 0) return;

    const oldCurrency = watchedCurrency;
    const newCurrencyNum = Number(newCurrency);

    if (oldCurrency === newCurrencyNum) return;

    const sampleOldRate = findExchangeRateByDovizTipi(oldCurrency, exchangeRates, erpRates);
    const sampleNewRate = findExchangeRateByDovizTipi(newCurrencyNum, exchangeRates, erpRates);

    if (!sampleOldRate || sampleOldRate <= 0 || !sampleNewRate || sampleNewRate <= 0) {
      toast.error(t('update.error', 'Hata'), {
        description: t('exchangeRates.zeroRateError', 'Lütfen devam edebilmek için kur değeri girin.'),
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
    setDemandLines(updatedLines);
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
    if (!demand) return;
    startApprovalFlow.mutate({
      entityId: demand.id,
      documentType: PricingRuleType.Demand,
      totalAmount: demand.grandTotal,
    });
  };

  const handleCancelByCustomer = async (reason: string): Promise<void> => {
    if (!demand || !canCancelByCustomer) return;

    await cancelByCustomerMutation.mutateAsync({
      id: demand.id,
      reason,
    });
    setCustomerCancellationOpen(false);
  };

  if (isLoading || isLoadingCanEdit || isLoadingExchangeRates || isPendingLines || isLoadingNotes) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 border border-zinc-300 dark:border-zinc-700/80 rounded-xl bg-white/50 dark:bg-card/50">
        <div className="w-10 h-10 border-4 border-muted border-t-pink-500 rounded-full animate-spin" />
        <span className="text-muted-foreground animate-pulse text-sm font-medium">
          {t('loading')}
        </span>
      </div>
    );
  }

  // Not Found Durumu
  if (!demand) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-lg font-medium text-muted-foreground mb-4">
          {t('detail.notFound')}
        </p>
        <Button variant="outline" onClick={() => void handleBackToList()}>
          {t('backToDemands')}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 relative pb-10">
      <DocumentDetailPageHeader
        title={t('detail.title', { offerNo: demand.offerNo || `#${demand.id}` })}
        subtitle={
          <>
            <p>{t('detail.subtitle')}</p>
            {demand.revisionNo != null && demand.revisionNo !== '' ? (
              <p className="mt-1">
                {t('detail.revisionNo')}: {demand.revisionNo}
              </p>
            ) : null}
          </>
        }
        onBack={() => void handleBackToList()}
        backLabel={t('backToDemands')}
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
              activeTab === 'detail' && 'data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 data-[state=active]:font-medium'
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
              activeTab === 'approval-flow' && 'data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 data-[state=active]:font-medium'
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
              activeTab === 'report' && 'data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 data-[state=active]:font-medium'
            )}
          >
            <FileText className="h-4 w-4 mr-2" />
            {t('detail.tabReport')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detail" className="mt-6 focus-visible:outline-none">
          <DocumentDetailStatusAlerts
            documentKind="demand"
            status={demandStatus}
            isApprovalLockedForCurrentUser={isApprovalLockedForCurrentUser}
            cancellationReason={demand.cancellationReason}
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
                    <DemandHeaderForm
                      exchangeRates={exchangeRates}
                      onExchangeRatesChange={setExchangeRates}
                      quotationNotes={quotationNotes}
                      onQuotationNotesChange={setQuotationNotes}
                      onSaveNotes={async (notes) => {
                        const list = demandNotesDtoToNotesList(notes);
                        if (list.length > 15) {
                          toast.error(t('update.error'), {
                            description: t('quotation.notes.maxCountError'),
                          });
                          throw new Error('maxCount');
                        }
                        const overLimit = (['note1', 'note2', 'note3', 'note4', 'note5', 'note6', 'note7', 'note8', 'note9', 'note10', 'note11', 'note12', 'note13', 'note14', 'note15'] as const).find((k) => (notes[k]?.length ?? 0) > 100);
                        if (overLimit) {
                          toast.error(t('update.error'), {
                            description: t('quotation.notes.maxLengthError'),
                          });
                          throw new Error('maxLength');
                        }
                        try {
                          await updateNotesMutation.mutateAsync({ notes: list });
                          toast.success(t('quotation.notes.saved'));
                        } catch (err) {
                          toast.error(t('update.error'), {
                            description: err instanceof Error ? err.message : t('quotation.notes.saveError'),
                          });
                          throw err;
                        }
                      }}
                      isSavingNotes={updateNotesMutation.isPending}
                      lines={lines}
                      onLinesChange={async () => {
                        const newCurrency = form.getValues('demand.currency');
                        if (newCurrency) {
                          await handleCurrencyChange(newCurrency);
                        }
                      }}
                      onCurrencyChange={async (_oldCurrency, newCurrency) => {
                        await handleCurrencyChange(String(newCurrency));
                      }}
                      initialCurrency={demand?.currency}
                      revisionNo={demand?.revisionNo}
                      demandId={demandId}
                      demandOfferNo={demand?.offerNo}
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
                    <DemandLineTable
                      lines={lines}
                      setLines={setDemandLines}
                      currency={watchedCurrency}
                      exchangeRates={exchangeRates}
                      pricingRules={pricingRules}
                      userDiscountLimits={temporarySallerData}
                      customerId={watchedCustomerId}
                      erpCustomerCode={watchedErpCustomerCode}
                      representativeId={watchedRepresentativeId}
                      demandId={demandId}
                      enabled={linesEnabled}
                      offerType={form.watch('demand.offerType')}
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
                      <DemandSummaryCard lines={lines} currency={watchedCurrency} />
                    </div>
                  </div>
                </aside>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-8 mt-8 border-t border-zinc-200 dark:border-white/10">
                {!isReadOnly && (
                  <FormSubmitTooltipWrap
                    schema={createDemandSchema}
                    value={demandSchemaPayload}
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
                        : t('update.saveButton', { defaultValue: 'Güncellemeyi Kaydet' })}
                    </Button>
                  </FormSubmitTooltipWrap>
                )}

                {demandStatus === 0 && !isReadOnly && (
                  <SendForApprovalHintWrap documentType="demand">
                    <Button
                      type="button"
                      onClick={handleStartApprovalFlow}
                      disabled={isUpdating || startApprovalFlow.isPending || !demand}
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
                    disabled={isUpdating || cancelByCustomerMutation.isPending || !demand}
                    className={`${DOCUMENT_DETAIL_BUTTON_BASE} ${DOCUMENT_DETAIL_BUTTON_DANGER}`}
                  >
                    {cancelByCustomerMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    {t('demand:customerCancel.button', { defaultValue: 'Müşteri İptali' })}
                  </Button>
                )}
              </div>
            </form>
          </FormProvider>
        </TabsContent>

        <TabsContent value="approval-flow" className="mt-6 focus-visible:outline-none">
          <DemandApprovalFlowTab demandId={demandId} />
        </TabsContent>

        <TabsContent value="report" className="mt-6 focus-visible:outline-none">
          <DemandReportTab demandId={demandId} />
        </TabsContent>
      </Tabs>

      <CustomerCancellationDialog
        open={customerCancellationOpen}
        onOpenChange={setCustomerCancellationOpen}
        isPending={cancelByCustomerMutation.isPending}
        title={t('demand:customerCancel.title', { defaultValue: 'Müşteri iptali' })}
        description={t('demand:customerCancel.description', {
          defaultValue: 'Bu talebi müşteri tarafından iptal edildi olarak işaretlemek üzeresiniz.',
        })}
        reasonLabel={t('demand:customerCancel.reasonLabel', { defaultValue: 'İptal nedeni' })}
        reasonPlaceholder={t('demand:customerCancel.reasonPlaceholder', { defaultValue: 'Müşterinin iptal nedenini yazın...' })}
        cancelLabel={t('common.cancel', { ns: 'common' })}
        confirmLabel={t('demand:customerCancel.confirmButton', { defaultValue: 'İptal Et' })}
        onConfirm={handleCancelByCustomer}
      />
    </div>
  );
}
