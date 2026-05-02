import { type ReactElement, useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { FormSubmitTooltipWrap } from '@/components/shared/FormSubmitTooltipWrap';
import { buildHeaderSaveRequiredHintLines } from '@/lib/header-save-required-hints';
import { Save, X, Eye, FileText, Layers, Calculator } from 'lucide-react';
import { DocumentCreatePageHeader } from '@/components/shared/DocumentCreatePageHeader';
import { QuotationPdfExportPreviewDialog } from './QuotationPdfExportPreviewDialog';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import { formatCurrency } from '../utils/format-currency';
import {
  QUOTATION_EXPORT_PDF_FONT,
  registerQuotationExportPdfFont,
} from '../utils/quotation-export-pdf-font';
import { createQuotationSchema, type CreateQuotationSchema } from '../schemas/quotation-schema';
import type { QuotationLineFormState, QuotationExchangeRateFormState, QuotationBulkCreateDto, CreateQuotationDto, PricingRuleLineGetDto, UserDiscountLimitDto, QuotationNotesDto } from '../types/quotation-types';
import { DEFAULT_OFFER_TYPE, normalizeOfferType } from '@/types/offer-type';
import { createEmptyQuotationNotes } from './QuotationNotesDialog';
import { mapQuotationNotesToPayload, quotationNotesDtoToNotesList } from '../utils/quotation-payload-mapper';
import { quotationApi } from '../api/quotation-api';
import { pdfReportTemplateApi } from '@/features/pdf-report/api/pdf-report-template-api';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { useQuotationCalculations } from '../hooks/useQuotationCalculations';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import { findExchangeRateByDovizTipi } from '../utils/price-conversion';
import type { QuotationGetDto, QuotationLineGetDto } from '../types/quotation-types';

const CREATE_SECTION_CARD_CLASSNAME =
  'rounded-2xl overflow-hidden border border-slate-400 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_28px_-22px_rgba(15,23,42,0.40)] ring-1 ring-slate-300/70 dark:border-white/16 dark:bg-[#120b1d]/82 dark:ring-white/12';
const CREATE_SECTION_HEADER_CLASSNAME =
  'px-5 py-4 flex items-center gap-3 border-b border-slate-400/75 bg-slate-100/85 dark:border-white/12 dark:bg-white/[0.07]';
const CREATE_HEADER_FORM_SURFACE_CLASSNAME =
  '[&_label]:text-slate-800 dark:[&_label]:text-slate-200 [&_input]:border-slate-500/70 [&_input]:bg-white [&_input]:shadow-sm [&_input]:placeholder:text-slate-400 [&_input]:focus-visible:border-pink-500/85 [&_input]:focus-visible:ring-pink-200/70 dark:[&_input]:border-white/20 dark:[&_input]:bg-[#120d1d] dark:[&_input]:placeholder:text-slate-500 dark:[&_input]:focus-visible:border-pink-400/60 dark:[&_input]:focus-visible:ring-pink-400/20 [&_textarea]:border-slate-500/70 [&_textarea]:bg-white [&_textarea]:shadow-sm [&_textarea]:placeholder:text-slate-400 [&_textarea]:focus-visible:border-pink-500/85 [&_textarea]:focus-visible:ring-pink-200/70 dark:[&_textarea]:border-white/20 dark:[&_textarea]:bg-[#120d1d] dark:[&_textarea]:placeholder:text-slate-500 dark:[&_textarea]:focus-visible:border-pink-400/60 dark:[&_textarea]:focus-visible:ring-pink-400/20 [&_[data-slot=select-trigger]]:border-slate-500/70 [&_[data-slot=select-trigger]]:bg-white [&_[data-slot=select-trigger]]:shadow-sm dark:[&_[data-slot=select-trigger]]:border-white/20 dark:[&_[data-slot=select-trigger]]:bg-[#120d1d]';

function addDaysToDateOnly(dateValue: string, days: number): string {
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

async function finalizePendingQuotationImages(
  quotation: QuotationGetDto,
  draftLines: QuotationLineFormState[]
): Promise<void> {
  const createdLines = quotation.lines && quotation.lines.length > 0
    ? quotation.lines
    : await quotationApi.getQuotationLinesByQuotationId(quotation.id);

  for (let index = 0; index < draftLines.length; index += 1) {
    const draftLine = draftLines[index];
    const pendingImageFile = draftLine.pendingImageFile;
    const createdLine = createdLines[index];

    if (!pendingImageFile || !createdLine?.id) continue;

    const uploaded = await pdfReportTemplateApi.uploadAsset(pendingImageFile, {
      assetScope: 'quotation-line',
      quotationId: quotation.id,
      quotationLineId: createdLine.id,
      productCode: draftLine.productCode || createdLine.productCode || undefined,
    });

    await quotationApi.updateQuotationLines([
      {
        ...(createdLine as QuotationLineGetDto),
        imagePath: uploaded.relativeUrl,
      },
    ]);
  }
}

export function QuotationCreateForm(): ReactElement {
  const { t, i18n } = useTranslation(['quotation', 'common']);
  const navigate = useNavigate();
  const { setPageTitle } = useUIStore();
  const user = useAuthStore((state) => state.user);

  const [lines, setLines] = useState<QuotationLineFormState[]>([]);
  const [exchangeRates, setExchangeRates] = useState<QuotationExchangeRateFormState[]>([]);
  const [quotationNotes, setQuotationNotes] = useState<QuotationNotesDto>(createEmptyQuotationNotes);
  const [pricingRules, setPricingRules] = useState<PricingRuleLineGetDto[]>([]);
  const [temporarySallerData, setTemporarySallerData] = useState<UserDiscountLimitDto[]>([]);
  const [pdfExportOpen, setPdfExportOpen] = useState(false);
  const createMutation = useCreateQuotationBulk();
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

  const watchedCurrencyRaw = form.watch('quotation.currency');
  const watchedCurrency =
    watchedCurrencyRaw === '' || watchedCurrencyRaw === null || watchedCurrencyRaw === undefined
      ? Number.NaN
      : Number(watchedCurrencyRaw);
  const watchedCustomerId = form.watch('quotation.potentialCustomerId');
  const watchedErpCustomerCode = form.watch('quotation.erpCustomerCode');
  const watchedRepresentativeId = form.watch('quotation.representativeId');
  const watchedOfferDate = form.watch('quotation.offerDate');
  const quotationFormSlice = form.watch('quotation');
  const quotationSchemaPayload = useMemo(
    () => ({ quotation: quotationFormSlice }),
    [quotationFormSlice],
  );

  const saveManualHintLines = useMemo(
    () =>
      buildHeaderSaveRequiredHintLines(quotationFormSlice, (key) =>
        t(key, { ns: 'common' }),
      ),
    [quotationFormSlice, t],
  );
  const { data: customerOptions = [] } = useCustomerOptions(watchedRepresentativeId);
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
      toast.error(t('create.error'), {
        description: t('lines.required'),
      });
      return;
    }

    const noteKeys = ['note1', 'note2', 'note3', 'note4', 'note5', 'note6', 'note7', 'note8', 'note9', 'note10', 'note11', 'note12', 'note13', 'note14', 'note15'] as const;
    const overLimitNote = noteKeys.find((k) => (quotationNotes[k]?.length ?? 0) > 100);
    if (overLimitNote) {
      toast.error(t('create.error'), {
        description: t('notes.maxLengthError'),
      });
      return;
    }

    try {
      const linesToSend = lines.map((line) => {
        const {
          id: _ignoredId,
          isEditing,
          relatedLines,
          pendingImageFile: _pendingImageFile,
          pendingImagePreviewUrl: _pendingImagePreviewUrl,
          ...cleanLineData
        } = line as QuotationLineFormState & { relatedLines?: unknown[] };

        return {
          ...cleanLineData,
          quotationId: 0,
          productId: cleanLineData.productId ?? null,
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
        throw new Error(t('create.invalidCurrency'));
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
        await finalizePendingQuotationImages(result.data, lines);
        const notesList = quotationNotesDtoToNotesList(quotationNotes);
        if (notesList.length > 0) {
          await quotationApi.updateNotesListByQuotationId(result.data.id, { notes: notesList });
        }
        toast.success(t('create.success'), {
          description: t('create.successMessage'),
        });
        navigate(`/quotations/${result.data.id}`);
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

  const buildExportPdfBlob = useCallback(async (): Promise<Blob> => {
    const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new JsPDF();
    const hasUtf8Font = await registerQuotationExportPdfFont(doc);
    const bodyFont = hasUtf8Font ? QUOTATION_EXPORT_PDF_FONT : 'helvetica';
    const M = 14;
    const RW = 196;
    const accentBlue: [number, number, number] = [23, 45, 96];
    const qc = quotationFormSlice;

    const offerDateStr = qc.offerDate
      ? new Date(`${qc.offerDate}T12:00:00`).toLocaleDateString(i18n.language)
      : new Date().toLocaleDateString(i18n.language);
    const offerNoDisplay = qc.offerNo?.trim() || t('pdfExportTemplate.notSpecified');
    const customerLabel =
      customerOptions.find((c) => c.id === qc.potentialCustomerId)?.name?.trim() ||
      qc.erpCustomerCode?.trim() ||
      t('pdfExportTemplate.notSpecified');
    const branchCodeDisplay = customerCode?.trim() || t('pdfExportTemplate.notSpecified');

    doc.setFont(bodyFont, 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(branchCodeDisplay, M, 16);

    doc.setFontSize(18);
    doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2]);
    doc.text(t('pdfExportTemplate.documentTitle'), RW, 16, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor(75, 75, 75);
    doc.setFont(bodyFont, 'normal');
    doc.text(`${t('pdfExportTemplate.metaDate')}: ${offerDateStr}`, RW, 24, { align: 'right' });
    doc.text(`${t('pdfExportTemplate.metaOfferNo')}: ${offerNoDisplay}`, RW, 29.5, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text(`${t('pdfExportTemplate.metaCustomer')}: ${customerLabel}`, M, 26);

    doc.setDrawColor(210, 210, 210);
    doc.line(M, 33, RW, 33);

    doc.setTextColor(0, 0, 0);

    const headers = [[
      t('lines.productCode'),
      t('lines.productName'),
      t('lines.quantity'),
      t('lines.unitPrice'),
      t('lines.vatRate'),
      t('lines.total'),
    ]];

    const data = lines.map((line) => [
      line.productCode ?? '',
      line.productName ?? '',
      String(line.quantity ?? ''),
      formatCurrency(line.unitPrice, currencyCode),
      `%${line.vatRate ?? 0}`,
      formatCurrency(line.lineTotal, currencyCode),
    ]);

    autoTable(doc, {
      startY: 38,
      head: headers,
      body: data,
      styles: {
        font: bodyFont,
        fontStyle: 'normal',
        fontSize: 8.5,
        cellPadding: 2.8,
        lineColor: [220, 220, 220],
        lineWidth: 0.15,
        textColor: [35, 35, 35],
      },
      headStyles: {
        font: bodyFont,
        fontStyle: 'bold',
        fillColor: accentBlue,
        textColor: 255,
        halign: 'center',
        valign: 'middle',
      },
      columnStyles: {
        0: { cellWidth: 34, halign: 'left' },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 16 },
        3: { halign: 'right', cellWidth: 28 },
        4: { halign: 'center', cellWidth: 14 },
        5: { halign: 'right', cellWidth: 30 },
      },
      alternateRowStyles: { fillColor: [245, 246, 250] },
      theme: 'grid',
      margin: { left: M, right: M },
    });

    type DocWithTable = InstanceType<typeof JsPDF> & { lastAutoTable?: { finalY: number } };
    const finalY = (doc as DocWithTable).lastAutoTable?.finalY ?? 38;
    const grandTotal = lines.reduce((sum, line) => sum + (Number(line.lineTotal) || 0), 0);
    const pageBottom = doc.internal.pageSize.getHeight() - 22;
    const bandHeight = 9;
    let bandTop = finalY + 8;
    if (bandTop + bandHeight + 8 > pageBottom) {
      doc.addPage();
      if (hasUtf8Font) {
        doc.setFont(QUOTATION_EXPORT_PDF_FONT, 'normal');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      bandTop = 18;
    }
    const labelBaseline = bandTop + 6.4;
    doc.setFillColor(236, 241, 248);
    doc.roundedRect(M, bandTop, RW - M, bandHeight, 1.2, 1.2, 'F');
    doc.setDrawColor(200, 210, 225);
    doc.roundedRect(M, bandTop, RW - M, bandHeight, 1.2, 1.2, 'S');
    doc.setFont(bodyFont, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2]);
    doc.text(t('pdfExportTemplate.grandTotal'), M + 3, labelBaseline);
    doc.text(formatCurrency(grandTotal, currencyCode), RW - 3, labelBaseline, { align: 'right' });

    return doc.output('blob') as Blob;
  }, [
    lines,
    currencyCode,
    t,
    i18n.language,
    quotationFormSlice,
    customerCode,
    customerOptions,
  ]);

  const openPdfExportPreview = (): void => {
    if (lines.length === 0) {
      toast.error(t('create.error'), {
        description: t('lines.required'),
      });
      return;
    }
    setPdfExportOpen(true);
  };

  const handleModalShareWhatsapp = (): void => {
    const text = encodeURIComponent(t('share.whatsappMessage'));
    window.open(`https://wa.me/?text=${text}`, '_blank');
    toast.info(t('share.downloaded'));
  };

  const handleModalShareMail = (): void => {
    const subject = encodeURIComponent(t('share.mailSubject'));
    const body = encodeURIComponent(t('share.mailBody'));
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    toast.info(t('share.downloaded'));
  };

  const handleFormSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const formData = form.getValues();

    const isValid = await form.trigger();
    if (!isValid) {
      toast.error(t('create.error'), {
        description: t('create.validationError'),
      });
      return;
    }

    await onSubmit(formData);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto relative pb-10 px-4 md:px-6">
      <FormProvider {...form}>
        <form onSubmit={handleFormSubmit} className="space-y-0">

          <DocumentCreatePageHeader
            title={t('create.pageTitle')}
            description={t('create.pageDescription')}
            onBack={() => navigate(-1)}
            backLabel={t('back', { ns: 'common' })}
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
            {/* SOL KISIM */}
            <div className="flex flex-col gap-6 min-w-0 h-fit">

              {/* --- 1. Bölüm: Teklif Bilgileri --- */}
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
              <section aria-label={t('sections.lines')}>
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
              {t('cancel')}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={openPdfExportPreview}
              className="group w-full sm:w-auto"
            >
              <Eye className="mr-2 h-4 w-4" />
              {t('exportPreview.trigger')}
            </Button>

            <FormSubmitTooltipWrap
              schema={createQuotationSchema}
              value={quotationSchemaPayload}
              isValid={isFormValid}
              isPending={createMutation.isPending}
              manualHintLines={saveManualHintLines}
            >
              <Button
                type="submit"
                disabled={createMutation.isPending || !isFormValid}
                className="group w-full sm:w-auto sm:min-w-[140px] bg-linear-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white opacity-75 grayscale-[0] dark:opacity-100 dark:grayscale-0"
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

      <QuotationPdfExportPreviewDialog
        open={pdfExportOpen}
        onOpenChange={setPdfExportOpen}
        buildPdfBlob={buildExportPdfBlob}
        fileName={t('exportPreview.downloadFileName')}
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
        }}
        onShareWhatsapp={handleModalShareWhatsapp}
        onShareMail={handleModalShareMail}
      />
    </div>
  );
}
