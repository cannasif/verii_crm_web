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
import {
  usePaymentTypeOptionsInfinite,
  useSalesTypeOptionsInfinite,
} from '@/components/shared/dropdown/useDropdownEntityInfinite';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import { useCustomer } from '@/features/customer-management/hooks/useCustomer';
import { useErpProjectCodesInfinite } from '@/services/hooks/useErpProjectCodesInfinite';
import { useAvailableDocumentSerialTypes } from '@/features/document-serial-type-management/hooks/useAvailableDocumentSerialTypes';
import { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';
import type { KurDto } from '@/services/erp-types';
import { ExchangeRateDialog } from './ExchangeRateDialog';
import { QuotationNotesDialog } from '@/features/quotation/components/QuotationNotesDialog';
import type { QuotationNotesDto } from '@/features/quotation/types/quotation-types';
import { 
  Search, User, Truck, Briefcase, Globe, 
  Calendar, CreditCard, Hash, FileText, ArrowRightLeft, 
  Layers, Folder, ListPlus, X, MapPin, BookUser,
  Banknote
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth-store';
import { createOrderSchema, type CreateOrderSchema } from '../schemas/order-schema';
import type { OrderExchangeRateFormState } from '../types/order-types';
import { OfferType } from '@/types/offer-type';
import { cn } from '@/lib/utils';
import { isZodFieldRequired } from '@/lib/zod-required';

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
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [paymentTypeSearchTerm, setPaymentTypeSearchTerm] = useState('');
  const [deliveryMethodSearchTerm, setDeliveryMethodSearchTerm] = useState('');
  const isInitialLoadRef = useRef(true);

  const filledNoteKeys = (['note1', 'note2', 'note3', 'note4', 'note5', 'note6', 'note7', 'note8', 'note9', 'note10', 'note11', 'note12', 'note13', 'note14', 'note15'] as const).filter(
    (k) => (quotationNotes[k] ?? '').trim().length > 0
  );

  const handleRemoveNote = (key: keyof QuotationNotesDto): void => {
    if (onQuotationNotesChange) {
      onQuotationNotesChange({ ...quotationNotes, [key]: '' });
    }
  };

  const watchedCustomerId = form.watch('order.potentialCustomerId');
  const watchedErpCustomerCode = form.watch('order.erpCustomerCode');
  const watchedCurrency = form.watch('order.currency');
  const watchedRepresentativeId = form.watch('order.representativeId');
  const watchedOfferType = form.watch('order.offerType');

  const paymentTypeDropdown = usePaymentTypeOptionsInfinite(paymentTypeSearchTerm, true);
  const deliveryMethodDropdown = useSalesTypeOptionsInfinite(
    deliveryMethodSearchTerm,
    !!watchedOfferType,
    watchedOfferType ?? null
  );

  const prevOfferTypeRef = useRef(watchedOfferType);
  useEffect(() => {
    if (prevOfferTypeRef.current !== watchedOfferType) {
      prevOfferTypeRef.current = watchedOfferType;
      form.setValue('order.deliveryMethod', null);
    }
  }, [watchedOfferType, form]);

  const { data: shippingAddresses = [] } = useShippingAddresses(watchedCustomerId || undefined);
  const { data: relatedUsers = [] } = useOrderRelatedUsers(user?.id);
  const shouldFetchCustomer = Boolean(watchedCustomerId && !watchedErpCustomerCode);
  const { data: customer } = useCustomer(watchedCustomerId ?? 0, shouldFetchCustomer);
  const projectDropdown = useErpProjectCodesInfinite(projectSearchTerm);
  
  const customerTypeId = useMemo(() => {
    if (watchedErpCustomerCode) return 0;
    return customer?.customerTypeId ?? 0;
  }, [watchedErpCustomerCode, customer?.customerTypeId]);
  
  const { data: availableDocumentSerialTypes = [] } = useAvailableDocumentSerialTypes(
    customerTypeId,
    watchedRepresentativeId ?? undefined,
    PricingRuleType.Order
  );

  const customerDisplayValue = useMemo(() => {
    if (!watchedCustomerId && !watchedErpCustomerCode) return '';
    if (customer) {
      return customer.customerCode?.trim()
        ? `ERP: ${customer.customerCode} - ${customer.name}`
        : `CRM: ${customer.name}`;
    }
    if (watchedErpCustomerCode) {
      return `ERP: ${watchedErpCustomerCode}`;
    }
    return `ID: ${watchedCustomerId}`;
  }, [watchedCustomerId, watchedErpCustomerCode, customer]);

  useEffect(() => {
    if (!watchedRepresentativeId && user?.id) {
      form.setValue('order.representativeId', user.id);
    }
  }, [form, user, watchedRepresentativeId]);

  useEffect(() => {
    if (initialCurrency === null || initialCurrency === undefined) {
      isInitialLoadRef.current = false;
      return;
    }

    if (initialCurrency !== null && initialCurrency !== undefined) {
      isInitialLoadRef.current = true;
      const timer = setTimeout(() => isInitialLoadRef.current = false, 1000);
      return () => clearTimeout(timer);
    }
  }, [initialCurrency]);

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

  const currencyConfig = useMemo(() => {
    const val = String(watchedCurrency);
    switch (val) {
      case '1': return { color: "text-red-500", bg: "bg-red-50/50 dark:bg-red-950/20", border: "border-red-200 dark:border-red-800/50" };
      case '2': return { color: "text-blue-500", bg: "bg-blue-50/50 dark:bg-blue-950/20", border: "border-blue-200 dark:border-blue-800/50" };
      case '3': return { color: "text-amber-500", bg: "bg-amber-50/50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800/50" };
      default: return { color: "text-emerald-500", bg: "bg-emerald-50/50 dark:bg-emerald-950/20", border: "border-emerald-200 dark:border-emerald-800/50" };
    }
  }, [watchedCurrency]);

  const styles = {
    glassCard: "relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl shadow-sm transition-all duration-300 hover:shadow-md",
    inputBase: "h-11 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm transition-all duration-300 focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 outline-none w-full",
    label: "text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2",
    iconWrapper: "absolute left-3 top-1/2 -translate-y-1/2 transition-colors z-20 flex items-center justify-center pointer-events-none",
    selectTrigger: "w-full h-11 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hover:border-pink-400 dark:hover:border-zinc-700 transition-all shadow-sm rounded-xl focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 outline-none",
    selectContent: "rounded-xl border-zinc-200 dark:border-zinc-800 shadow-2xl backdrop-blur-xl",
    selectItem: "focus:bg-pink-50 dark:focus:bg-pink-900/10 focus:text-pink-600 cursor-pointer rounded-lg m-1"
  };

  return (
    <div className="relative space-y-6 pt-2 pb-8 animate-in fade-in slide-in-from-bottom-3 duration-700">
      <div className="absolute -top-10 -left-10 w-96 h-96 bg-pink-500/10 blur-[100px] pointer-events-none rounded-full" />
      <div className="absolute top-20 right-0 w-80 h-80 bg-orange-500/5 blur-[80px] pointer-events-none rounded-full" />
      
      {/* CUSTOMER CARD */}
      <div className={styles.glassCard}>
        <div className="p-4 sm:p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8 items-start">
                <div className="xl:col-span-2 space-y-2">
                  <div className={styles.label}>
                    <div className="p-1 rounded-md bg-pink-50 dark:bg-pink-900/20 text-pink-600">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    {t('order.header.customer')}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1 group min-w-0">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 z-10 pointer-events-none group-focus-within:text-pink-500 transition-colors">
                        <Search className="h-4 w-4" />
                      </div>
                      <Input
                        className={cn(styles.inputBase, "pl-10 font-medium truncate cursor-pointer focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500")}
                        value={customerDisplayValue}
                        placeholder={t('order.header.selectCustomer')}
                        readOnly
                        onClick={() => !readOnly && setCustomerSelectDialogOpen(true)}
                        disabled={readOnly}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCustomerSelectDialogOpen(true)}
                      className="h-11 w-11 shrink-0 rounded-xl border-zinc-200 dark:border-zinc-800 hover:bg-pink-600 hover:border-pink-600 hover:text-white transition-all duration-300 shadow-sm"
                      disabled={readOnly}
                    >
                      <BookUser className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="xl:col-span-1 space-y-2">
                  <div className={styles.label}>
                    <div className="p-1 rounded-md bg-purple-50 dark:bg-purple-900/20 text-purple-600">
                      <Briefcase className="w-3.5 h-3.5" />
                    </div>
                    {t('order.header.representative')}
                  </div>
                  <FormField
                    control={form.control}
                    name="order.representativeId"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <VoiceSearchCombobox
                            options={relatedUsers.map((u) => ({
                              value: u.userId.toString(),
                              label: [u.firstName, u.lastName].filter(Boolean).join(' ') || String(u.userId),
                            }))}
                            value={field.value?.toString() || ''}
                            onSelect={(v) => field.onChange(v ? Number(v) : null)}
                            placeholder={t('order.select')}
                            className={cn(styles.selectTrigger, "px-4 font-medium text-zinc-700 dark:text-zinc-200 focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500")}
                            disabled={readOnly}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px] mt-1" />
                      </FormItem>
                    )}
                  />
                </div>
            </div>

            {selectedCustomer && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="space-y-2">
                  <div className={styles.label}>
                    <div className="p-1 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    {t('order.header.shippingAddress')}
                  </div>
                  <FormField
                    control={form.control}
                    name="order.shippingAddressId"
                    render={({ field }) => (
                      <FormItem className="space-y-0 min-w-0">
                        <FormControl>
                          <VoiceSearchCombobox
                            options={shippingAddresses.map((a) => ({
                              value: a.id.toString(),
                              label: a.addressText || String(a.id),
                            }))}
                            value={field.value?.toString() || ''}
                            onSelect={(v) => field.onChange(v ? Number(v) : null)}
                            placeholder={t('order.header.selectShippingAddress')}
                            className={cn(styles.selectTrigger, "px-4 hover:border-emerald-400 dark:hover:border-emerald-600 shadow-sm focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {/* CARD 1: FINANSAL */}
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
                   className="h-7 px-2 text-xs font-medium text-pink-600 hover:text-pink-700 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors"
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
                    <FormLabel className={styles.label} required={isZodFieldRequired(createOrderSchema, 'order.currency')}>Para Birimi</FormLabel>
                    <div className="relative">
                      <div className={cn(styles.iconWrapper, currencyConfig.color)}>
                        <Banknote className="h-4 w-4" />
                      </div>
                      <FormControl>
                        <VoiceSearchCombobox
                          options={erpRates.map((c: KurDto) => ({
                            value: String(c.dovizTipi),
                            label: c.dovizIsmi || `Döviz ${c.dovizTipi}`,
                          }))}
                          value={field.value ? String(field.value) : ''}
                          onSelect={(v) => v && handleCurrencyChange(v)}
                          placeholder={t('order.select')}
                          className={cn(
                            styles.selectTrigger,
                            "pl-10 font-bold tracking-wide transition-all focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500",
                            currencyConfig.color,
                            currencyConfig.bg,
                            currencyConfig.border,
                            "hover:brightness-95 dark:hover:brightness-110"
                          )}
                          disabled={readOnly}
                        />
                      </FormControl>
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
                    <FormLabel className={styles.label}>{t('order.header.paymentType')}</FormLabel>
                    <div className="relative">
                      <div className={cn(styles.iconWrapper, "text-zinc-400 group-focus-within:text-pink-500")}>
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <FormControl>
                        <VoiceSearchCombobox
                          options={paymentTypeDropdown.options}
                          value={field.value?.toString() || ''}
                          onSelect={(v) => field.onChange(v ? Number(v) : null)}
                          onDebouncedSearchChange={setPaymentTypeSearchTerm}
                          onFetchNextPage={paymentTypeDropdown.fetchNextPage}
                          hasNextPage={paymentTypeDropdown.hasNextPage}
                          isLoading={paymentTypeDropdown.isLoading}
                          isFetchingNextPage={paymentTypeDropdown.isFetchingNextPage}
                          placeholder={t('order.select')}
                          className={cn(styles.selectTrigger, "pl-10 hover:border-pink-400 dark:hover:border-zinc-700 focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500")}
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

        {/* CARD 2: TIP & TARIHLER */}
        <div className={styles.glassCard}>
          <div className="p-5 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                <Globe className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Tip & Tarihler</h4>
            </div>
            <div className="space-y-4 flex-1">
              {/* FIXED: Changed from grid with 2 columns to flex-col/grid-cols-1 to prevent overlap */}
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="order.offerType"
                  render={({ field }) => (
                    <FormItem className="space-y-0 relative group">
                      <FormLabel className={styles.label} required={isZodFieldRequired(createOrderSchema, 'order.offerType')}>
                        {t('common.offerType.label')}
                      </FormLabel>
                      <div className="relative">
                        <div className={cn(styles.iconWrapper, "text-zinc-400 group-focus-within:text-pink-500")}><Layers className="h-4 w-4" /></div>
                        <FormControl>
                          <VoiceSearchCombobox
                            options={[
                              { value: OfferType.YURTICI, label: t('common.offerType.yurtici') },
                              { value: OfferType.YURTDISI, label: t('common.offerType.yurtdisi') },
                            ]}
                            value={field.value || ''}
                            onSelect={(v) => field.onChange(v ?? '')}
                            placeholder={t('common.offerType.selectPlaceholder')}
                            className={cn(styles.selectTrigger, "pl-10 focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500")}
                            disabled={readOnly}
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="mt-1" />
                    </FormItem>
                  )}
                />
                {watchedOfferType && (
                  <FormField
                    control={form.control}
                    name="order.deliveryMethod"
                    render={({ field }) => (
                      <FormItem className="space-y-0 relative group">
                        <FormLabel className={cn(styles.label, "truncate whitespace-nowrap")}>{t('order.header.deliveryMethod', { defaultValue: 'Teslim Şekli' })}</FormLabel>
                        <div className="relative">
                          <div className={styles.iconWrapper}><Truck className="h-4 w-4 text-zinc-400 group-focus-within:text-pink-500" /></div>
                          <FormControl>
                            <VoiceSearchCombobox
                              options={deliveryMethodDropdown.options}
                              value={field.value || ''}
                              onSelect={(v) => field.onChange(v ?? '')}
                              onDebouncedSearchChange={setDeliveryMethodSearchTerm}
                              onFetchNextPage={deliveryMethodDropdown.fetchNextPage}
                              hasNextPage={deliveryMethodDropdown.hasNextPage}
                              isLoading={deliveryMethodDropdown.isLoading}
                              isFetchingNextPage={deliveryMethodDropdown.isFetchingNextPage}
                              placeholder={t('order.select')}
                              className={cn(styles.selectTrigger, "pl-10 focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500")}
                              disabled={readOnly}
                            />
                          </FormControl>
                        </div>
                        <FormMessage className="mt-1" />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              {/* FIXED: Removed 2xl:grid-cols-2 and kept it single column */}
              <div className="grid grid-cols-1 gap-4 pt-1">
                 <FormField
                  control={form.control}
                  name="order.offerDate"
                  render={({ field }) => (
                    <FormItem className="space-y-0 relative group">
                      <FormLabel className={styles.label}>{t('order.header.offerDate')}</FormLabel>
                      <div className="relative">
                        <div className={cn(styles.iconWrapper, "text-zinc-400 group-focus-within:text-pink-500")}><Calendar className="h-4 w-4" /></div>
                        <FormControl>
                          <Input 
                            type="date" 
                            className={cn(styles.inputBase, "pl-10 text-xs sm:text-sm font-medium bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-sm focus-visible:ring-4 focus-visible:ring-pink-500/10 focus-visible:border-pink-500")} 
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
                        <div className={cn(styles.iconWrapper, "text-zinc-400 group-focus-within:text-pink-500")}><Truck className="h-4 w-4" /></div>
                        <FormControl>
                          <Input 
                            type="date" 
                            className={cn(styles.inputBase, "pl-10 text-xs sm:text-sm font-medium bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-sm focus-visible:ring-4 focus-visible:ring-pink-500/10 focus-visible:border-pink-500")}
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

        {/* CARD 3: BELGE DETAYI */}
        <div className={styles.glassCard}>
           <div className="p-5 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-600">
                  <FileText className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{t('order.header.documentDetail', { defaultValue: 'Belge Detayı' })}</h4>
              </div>
              <div className="space-y-4 flex-1">
                 {showDocumentSerialType && (
                  <FormField
                    control={form.control}
                    name="order.documentSerialTypeId"
                    render={({ field }) => (
                      <FormItem className="space-y-0 relative group">
                        <FormLabel className={styles.label} required={isZodFieldRequired(createOrderSchema, 'order.documentSerialTypeId')}>Seri No</FormLabel>
                        <div className="relative">
                          <div className={cn(styles.iconWrapper, "text-zinc-400 group-focus-within:text-pink-500")}><Hash className="h-4 w-4" /></div>
                          <FormControl>
                            <VoiceSearchCombobox
                              options={availableDocumentSerialTypes
                                .filter((d) => d.serialPrefix?.trim() !== '')
                                .map((d) => ({ value: d.id.toString(), label: d.serialPrefix || String(d.id) }))}
                              value={field.value?.toString() || ''}
                              onSelect={(v) => field.onChange(v ? Number(v) : null)}
                              placeholder={t('order.select')}
                              className={cn(styles.selectTrigger, "pl-10 shadow-sm focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500")}
                              disabled={readOnly || customerTypeId === undefined || !watchedRepresentativeId}
                            />
                          </FormControl>
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
                          {t('quotation.header.projectCode')}
                        </FormLabel>
                        <div className="relative">
                          <div className={cn(styles.iconWrapper, "text-zinc-400 group-focus-within:text-pink-500")}><Folder className="h-4 w-4" /></div>
                          <VoiceSearchCombobox
                            className={cn("h-11 w-full pl-12 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm transition-all duration-300 focus-within:ring-4 focus-within:ring-pink-500/10 focus-within:border-pink-500 [&_*]:pl-8")}
                            value={field.value || ''}
                            onSelect={(value) => field.onChange(value)}
                            options={projectDropdown.options}
                            onDebouncedSearchChange={setProjectSearchTerm}
                            onFetchNextPage={projectDropdown.fetchNextPage}
                            hasNextPage={projectDropdown.hasNextPage}
                            isLoading={projectDropdown.isLoading}
                            isFetchingNextPage={projectDropdown.isFetchingNextPage}
                            placeholder={t('quotation.header.projectCodePlaceholder')}
                            searchPlaceholder={t('common.search')}
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
                    <FormItem className="space-y-0 relative group w-full min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <FormLabel className={cn(styles.label, "mb-0")}>Notlar</FormLabel>
                        <span className={cn("text-[10px] transition-colors", (field.value?.length || 0) > 350 ? "text-red-500 font-bold" : "text-zinc-400")}>
                          {field.value?.length || 0}/400
                        </span>
                      </div>
                      {filledNoteKeys.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2.5 overflow-hidden">
                          {filledNoteKeys.map((key, idx) => (
                            <Badge
                              key={key}
                              variant="secondary"
                              className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors pr-1 max-w-full h-auto py-1 text-xs border border-purple-200 dark:border-purple-500/20 shadow-sm"
                            >
                              <span className="mr-1.5 break-all whitespace-normal">
                                {(quotationNotes[key] ?? '').trim() || `${t('quotation.notes.noteLabel')} ${idx + 1}`}
                              </span>
                              {!readOnly && onQuotationNotesChange && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveNote(key)}
                                  className="p-0.5 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors shrink-0"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <FormControl>
                        <div className="relative w-full min-w-0">
                          <Textarea
                            {...field}
                            value={field.value || ''}
                            maxLength={400}
                            placeholder={t('order.header.descriptionPlaceholder')}
                            className="min-h-[100px] max-h-[160px] overflow-y-auto w-full break-all whitespace-pre-wrap rounded-xl border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/30 resize-none focus-visible:border-pink-500 focus-visible:ring-4 focus-visible:ring-pink-500/20 transition-all text-sm py-2.5 pr-10 shadow-sm"
                            disabled={readOnly}
                          />
                          {onQuotationNotesChange && (
                            <button
                              type="button"
                              className="absolute right-1 top-1 h-7 w-7 flex items-center justify-center text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                              onClick={() => setNotesDialogOpen(true)}
                              disabled={readOnly}
                            >
                              <ListPlus className="h-4 w-4" />
                            </button>
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
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[425px] rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-2xl backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-pink-600">
              <ArrowRightLeft className="h-5 w-5" />
              {t('order.header.currencyChange.title')}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {t('order.header.currencyChange.message')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={handleCurrencyChangeCancel} className="rounded-xl border-zinc-200 dark:border-zinc-800">
              {t('order.cancel')}
            </Button>
            <Button onClick={handleCurrencyChangeConfirm} className="rounded-xl bg-pink-600 hover:bg-pink-700 text-white shadow-lg shadow-pink-500/20 transition-all">
              {t('order.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
