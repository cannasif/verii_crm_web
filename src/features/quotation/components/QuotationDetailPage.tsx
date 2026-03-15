import { type ReactElement, useState, useEffect, useMemo, useRef } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useQuotation } from '../hooks/useQuotation';
import { useStartApprovalFlow } from '../hooks/useStartApprovalFlow';
import { useQuotationExchangeRates } from '../hooks/useQuotationExchangeRates';
import { useQuotationLines } from '../hooks/useQuotationLines';
import { useQuotationNotes } from '../hooks/useQuotationNotes';
import { useUpdateQuotationBulk } from '../hooks/useUpdateQuotationBulk';
import { useUpdateQuotationNotesList } from '../hooks/useUpdateQuotationNotesList';
import { usePriceRuleOfQuotation } from '../hooks/usePriceRuleOfQuotation';
import { useUserDiscountLimitsBySalesperson } from '../hooks/useUserDiscountLimitsBySalesperson';
import { useCustomerOptions } from '@/features/customer-management/hooks/useCustomerOptions';
import { useUIStore } from '@/stores/ui-store';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Layers, Loader2, FileCheck, FileText, Share2, FileDown, MessageCircle, Mail, Save, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCurrency } from '../utils/format-currency';
import { QuotationApprovalFlowTab } from './QuotationApprovalFlowTab';
import { ReportTemplateTab, DocumentRuleType } from '@/features/report-designer';
import { cn } from '@/lib/utils';
import { createQuotationSchema, type CreateQuotationSchema } from '../schemas/quotation-schema';
import type { QuotationLineFormState, QuotationExchangeRateFormState, QuotationBulkCreateDto, CreateQuotationDto, PricingRuleLineGetDto, UserDiscountLimitDto, QuotationNotesDto } from '../types/quotation-types';
import { DEFAULT_OFFER_TYPE, normalizeOfferType } from '@/types/offer-type';
import { createEmptyQuotationNotes } from './QuotationNotesDialog';
import { quotationNotesGetDtoToDto, quotationNotesDtoToNotesList } from '../utils/quotation-payload-mapper';
import { QuotationHeaderForm } from './QuotationHeaderForm';
import { QuotationLineTable } from './QuotationLineTable';
import { QuotationSummaryCard } from './QuotationSummaryCard';
import { useQuotationCalculations } from '../hooks/useQuotationCalculations';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import { findExchangeRateByDovizTipi } from '../utils/price-conversion';
import { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';
import { createQuotationLinesPdfBlob } from '../utils/export-quotation-lines-pdf';

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

export function QuotationDetailPage(): ReactElement {
  const { t } = useTranslation();
  const { id: paramId } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { setPageTitle } = useUIStore();
  const quotationIdFromPath = parseQuotationIdFromPath(location.pathname);
  const quotationId = quotationIdFromPath > 0 ? quotationIdFromPath : (paramId ? parseInt(paramId, 10) : 0) || 0;

  const { data: quotation, isLoading } = useQuotation(quotationId);
  const { data: exchangeRatesData = [], isLoading: isLoadingExchangeRates } = useQuotationExchangeRates(quotationId);
  const { data: linesData = [], isLoading: isLoadingLines } = useQuotationLines(quotationId);
  const { data: notesData, isLoading: isLoadingNotes } = useQuotationNotes(quotationId);
  const updateMutation = useUpdateQuotationBulk();
  const updateNotesMutation = useUpdateQuotationNotesList(quotationId);
  const startApprovalFlow = useStartApprovalFlow();
  const { data: customerOptions = [] } = useCustomerOptions();

  const [lines, setLines] = useState<QuotationLineFormState[]>([]);
  const [exchangeRates, setExchangeRates] = useState<QuotationExchangeRateFormState[]>([]);
  const [quotationNotes, setQuotationNotes] = useState<QuotationNotesDto>(createEmptyQuotationNotes);
  const [pricingRules, setPricingRules] = useState<PricingRuleLineGetDto[]>([]);
  const [temporarySallerData, setTemporarySallerData] = useState<UserDiscountLimitDto[]>([]);

  const linesInitializedRef = useRef(false);
  const exchangeRatesInitializedRef = useRef(false);
  const notesInitializedRef = useRef(false);
  const formInitializedRef = useRef(false);
  const [activeTab, setActiveTab] = useState('detail');
  const quotationStatus = Number((quotation as { status?: number; Status?: number })?.status ?? (quotation as { status?: number; Status?: number })?.Status);
  const isReadOnly = quotationStatus === 2 || quotationStatus === 3 || quotationStatus === 4;
  const isClosed = quotationStatus === 4;
  const linesEnabled = !isReadOnly;
  const builtInReportTemplates = useMemo(
    () => {
      if (quotation == null) return [];

      const raw = quotation as unknown as Record<string, unknown>;
      const customerName =
        quotation.potentialCustomerName ??
        customerOptions.find((option) => option.id === quotation.potentialCustomerId)?.name ??
        null;
      const documentSerialTypeName =
        (raw.documentSerialTypeName as string | null | undefined) ??
        (raw.DocumentSerialTypeName as string | null | undefined) ??
        null;
      const salesTypeName =
        (raw.salesTypeDefinitionName as string | null | undefined) ??
        (raw.SalesTypeDefinitionName as string | null | undefined) ??
        (raw.deliveryMethodName as string | null | undefined) ??
        (raw.DeliveryMethodName as string | null | undefined) ??
        null;

      return [
        {
          id: '__builtin_windo_teklif_yap__',
          title: 'Windo Teklif Yap',
          isDefault: true,
          generate: () =>
            createQuotationLinesPdfBlob({
              fileName: `teklif-${quotation.offerNo || 'detay'}.pdf`,
              title: t('quotation.sections.lines'),
              currencyCode: quotation.currency || 'TRY',
              lines,
              offerNo: quotation.offerNo ?? null,
              customerName,
              representativeName: quotation.representativeName ?? null,
              address: quotation.shippingAddressText ?? null,
              shippingAddress: quotation.shippingAddressText ?? null,
              erpCustomerCode: quotation.erpCustomerCode ?? null,
              offerDate: quotation.offerDate ?? null,
              deliveryDate: quotation.deliveryDate ?? null,
              validUntil: quotation.validUntil ?? null,
              paymentTypeName: quotation.paymentTypeName ?? null,
              salesTypeName,
              projectCode: quotation.erpProjectCode ?? null,
              description: quotation.description ?? null,
              notes: Object.values(quotationNotes).filter(
                (note): note is string => typeof note === 'string' && note.trim().length > 0
              ),
              metaFields: [
                { label: t('quotation.serialNumber', { defaultValue: 'Seri No' }), value: documentSerialTypeName },
              ],
              t,
            }),
        },
      ];
    },
    [quotation, customerOptions, lines, quotationNotes, t]
  );

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
  const isFormValid = form.formState.isValid;
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
        t('quotation.detail.title', {
          offerNo: quotation.offerNo || `#${quotation.id}`,
        })
      );
    } else {
      setPageTitle(t('quotation.detail.title'));
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
          status: quotation.status || null,
          description: quotation.description || null,
          paymentTypeId: quotation.paymentTypeId || undefined,
          documentSerialTypeId: quotation.documentSerialTypeId || null,
          offerNo: quotation.offerNo || null,
          revisionNo: quotation.revisionNo || null,
          revisionId: quotation.revisionId || null,
          generalDiscountRate: quotation.generalDiscountRate ?? null,
          generalDiscountAmount: quotation.generalDiscountAmount ?? null,
          deliveryMethod: deliveryMethodValue,
          projectCode: quotation.erpProjectCode ?? (raw.ErpProjectCode as string) ?? (raw.ProjectCode as string) ?? null,
        },
      });
      formInitializedRef.current = true;
    }
  }, [quotation, form]);

  useEffect(() => {
    linesInitializedRef.current = false;
    notesInitializedRef.current = false;
    exchangeRatesInitializedRef.current = false;
  }, [quotationId]);

  useEffect(() => {
    if (!quotationId || quotationId < 1) return;
    if (notesInitializedRef.current) return;
    if (notesData === undefined) return;
    setQuotationNotes(quotationNotesGetDtoToDto(notesData ?? null));
    notesInitializedRef.current = true;
  }, [quotationId, notesData]);

  useEffect(() => {
    if (!quotationId || quotationId < 1) return;
    if (!linesData || linesData.length === 0) return;
    if (linesInitializedRef.current) return;
    const backendId = (line: { id?: number }): number =>
      Number((line as { id?: number; Id?: number }).id ?? (line as { id?: number; Id?: number }).Id ?? 0);
    const formattedLines: QuotationLineFormState[] = linesData.map((line, index) => {
      const idNum = backendId(line);
      return {
        id: idNum > 0 ? `line-${idNum}-${index}` : `line-temp-${index}`,
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
      };
    });
    setLines(formattedLines);
    linesInitializedRef.current = true;
  }, [quotationId, linesData]);

  const { calculateLineTotals } = useQuotationCalculations();
  const { data: erpRates = [] } = useExchangeRate();
  const { currencyOptions: currencyOptionsForExchangeRates, currencyOptions } = useCurrencyOptions();

  const currencyCode = useMemo(() => {
    const currencyId = Number(watchedCurrencyValue);
    const option = currencyOptions.find(opt => opt.value === currencyId);
    return option?.code || 'TRY';
  }, [watchedCurrencyValue, currencyOptions]);

  const generatePDF = async () => {
    const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new JsPDF();
    
    doc.setFontSize(18);
    doc.text(t('quotation.detail.title'), 14, 20);
    doc.setFontSize(11);
    doc.text(`${t('quotation.date')}: ${new Date().toLocaleDateString('tr-TR')}`, 14, 28);
    doc.text(`${t('quotation.offerNo')}: ${quotation?.offerNo || ''}`, 14, 34);

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
      startY: 40,
      head: headers,
      body: data,
      styles: { font: 'helvetica', fontStyle: 'normal' },
      theme: 'grid',
    });

    return doc;
  };

  const handleExportPDF = async () => {
    const doc = await generatePDF();
    doc.save(`teklif-${quotation?.offerNo || 'detay'}.pdf`);
  };

  const handleShareWhatsApp = async () => {
    const doc = await generatePDF();
    doc.save(`teklif-${quotation?.offerNo || 'detay'}.pdf`);
    const text = encodeURIComponent(t('quotation.share.whatsappMessage'));
    window.open(`https://wa.me/?text=${text}`, '_blank');
    toast.info(t('quotation.share.downloaded'));
  };

  const handleShareMail = async () => {
    const doc = await generatePDF();
    doc.save(`teklif-${quotation?.offerNo || 'detay'}.pdf`);
    const subject = encodeURIComponent(t('quotation.share.mailSubject'));
    const body = encodeURIComponent(t('quotation.share.mailBody'));
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    toast.info(t('quotation.share.downloaded'));
  };

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

  const watchedCurrency = Number(form.watch('quotation.currency') ?? '2');
  const watchedCustomerId = form.watch('quotation.potentialCustomerId');
  const watchedErpCustomerCode = form.watch('quotation.erpCustomerCode');
  const watchedRepresentativeId = form.watch('quotation.representativeId');

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

  // Submit İşlemi
  const onSubmit = async (data: CreateQuotationSchema): Promise<void> => {
    if (isReadOnly) return;
    if (lines.length === 0) {
      toast.error(t('quotation.update.error'), {
        description: t('quotation.lines.required'),
      });
      return;
    }

    const noteKeys = ['note1', 'note2', 'note3', 'note4', 'note5', 'note6', 'note7', 'note8', 'note9', 'note10', 'note11', 'note12', 'note13', 'note14', 'note15'] as const;
    const overLimitNote = noteKeys.find((k) => (quotationNotes[k]?.length ?? 0) > 100);
    if (overLimitNote) {
      toast.error(t('quotation.update.error'), {
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
          quotationId: quotationId,
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
              quotationId: quotationId,
              isOfficial: rate.isOfficial ?? true,
            };
          })
        : undefined;

      const currencyValue = typeof data.quotation.currency === 'string' 
        ? data.quotation.currency 
        : String(data.quotation.currency);
      
      if (currencyValue == null || currencyValue === '' || Number.isNaN(Number(currencyValue))) {
        throw new Error(t('quotation.update.invalidCurrency'));
      }

      const quotationData: CreateQuotationDto = {
        offerType: data.quotation.offerType,
        currency: currencyValue,
        potentialCustomerId: (data.quotation.potentialCustomerId && data.quotation.potentialCustomerId > 0) ? data.quotation.potentialCustomerId : null,
        erpCustomerCode: data.quotation.erpCustomerCode || null,
        deliveryDate: data.quotation.deliveryDate || null,
        shippingAddressId: (data.quotation.shippingAddressId && data.quotation.shippingAddressId > 0) ? data.quotation.shippingAddressId : null,
        representativeId: (data.quotation.representativeId && data.quotation.representativeId > 0) ? data.quotation.representativeId : null,
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

      const payload: QuotationBulkCreateDto = {
        quotation: quotationData,
        lines: linesToSend,
        exchangeRates: exchangeRatesToSend,
      };

      const result = await updateMutation.mutateAsync({ id: quotationId, data: payload });

      const notesList = quotationNotesDtoToNotesList(quotationNotes);
      if (notesList.length > 15) {
        toast.error(t('quotation.update.error'), {
          description: t('quotation.notes.maxCountError'),
        });
        return;
      }
      await updateNotesMutation.mutateAsync({ notes: notesList });

      if (result.success && result.data) {
        toast.success(t('quotation.update.success'), {
          description: t('quotation.update.successMessage'),
        });
      } else {
        throw new Error(result.message || t('quotation.update.errorMessage'));
      }
    } catch (error: unknown) {
      let errorMessage = t('quotation.update.errorMessage');
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
      toast.error(t('quotation.update.error'), {
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
          const updatedLine = { ...line, unitPrice: newUnitPrice };
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

  const handleFormSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (isReadOnly) return;
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error(t('quotation.update.error'), {
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

  if (isLoading || isLoadingExchangeRates || isLoadingLines || isLoadingNotes) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 border border-zinc-300 dark:border-zinc-700/80 rounded-xl bg-white/50 dark:bg-card/50">
        <div className="w-10 h-10 border-4 border-muted border-t-pink-500 rounded-full animate-spin" />
        <span className="text-muted-foreground animate-pulse text-sm font-medium">
          {t('quotation.loading')}
        </span>
      </div>
    );
  }

  // Not Found Durumu
  if (!quotation) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-lg font-medium text-muted-foreground mb-4">
          {t('quotation.detail.notFound')}
        </p>
        <Button variant="outline" onClick={() => navigate('/quotations')}>
          {t('quotation.backToQuotations')}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 relative pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t('quotation.detail.title', { offerNo: quotation.offerNo || `#${quotation.id}` })}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t('quotation.detail.subtitle')}
            {quotation.revisionNo != null && quotation.revisionNo !== '' && (
              <span className="block mt-1">
                {t('quotation.detail.revisionNo')}: {quotation.revisionNo}
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
            {t('quotation.detail.tabDetail')}
          </TabsTrigger>
          <TabsTrigger
            value="approval-flow"
            className={cn(
              'rounded-lg px-4 py-2 shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm',
              activeTab === 'approval-flow' && 'text-pink-600 dark:text-pink-500 font-medium'
            )}
          >
            <FileCheck className="h-4 w-4 mr-2" />
            {t('quotation.detail.tabApprovalFlow')}
          </TabsTrigger>
          <TabsTrigger
            value="report"
            className={cn(
              'rounded-lg px-4 py-2 shrink-0 data-[state=active]:bg-background data-[state=active]:shadow-sm',
              activeTab === 'report' && 'text-pink-600 dark:text-pink-500 font-medium'
            )}
          >
            <FileText className="h-4 w-4 mr-2" />
            {t('quotation.detail.tabReport')}
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
                  <section className="space-y-1" aria-label={t('quotation.sections.header')}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-200/80 dark:bg-zinc-700/50 text-xs font-bold text-zinc-600 dark:text-zinc-300">
                        1
                      </span>
                      <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                        {t('quotation.sections.header')}
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
                          toast.error(t('quotation.update.error'), {
                            description: t('quotation.notes.maxCountError'),
                          });
                          throw new Error('maxCount');
                        }
                        const overLimit = (['note1', 'note2', 'note3', 'note4', 'note5', 'note6', 'note7', 'note8', 'note9', 'note10', 'note11', 'note12', 'note13', 'note14', 'note15'] as const).find((k) => (notes[k]?.length ?? 0) > 100);
                        if (overLimit) {
                          toast.error(t('quotation.update.error'), {
                            description: t('quotation.notes.maxLengthError'),
                          });
                          throw new Error('maxLength');
                        }
                        try {
                          await updateNotesMutation.mutateAsync({ notes: list });
                          toast.success(t('quotation.notes.saved'));
                        } catch (err) {
                          toast.error(t('quotation.update.error'), {
                            description: err instanceof Error ? err.message : t('quotation.notes.saveError'),
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
                      readOnly={isReadOnly}
                      showDocumentSerialType={false}
                    />
                  </section>

                  <section className="space-y-1 pt-2" aria-label={t('quotation.sections.lines')}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-200/80 dark:bg-zinc-700/50 text-xs font-bold text-zinc-600 dark:text-zinc-300">
                        2
                      </span>
                      <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                        {t('quotation.sections.lines')}
                      </h3>
                    </div>
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
                      quotationId={quotationId}
                      enabled={linesEnabled}
                      offerNo={quotation?.offerNo ?? null}
                      customerName={quotation?.potentialCustomerName ?? null}
                    />
                  </section>
                </div>

                <aside className="xl:sticky xl:top-6">
                  <div className="flex items-center gap-2 mb-3 xl:mb-4">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      3
                    </span>
                    <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                      {t('quotation.sections.summary')}
                    </h3>
                  </div>
                  <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm overflow-hidden">
                    <QuotationSummaryCard lines={lines} currency={watchedCurrency} />
                  </div>
                </aside>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-8 mt-8 border-t border-zinc-200 dark:border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/quotations')}
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
                    <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5">
                      <FileDown className="mr-2 h-4 w-4 text-slate-500" />
                      {t('quotation.exportPdf')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShareWhatsApp} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5">
                      <MessageCircle className="mr-2 h-4 w-4 text-green-500" />
                      {t('quotation.shareWhatsapp')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShareMail} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5">
                      <Mail className="mr-2 h-4 w-4 text-blue-500" />
                      {t('quotation.shareMail')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {!isReadOnly && (
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending || !isFormValid}
                    className="group w-full sm:w-auto bg-linear-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white sm:min-w-[140px]"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {updateMutation.isPending
                      ? t('quotation.saving')
                      : t('quotation.save')
                    }
                  </Button>
                )}

                {quotation?.status === 0 && !isReadOnly && quotationStatus !== 4 && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleStartApprovalFlow}
                    disabled={startApprovalFlow.isPending || !quotation}
                    className="h-10 w-full sm:w-auto"
                  >
                    {startApprovalFlow.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('quotation.approval.sending')}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        {t('quotation.approval.sendForApproval')}
                      </>
                    )}
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
            builtInTemplates={builtInReportTemplates}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
