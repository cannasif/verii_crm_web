import { type ReactElement, useState, useEffect, useMemo } from 'react';
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
import { Save, X, FileDown, Mail, MessageCircle, Share2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import { formatCurrency } from '../utils/format-currency';
import { createQuotationSchema, type CreateQuotationSchema } from '../schemas/quotation-schema';
import type { QuotationLineFormState, QuotationExchangeRateFormState, QuotationBulkCreateDto, CreateQuotationDto, PricingRuleLineGetDto, UserDiscountLimitDto } from '../types/quotation-types';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { useQuotationCalculations } from '../hooks/useQuotationCalculations';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import { findExchangeRateByDovizTipi } from '../utils/price-conversion';

export function QuotationCreateForm(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setPageTitle } = useUIStore();
  const user = useAuthStore((state) => state.user);
  
  const [lines, setLines] = useState<QuotationLineFormState[]>([]);
  const [exchangeRates, setExchangeRates] = useState<QuotationExchangeRateFormState[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRuleLineGetDto[]>([]);
  const [temporarySallerData, setTemporarySallerData] = useState<UserDiscountLimitDto[]>([]);
  
  const createMutation = useCreateQuotationBulk();
  const { data: customerOptions = [] } = useCustomerOptions();
  const { currencyOptions } = useCurrencyOptions();

  useEffect(() => {
    setPageTitle(t('quotation.create.title', 'Yeni Teklif Oluştur'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  const form = useForm<CreateQuotationSchema>({
    resolver: zodResolver(createQuotationSchema),
    defaultValues: {
      quotation: {
        offerType: 'Domestic',
        currency: '',
        offerDate: new Date().toISOString().split('T')[0],
        representativeId: user?.id || null,
      },
    },
  });

  const watchedCurrency = Number(form.watch('quotation.currency') ?? '2');
  const watchedCustomerId = form.watch('quotation.potentialCustomerId');
  const watchedErpCustomerCode = form.watch('quotation.erpCustomerCode');
  const watchedRepresentativeId = form.watch('quotation.representativeId');
  const watchedOfferDate = form.watch('quotation.offerDate');
  
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
      toast.error(t('quotation.create.error', 'Teklif Oluşturulamadı'), {
        description: t('quotation.lines.required', 'En az 1 satır eklenmelidir'),
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
          pricingRuleHeaderId: cleanLineData.pricingRuleHeaderId && cleanLineData.pricingRuleHeaderId > 0 ? cleanLineData.pricingRuleHeaderId : null,
          relatedStockId: cleanLineData.relatedStockId && cleanLineData.relatedStockId > 0 ? cleanLineData.relatedStockId : null,
        };
      });

      const exchangeRatesToSend = exchangeRates.length > 0
        ? exchangeRates.map(({ id, dovizTipi, ...rate }) => {
            const currencyValue = rate.currency || (dovizTipi ? String(dovizTipi) : '');
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
        throw new Error(t('quotation.create.invalidCurrency', 'Geçerli bir para birimi seçilmelidir'));
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
      };

      const payload: QuotationBulkCreateDto = {
        quotation: quotationData,
        lines: linesToSend,
        exchangeRates: exchangeRatesToSend,
      };

      const result = await createMutation.mutateAsync(payload);

      if (result.success && result.data) {
        toast.success(t('quotation.create.success', 'Teklif Başarıyla Oluşturuldu'), {
          description: t('quotation.create.successMessage', 'Teklif onay sürecine gönderildi.'),
        });
        navigate(`/quotations/${result.data.id}`);
      } else {
        throw new Error(result.message || t('quotation.create.errorMessage', 'Teklif oluşturulurken bir hata oluştu.'));
      }
    } catch (error: unknown) {
      let errorMessage = t('quotation.create.errorMessage', 'Teklif oluşturulurken bir hata oluştu.');
      if (error instanceof Error) {
        errorMessage = error.message; 
      }
      toast.error(t('quotation.create.error', 'Teklif Oluşturulamadı'), {
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
    doc.text(t('quotation.create.title', 'Yeni Teklif'), 14, 20);
    doc.setFontSize(11);
    doc.text(`${t('quotation.date', 'Tarih')}: ${new Date().toLocaleDateString('tr-TR')}`, 14, 28);

    const headers = [[
      t('quotation.lines.productCode', 'Ürün Kodu'),
      t('quotation.lines.productName', 'Ürün Adı'),
      t('quotation.lines.quantity', 'Miktar'),
      t('quotation.lines.unitPrice', 'Birim Fiyat'),
      t('quotation.lines.vatRate', 'KDV'),
      t('quotation.lines.total', 'Toplam')
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
    const text = encodeURIComponent(t('quotation.share.whatsappMessage', 'Merhaba, teklif dosyasını iletiyorum.'));
    window.open(`https://wa.me/?text=${text}`, '_blank');
    toast.info(t('quotation.share.downloaded', 'PDF indirildi. Lütfen WhatsApp üzerinden paylaşınız.'));
  };

  const handleShareMail = async () => {
    const doc = await generatePDF();
    doc.save("teklif.pdf");
    const subject = encodeURIComponent(t('quotation.share.mailSubject', 'Teklif Dosyası'));
    const body = encodeURIComponent(t('quotation.share.mailBody', 'Merhaba, ekte teklif dosyasını bulabilirsiniz.'));
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    toast.info(t('quotation.share.downloaded', 'PDF indirildi. Lütfen e-posta ile paylaşınız.'));
  };

  const handleFormSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const formData = form.getValues();
    
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error(t('quotation.create.error', 'Teklif Oluşturulamadı'), {
        description: t('quotation.create.validationError', 'Lütfen form alanlarını kontrol ediniz.'),
      });
      return;
    }

    await onSubmit(formData);
  };

  return (
    <div className="w-full space-y-8 relative pb-10">
      <FormProvider {...form}>
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t('quotation.create.title', 'Yeni Teklif Oluştur')}</h2>
          </div>

          <div className="flex flex-col gap-6">
            <div className="space-y-1">
              <QuotationHeaderForm 
                exchangeRates={exchangeRates}
                onExchangeRatesChange={setExchangeRates}
                lines={lines}
                onLinesChange={async () => {
                  const newCurrency = form.getValues('quotation.currency');
                  if (newCurrency) {
                    await handleCurrencyChange(newCurrency);
                  }
                }}
              />
            </div>

            {/* 2. SECTION: LINE TABLE */}
            <div className="space-y-1 pt-2">
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
              />
            </div>

            <div className="space-y-4 pt-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="hidden md:block">
                  {/* Sol taraf notlar için ayrıldı */}
                </div>
                <div className="bg-zinc-50/80 dark:bg-zinc-900/50 rounded-xl p-6 border border-zinc-200 dark:border-white/10 shadow-sm">
                  <QuotationSummaryCard lines={lines} currency={watchedCurrency} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-white/10">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="group"
              >
                <X className="mr-2 h-4 w-4" />
                {t('quotation.cancel', 'İptal')}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className="group">
                    <Share2 className="mr-2 h-4 w-4" />
                    {t('quotation.export', 'Dışa Aktar')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-[#130822] border-slate-100 dark:border-white/10">
                  <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5">
                    <FileDown className="mr-2 h-4 w-4 text-slate-500" />
                    {t('quotation.exportPdf', 'PDF İndir')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShareWhatsApp} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5">
                    <MessageCircle className="mr-2 h-4 w-4 text-green-500" />
                    {t('quotation.shareWhatsapp', 'WhatsApp ile Paylaş')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShareMail} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5">
                    <Mail className="mr-2 h-4 w-4 text-blue-500" />
                    {t('quotation.shareMail', 'E-posta ile Paylaş')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="group bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white min-w-[140px]"
              >
                <Save className="mr-2 h-4 w-4" />
                {createMutation.isPending 
                  ? t('quotation.saving', 'Kaydediliyor...') 
                  : t('quotation.save', 'Teklifi Kaydet')
                }
              </Button>
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
