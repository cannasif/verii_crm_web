import { type ReactElement, useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CustomerSelectDialog } from '@/components/shared/CustomerSelectDialog';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import { useShippingAddresses } from '../hooks/useShippingAddresses';
import { useOrderRelatedUsers } from '../hooks/useOrderRelatedUsers';
import { usePaymentTypes } from '../hooks/usePaymentTypes';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import { useCustomer } from '@/features/customer-management/hooks/useCustomer';
import { useErpProjects } from '@/services/hooks/useErpProjects';
import { useAvailableDocumentSerialTypes } from '@/features/document-serial-type-management/hooks/useAvailableDocumentSerialTypes';
import { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';
import type { KurDto } from '@/services/erp-types';
import { ExchangeRateDialog } from './ExchangeRateDialog';
import { QuotationNotesDialog } from '@/features/quotation/components/QuotationNotesDialog';
import type { QuotationNotesDto } from '@/features/quotation/types/quotation-types';
import { 
  DollarSign, Search, User, Truck, Briefcase, Globe, 
  Calendar, CreditCard, Hash, FileText, ArrowRightLeft, 
  Layers, Quote, Folder, ListPlus, X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth-store';
import type { CreateOrderSchema } from '../schemas/order-schema';
import type { OrderExchangeRateFormState } from '../types/order-types';
import { cn } from '@/lib/utils';

interface OrderHeaderFormProps {
  exchangeRates?: OrderExchangeRateFormState[];
  onExchangeRatesChange?: (rates: OrderExchangeRateFormState[]) => void;
  quotationNotes?: QuotationNotesDto;
  onQuotationNotesChange?: (notes: QuotationNotesDto) => void;
  onSaveNotes?: (notes: QuotationNotesDto) => Promise<void>;
  isSavingNotes?: boolean;
  lines?: Array<{ productCode?: string | null; productName?: string | null }>;
  onLinesChange?: (lines: Array<{ productCode?: string | null; productName?: string | null }>) => void;
  initialCurrency?: string | number | null;
  revisionNo?: string | null;
  orderId?: number | null;
  orderOfferNo?: string | null;
  readOnly?: boolean;
  showDocumentSerialType?: boolean;
}

export function OrderHeaderForm({
  exchangeRates = [],
  onExchangeRatesChange,
  quotationNotes = {},
  onQuotationNotesChange,
  onSaveNotes,
  isSavingNotes = false,
  lines = [],
  onLinesChange,
  initialCurrency,
  revisionNo,
  orderId,
  orderOfferNo,
  readOnly = false,
  showDocumentSerialType = true,
}: OrderHeaderFormProps = {}): ReactElement {
  const { t } = useTranslation();
  const form = useFormContext<CreateOrderSchema>();
  const { data: erpRates = [] } = useExchangeRate();
  const user = useAuthStore((state) => state.user);

  const [customerSelectDialogOpen, setCustomerSelectDialogOpen] = useState(false);
  const [exchangeRateDialogOpen, setExchangeRateDialogOpen] = useState(false);
  const [currencyChangeDialogOpen, setCurrencyChangeDialogOpen] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const isInitialLoadRef = useRef(true);

  const filledNoteKeys = (['note1', 'note2', 'note3', 'note4', 'note5', 'note6', 'note7', 'note8', 'note9', 'note10', 'note11', 'note12', 'note13', 'note14', 'note15'] as const).filter(
    (k) => (quotationNotes[k] ?? '').trim().length > 0
  );

  const handleRemoveNote = (key: keyof QuotationNotesDto): void => {
    if (onQuotationNotesChange) {
      onQuotationNotesChange({ ...quotationNotes, [key]: '' });
    }
  };

  // Watchers
  const watchedCustomerId = form.watch('order.potentialCustomerId');
  const watchedErpCustomerCode = form.watch('order.erpCustomerCode');
  const watchedCurrency = form.watch('order.currency');
  const watchedRepresentativeId = form.watch('order.representativeId');

  const { data: shippingAddresses } = useShippingAddresses(watchedCustomerId || undefined);
  const { data: relatedUsers = [] } = useOrderRelatedUsers(user?.id);
  const { data: paymentTypes } = usePaymentTypes();
  const { data: customer } = useCustomer(watchedCustomerId ?? 0);
  const { data: projects = [] } = useErpProjects();
  
  const customerTypeId = useMemo(() => {
    if (watchedErpCustomerCode) return 0;
    return customer?.customerTypeId ?? undefined;
  }, [watchedErpCustomerCode, customer?.customerTypeId]);
  
  const { data: availableDocumentSerialTypes = [] } = useAvailableDocumentSerialTypes(
    customerTypeId,
    watchedRepresentativeId ?? undefined,
    PricingRuleType.Order
  );

  const customerDisplayValue = useMemo(() => {
    if (!watchedCustomerId) return '';
    if (customer) {
      return customer.customerCode?.trim()
        ? `ERP: ${customer.customerCode} - ${customer.name}`
        : `CRM: ${customer.name}`;
    }
    return `ID: ${watchedCustomerId}`;
  }, [watchedCustomerId, customer]);

  useEffect(() => {
    const currentRepresentativeId = form.watch('order.representativeId');
    if (!currentRepresentativeId && user?.id) {
      form.setValue('order.representativeId', user.id);
    }
  }, [form, user]);

  useEffect(() => {
    if (initialCurrency !== null && initialCurrency !== undefined) {
      isInitialLoadRef.current = true;
      const timer = setTimeout(() => isInitialLoadRef.current = false, 1000);
      return () => clearTimeout(timer);
    }
  }, [initialCurrency]);

  useEffect(() => {
    if (watchedCurrency && initialCurrency !== null && initialCurrency !== undefined) {
      const watchedCurrencyNum = typeof watchedCurrency === 'string' ? Number(watchedCurrency) : watchedCurrency;
      const initialCurrencyNum = typeof initialCurrency === 'string' ? Number(initialCurrency) : initialCurrency;
      if (watchedCurrencyNum === initialCurrencyNum) {
        isInitialLoadRef.current = true;
        const timer = setTimeout(() => isInitialLoadRef.current = false, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [watchedCurrency, initialCurrency]);

  const selectedCustomer = watchedCustomerId || watchedErpCustomerCode;

  const handleExchangeRatesSave = (rates: OrderExchangeRateFormState[]): void => {
    if (onExchangeRatesChange) onExchangeRatesChange(rates);
  };

  const handleCurrencyChange = (newCurrency: string): void => {
    const currentCurrency = form.watch('order.currency');
    const newCurrencyNum = Number(newCurrency);
    const currentCurrencyNum = typeof currentCurrency === 'string' ? Number(currentCurrency) : currentCurrency;
    
    if (isInitialLoadRef.current) {
      form.setValue('order.currency', newCurrency, { shouldValidate: false, shouldDirty: false });
      return;
    }
    
    if (initialCurrency !== null && initialCurrency !== undefined) {
      const initialCurrencyNum = typeof initialCurrency === 'string' ? Number(initialCurrency) : initialCurrency;
      if (initialCurrencyNum === newCurrencyNum) {
        form.setValue('order.currency', newCurrency, { shouldValidate: false, shouldDirty: false });
        return;
      }
    }
    
    if (currentCurrencyNum === newCurrencyNum) return;
    
    if (lines && lines.length > 0 && onLinesChange) {
      setPendingCurrency(newCurrency);
      setCurrencyChangeDialogOpen(true);
    } else {
      form.setValue('order.currency', newCurrency);
    }
  };

  const handleCurrencyChangeConfirm = (): void => {
    if (pendingCurrency && onLinesChange) {
      form.setValue('order.currency', pendingCurrency);
      onLinesChange(lines || []);
      setCurrencyChangeDialogOpen(false);
      setPendingCurrency(null);
    }
  };

  const handleCurrencyChangeCancel = (): void => {
    setCurrencyChangeDialogOpen(false);
    setPendingCurrency(null);
  };

  const styles = {
    glassCard: "relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl shadow-sm transition-all duration-300 hover:shadow-md",
    inputBase: "pl-10 h-11 bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm hover:shadow transition-all duration-300 ease-out focus-visible:border-pink-500 focus-visible:ring-4 focus-visible:ring-pink-500/20 w-full",
    label: "text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 pl-1 flex items-center gap-1.5",
    iconWrapper: "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-pink-600 dark:group-focus-within:text-pink-500 pointer-events-none z-10 flex items-center justify-center",
  };

  return (
    <div className="relative space-y-6 pt-2 pb-8 animate-in fade-in slide-in-from-bottom-3 duration-700">
      <div className="absolute -top-10 -left-10 w-96 h-96 bg-pink-500/10 blur-[100px] pointer-events-none rounded-full" />
      <div className="absolute top-20 right-0 w-80 h-80 bg-orange-500/5 blur-[80px] pointer-events-none rounded-full" />
      <div className="relative z-10 flex items-center gap-3 mb-6 px-1">
        <div className="p-2.5 bg-linear-to-br from-pink-500 to-rose-600 rounded-xl shadow-lg shadow-pink-500/30 text-white">
           <Quote className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            {t('order.header.title', 'Sipariş Detayları')}
            {revisionNo && (
              <span className="px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 text-[10px] font-bold border border-pink-200 dark:border-pink-800">
                REV-{revisionNo}
              </span>
            )}
          </h2>
          <p className="text-xs text-zinc-500 font-medium flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse shadow-[0_0_6px_rgba(236,72,153,0.8)]" />
            {t('order.header.subtitle', 'Müşteri ve finansal bilgileri buradan yönetebilirsiniz.')}
          </p>
        </div>
      </div>

      <div className={styles.glassCard}>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
            
            {/* Müşteri Seçimi */}
            <div className="lg:col-span-8">
              <FormField
                control={form.control}
                name="order.potentialCustomerId"
                render={() => (
                  <FormItem className="space-y-0 relative group">
                    <FormLabel className={styles.label}>
                      {t('order.header.customer', 'Müşteri Hesabı')} <span className="text-pink-500">*</span>
                    </FormLabel>
                    <div className="flex gap-2">
                      <div className="relative flex-1 group">
                        <div className={styles.iconWrapper}>
                          <User className="h-4 w-4" />
                        </div>
                        <FormControl>
                          <Input
                            className={cn(styles.inputBase, "font-semibold text-zinc-800 dark:text-zinc-100")}
                            value={customerDisplayValue}
                            placeholder={t('order.header.selectCustomer', 'Müşteri seçiniz...')}
                            readOnly
                            onClick={() => !readOnly && setCustomerSelectDialogOpen(true)}
                            disabled={readOnly}
                          />
                        </FormControl>
                      </div>
                      <Button
                        type="button"
                        onClick={() => setCustomerSelectDialogOpen(true)}
                        disabled={readOnly}
                        className="h-11 px-6 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white shadow-md hover:shadow-lg transition-all border border-zinc-800 active:scale-95"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        {t('order.select', 'Seç')}
                      </Button>
                    </div>
                    <FormMessage className="mt-1.5" />
                  </FormItem>
                )}
              />
            </div>

            {/* Temsilci Seçimi */}
            <div className="lg:col-span-4">
              <FormField
                control={form.control}
                name="order.representativeId"
                render={({ field }) => (
                  <FormItem className="space-y-0 relative group">
                    <FormLabel className={styles.label}>
                      {t('order.header.representative', 'Satış Temsilcisi')}
                    </FormLabel>
                    <div className="relative">
                       <div className={styles.iconWrapper}><Briefcase className="h-4 w-4" /></div>
                       <VoiceSearchCombobox
                         className={styles.inputBase}
                         value={field.value?.toString() || ''}
                         onSelect={(value) => field.onChange(value ? Number(value) : null)}
                         options={relatedUsers.map((u) => ({
                           value: u.userId.toString(),
                           label: [u.firstName, u.lastName].filter(Boolean).join(' ')
                         }))}
                         placeholder={t('order.select', 'Seçiniz')}
                         searchPlaceholder={t('common.search', 'Ara...')}
                       />
                    </div>
                    <FormMessage className="mt-1.5" />
                  </FormItem>
                )}
              />
            </div>
            
            {selectedCustomer && (
              <div className="lg:col-span-12 animate-in slide-in-from-top-2 fade-in duration-500">
                <FormField
                  control={form.control}
                  name="order.shippingAddressId"
                  render={({ field }) => (
                    <FormItem className="space-y-0 relative group">
                      <FormLabel className={styles.label}>
                         <Truck className="h-3.5 w-3.5 text-orange-500" />
                        {t('order.header.shippingAddress', 'Sevk Adresi')}
                      </FormLabel>
                      <div className="relative">
                         <div className={styles.iconWrapper}><Truck className="h-4 w-4" /></div>
                         <VoiceSearchCombobox
                           className={cn(styles.inputBase, "bg-orange-50/30 dark:bg-orange-950/10 border-orange-100 dark:border-orange-900/30")}
                           value={field.value?.toString() || ''}
                           onSelect={(value) => field.onChange(value ? Number(value) : null)}
                           options={shippingAddresses.map((address) => ({
                             value: address.id.toString(),
                             label: address.addressText
                           }))}
                           placeholder={t('order.header.selectShippingAddress', 'Sevk adresi seçin')}
                           searchPlaceholder={t('common.search', 'Ara...')}
                           disabled={readOnly}
                         />
                      </div>
                      <FormMessage className="mt-1.5" />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. DETAYLAR GRID'İ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SOL: FİNANSAL BİLGİLER */}
        <div className={styles.glassCard}>
          <div className="p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
                  <CreditCard className="h-4 w-4" />
                </div>
                Finansal
              </h4>
              {onExchangeRatesChange && (
                 <Button
                   type="button"
                   variant="ghost"
                   size="sm"
                   onClick={() => setExchangeRateDialogOpen(true)}
                   className="h-7 px-2 text-xs font-medium text-pink-600 hover:text-pink-700 hover:bg-pink-50 dark:hover:bg-pink-900/20"
                 >
                   <ArrowRightLeft className="w-3.5 h-3.5 mr-1" />
                   Kurlar
                 </Button>
               )}
            </div>
            
            <div className="space-y-4 flex-1">
              <FormField
                control={form.control}
                name="order.currency"
                render={({ field }) => (
                  <FormItem className="space-y-0 relative group">
                    <FormLabel className={styles.label}>Para Birimi</FormLabel>
                    <div className="relative">
                      <div className={styles.iconWrapper}><DollarSign className="h-4 w-4 text-emerald-600" /></div>
                      <VoiceSearchCombobox
                        className={cn(styles.inputBase, "font-bold tracking-wide text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30")}
                        value={field.value ? String(field.value) : ''}
                        onSelect={(value) => {
                          if (value) handleCurrencyChange(value);
                        }}
                        options={erpRates.map((currency: KurDto) => ({
                          value: String(currency.dovizTipi),
                          label: currency.dovizIsmi || `Döviz ${currency.dovizTipi}`
                        }))}
                        placeholder={t('order.select', 'Seçiniz')}
                        searchPlaceholder={t('common.search', 'Ara...')}
                        disabled={readOnly}
                      />
                    </div>
                    <FormMessage className="mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="order.paymentTypeId"
                render={({ field }) => (
                  <FormItem className="space-y-0 relative group">
                    <FormLabel className={styles.label}>Ödeme Planı</FormLabel>
                    <div className="relative">
                       <div className={styles.iconWrapper}><CreditCard className="h-4 w-4" /></div>
                       <VoiceSearchCombobox
                         className={styles.inputBase}
                         value={field.value?.toString() || ''}
                         onSelect={(value) => field.onChange(value ? Number(value) : null)}
                         options={paymentTypes?.map((pt) => ({
                           value: pt.id.toString(),
                           label: pt.name
                         })) || []}
                         placeholder={t('order.select', 'Seçiniz')}
                         searchPlaceholder={t('common.search', 'Ara...')}
                         disabled={readOnly}
                       />
                    </div>
                    <FormMessage className="mt-1" />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <div className={styles.glassCard}>
          <div className="p-5 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                <Globe className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Tip & Tarihler</h4>
            </div>

            <div className="space-y-4 flex-1">
              <FormField
                control={form.control}
                name="order.offerType"
                render={({ field }) => (
                  <FormItem className="space-y-0 relative group">
                    <FormLabel className={styles.label}>
                      Sipariş Tipi <span className="text-pink-500 ml-0.5">*</span>
                    </FormLabel>
                    <div className="relative">
                       <div className={styles.iconWrapper}><Layers className="h-4 w-4" /></div>
                       <VoiceSearchCombobox
                         className={styles.inputBase}
                         value={field.value || ''}
                         onSelect={(value) => field.onChange(value)}
                         options={[
                           { value: 'Domestic', label: t('order.offerType.domestic', 'Yurtiçi') },
                           { value: 'Export', label: t('order.offerType.export', 'Yurtdışı') }
                         ]}
                         placeholder="Seçiniz"
                         searchPlaceholder={t('common.search', 'Ara...')}
                         disabled={readOnly}
                       />
                    </div>
                    <FormMessage className="mt-1" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                 <FormField
                  control={form.control}
                  name="order.offerDate"
                  render={({ field }) => (
                    <FormItem className="space-y-0 relative group">
                      <FormLabel className={styles.label}>Sipariş T.</FormLabel>
                      <div className="relative">
                        <div className={styles.iconWrapper}><Calendar className="h-4 w-4" /></div>
                        <FormControl>
                          <Input 
                            type="date" 
                            className={cn(styles.inputBase, "pl-10 text-xs")} 
                            {...field}
                            value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="mt-1" />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="order.deliveryDate"
                  render={({ field }) => (
                    <FormItem className="space-y-0 relative group">
                      <FormLabel className={styles.label}>Teslim T.</FormLabel>
                      <div className="relative">
                        <div className={styles.iconWrapper}><Truck className="h-4 w-4" /></div>
                        <FormControl>
                          <Input 
                            type="date" 
                            className={cn(styles.inputBase, "pl-10 text-xs")}
                            {...field}
                            value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(e.target.value)}
                            disabled={readOnly}
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="mt-1" />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        {/* SAĞ: BELGE & NOTLAR */}
        <div className={styles.glassCard}>
           <div className="p-5 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-600">
                  <FileText className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Belge Detayı</h4>
              </div>

              <div className="space-y-4 flex-1">
                 {showDocumentSerialType && (
                  <FormField
                    control={form.control}
                    name="order.documentSerialTypeId"
                    render={({ field }) => (
                      <FormItem className="space-y-0 relative group">
                        <FormLabel className={styles.label}>Seri No <span className="text-pink-500">*</span></FormLabel>
                        <div className="relative">
                          <div className={styles.iconWrapper}><Hash className="h-4 w-4" /></div>
                          <VoiceSearchCombobox
                            className={styles.inputBase}
                            value={field.value?.toString() || ''}
                            onSelect={(value) => field.onChange(value ? Number(value) : null)}
                            options={availableDocumentSerialTypes
                              .filter((d) => d.serialPrefix?.trim() !== '')
                              .map((d) => ({
                                value: d.id.toString(),
                                label: d.serialPrefix || ''
                              }))}
                            disabled={readOnly || customerTypeId === undefined || !watchedRepresentativeId}
                            placeholder={t('order.select', 'Seç')}
                            searchPlaceholder={t('common.search', 'Ara...')}
                          />
                        </div>
                        <FormMessage className="mt-1" />
                      </FormItem>
                    )}
                  />
                )}

                <div>
                  <FormField
                    control={form.control}
                    name="order.projectCode"
                    render={({ field }) => (
                      <FormItem className="space-y-0 relative group">
                        <FormLabel className={styles.label}>
                          <Folder className="h-3.5 w-3.5" />
                          {t('quotation.header.projectCode', 'Proje Kodu')}
                        </FormLabel>
                        <div className="relative">
                          <div className={styles.iconWrapper}><Folder className="h-4 w-4" /></div>
                          <VoiceSearchCombobox
                            className={styles.inputBase}
                            value={field.value || ''}
                            onSelect={(value) => field.onChange(value)}
                            options={projects.map((p) => ({
                              value: p.projeKod,
                              label: p.projeKod + ' - ' + p.projeAciklama
                            }))}
                            placeholder={t('quotation.header.projectCodePlaceholder', 'Proje kodu seçiniz...')}
                            searchPlaceholder={t('common.search', 'Ara...')}
                            disabled={readOnly}
                          />
                        </div>
                        <FormMessage className="mt-1.5" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="order.description"
                  render={({ field }) => (
                    <FormItem className="space-y-0 relative group">
                      <div className="flex items-center justify-between mb-2">
                        <FormLabel className={cn(styles.label, "mb-0")}>
                          Notlar
                        </FormLabel>
                      </div>
                      {filledNoteKeys.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2.5">
                          {filledNoteKeys.map((key, idx) => (
                            <Badge
                              key={key}
                              variant="secondary"
                              className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors pr-1 h-6 text-xs border border-purple-200 dark:border-purple-500/20"
                            >
                              <span className="mr-1.5 truncate max-w-[200px]">
                                {(quotationNotes[key] ?? '').trim() || `${t('quotation.notes.noteLabel', 'Not')} ${idx + 1}`}
                              </span>
                              {!readOnly && onQuotationNotesChange && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveNote(key)}
                                  className="p-0.5 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <FormControl>
                        <div className="relative">
                          <Textarea
                            {...field}
                            value={field.value || ''}
                            placeholder={t('order.header.descriptionPlaceholder', 'Özel koşullar...')}
                            className="min-h-[80px] rounded-xl border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/30 resize-none focus-visible:border-pink-500 focus-visible:ring-4 focus-visible:ring-pink-500/20 transition-all text-sm py-2.5 pr-10"
                            disabled={readOnly}
                          />
                          {onQuotationNotesChange && (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="absolute right-1 top-1 h-7 w-7 text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                              onClick={() => setNotesDialogOpen(true)}
                              disabled={readOnly}
                            >
                              <ListPlus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage className="mt-1" />
                    </FormItem>
                  )}
                />
              </div>
           </div>
        </div>
      </div>

      <CustomerSelectDialog
        open={customerSelectDialogOpen}
        onOpenChange={setCustomerSelectDialogOpen}
        onSelect={(result) => {
          form.setValue('order.potentialCustomerId', result.customerId ?? null);
          form.setValue('order.erpCustomerCode', result.erpCustomerCode ?? null);
        }}
      />

      {exchangeRates !== undefined && onExchangeRatesChange && (
        <ExchangeRateDialog
          open={exchangeRateDialogOpen}
          onOpenChange={setExchangeRateDialogOpen}
          exchangeRates={exchangeRates}
          onSave={handleExchangeRatesSave}
          lines={lines}
          currentCurrency={watchedCurrency ? (typeof watchedCurrency === 'string' ? Number(watchedCurrency) : watchedCurrency) : undefined}
          orderId={orderId}
          orderOfferNo={orderOfferNo}
          readOnly={readOnly}
        />
      )}

      {onQuotationNotesChange && (
        <QuotationNotesDialog
          open={notesDialogOpen}
          onOpenChange={setNotesDialogOpen}
          value={quotationNotes}
          onChange={onQuotationNotesChange}
          onSaveAsync={onSaveNotes}
          isSaving={isSavingNotes}
        />
      )}

      <Dialog open={currencyChangeDialogOpen} onOpenChange={setCurrencyChangeDialogOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-pink-600">
              <ArrowRightLeft className="h-5 w-5" />
              {t('order.header.currencyChange.title', 'Kur Değişikliği')}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {t('order.header.currencyChange.message', 'Para birimi değişikliği tüm satırları etkileyecektir. Devam etmek istiyor musunuz?')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={handleCurrencyChangeCancel} className="rounded-xl">
              {t('order.cancel', 'Vazgeç')}
            </Button>
            <Button onClick={handleCurrencyChangeConfirm} className="rounded-xl bg-pink-600 hover:bg-pink-700 text-white">
              {t('order.confirm', 'Onayla')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
