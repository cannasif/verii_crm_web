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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useShippingAddresses } from '../hooks/useShippingAddresses';
import { useDemandRelatedUsers } from '../hooks/useDemandRelatedUsers';
import { usePaymentTypes } from '../hooks/usePaymentTypes';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import { useCustomer } from '@/features/customer-management/hooks/useCustomer';
import { useErpProjects } from '@/services/hooks/useErpProjects';
import { useAvailableDocumentSerialTypes } from '@/features/document-serial-type-management/hooks/useAvailableDocumentSerialTypes';
import { useSalesTypeList } from '@/features/sales-type-management/hooks/useSalesTypeList';
import { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';
import type { KurDto } from '@/services/erp-types';
import { ExchangeRateDialog } from './ExchangeRateDialog';
import { QuotationNotesDialog } from '@/features/quotation/components/QuotationNotesDialog';
import type { QuotationNotesDto } from '@/features/quotation/types/quotation-types';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import { Badge } from '@/components/ui/badge';
import { 
  Search, User, Truck, Briefcase, Globe, 
  Calendar, CreditCard, Hash, FileText, ArrowRightLeft, 
  Layers, Folder, ListPlus, X, MapPin, BookUser,
  Banknote
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { createDemandSchema, type CreateDemandSchema } from '../schemas/demand-schema';
import { OfferType } from '@/types/offer-type';
import type { DemandExchangeRateFormState } from '../types/demand-types';
import { cn } from '@/lib/utils';
import { isZodFieldRequired } from '@/lib/zod-required';

interface DemandHeaderFormProps {
  exchangeRates?: DemandExchangeRateFormState[];
  onExchangeRatesChange?: (rates: DemandExchangeRateFormState[]) => void;
  quotationNotes?: QuotationNotesDto;
  onQuotationNotesChange?: (notes: QuotationNotesDto) => void;
  onSaveNotes?: (notes: QuotationNotesDto) => Promise<void>;
  isSavingNotes?: boolean;
  lines?: Array<{ productCode?: string | null; productName?: string | null }>;
  onLinesChange?: (lines: Array<{ productCode?: string | null; productName?: string | null }>) => void;
  initialCurrency?: string | number | null;
  revisionNo?: string | null;
  demandId?: number | null;
  demandOfferNo?: string | null;
  readOnly?: boolean;
  showDocumentSerialType?: boolean;
}

export function DemandHeaderForm({
  exchangeRates = [],
  onExchangeRatesChange,
  quotationNotes = {},
  onQuotationNotesChange,
  onSaveNotes,
  isSavingNotes = false,
  lines = [],
  onLinesChange,
  initialCurrency,
   demandId,
  demandOfferNo,
  readOnly = false,
  showDocumentSerialType = true,
}: DemandHeaderFormProps = {}): ReactElement {
  const { t } = useTranslation();
  const form = useFormContext<CreateDemandSchema>();
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

  const watchedCustomerId = form.watch('demand.potentialCustomerId');
  const watchedErpCustomerCode = form.watch('demand.erpCustomerCode');
  const watchedCurrency = form.watch('demand.currency');
  const watchedRepresentativeId = form.watch('demand.representativeId');
  const watchedOfferType = form.watch('demand.offerType');

  const { data: salesTypeListResponse } = useSalesTypeList({
    pageNumber: 1,
    pageSize: 500,
    ...(watchedOfferType
      ? { filters: [{ column: 'salesType', operator: 'equals', value: watchedOfferType }] }
      : {}),
  });
  const salesTypesByOfferType = useMemo(() => {
    const list = salesTypeListResponse?.data ?? [];
    if (!watchedOfferType) return list;
    return list.filter((item) => item.salesType === watchedOfferType);
  }, [salesTypeListResponse?.data, watchedOfferType]);
  const prevOfferTypeRef = useRef(watchedOfferType);
  useEffect(() => {
    if (prevOfferTypeRef.current !== watchedOfferType) {
      prevOfferTypeRef.current = watchedOfferType;
      form.setValue('demand.deliveryMethod', null);
    }
  }, [watchedOfferType, form]);

  const { data: shippingAddresses } = useShippingAddresses(watchedCustomerId || undefined);
  const { data: relatedUsers = [] } = useDemandRelatedUsers(user?.id);
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
    PricingRuleType.Demand
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
    const currentRepresentativeId = form.watch('demand.representativeId');
    if (!currentRepresentativeId && user?.id) {
      form.setValue('demand.representativeId', user.id);
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

  const handleExchangeRatesSave = (rates: DemandExchangeRateFormState[]): void => {
    if (onExchangeRatesChange) onExchangeRatesChange(rates);
  };

  const handleCurrencyChange = (newCurrency: string): void => {
    const currentCurrency = form.watch('demand.currency');
    const newCurrencyNum = Number(newCurrency);
    const currentCurrencyNum = typeof currentCurrency === 'string' ? Number(currentCurrency) : currentCurrency;
    
    if (isInitialLoadRef.current) {
      form.setValue('demand.currency', newCurrency, { shouldValidate: false, shouldDirty: false });
      return;
    }
    
    if (initialCurrency !== null && initialCurrency !== undefined) {
      const initialCurrencyNum = typeof initialCurrency === 'string' ? Number(initialCurrency) : initialCurrency;
      if (initialCurrencyNum === newCurrencyNum) {
        form.setValue('demand.currency', newCurrency, { shouldValidate: false, shouldDirty: false });
        return;
      }
    }
    
    if (currentCurrencyNum === newCurrencyNum) return;
    
    if (lines && lines.length > 0 && onLinesChange) {
      setPendingCurrency(newCurrency);
      setCurrencyChangeDialogOpen(true);
    } else {
      form.setValue('demand.currency', newCurrency);
    }
  };

  const handleCurrencyChangeConfirm = (): void => {
    if (pendingCurrency && onLinesChange) {
      form.setValue('demand.currency', pendingCurrency);
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
      
      <div className={styles.glassCard}>
        <div className="p-4 sm:p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8 items-start">
                <div className="xl:col-span-2 space-y-2">
                  <div className={styles.label}>
                    <div className="p-1 rounded-md bg-pink-50 dark:bg-pink-900/20 text-pink-600">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    {t('demand.header.customer')}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1 group min-w-0">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 z-10 pointer-events-none group-focus-within:text-pink-500 transition-colors">
                        <Search className="h-4 w-4" />
                      </div>
                      <Input
                        className={cn(styles.inputBase, "pl-10 font-medium truncate cursor-pointer focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500")}
                        value={customerDisplayValue}
                        placeholder={t('demand.header.selectCustomer')}
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
                    {t('demand.header.representative')}
                  </div>
                  <FormField
                    control={form.control}
                    name="demand.representativeId"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <Select
                          onValueChange={(value) => field.onChange(value ? Number(value) : null)}
                          value={field.value?.toString() || ''}
                          disabled={readOnly}
                        >
                          <FormControl>
                            <SelectTrigger className={cn(styles.selectTrigger, "px-4 font-medium text-zinc-700 dark:text-zinc-200 focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500")}>
                              <SelectValue placeholder={t('demand.select')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className={styles.selectContent}>
                            {relatedUsers.map((u) => (
                              <SelectItem key={u.userId} value={u.userId.toString()} className={styles.selectItem}>
                                {[u.firstName, u.lastName].filter(Boolean).join(' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                    {t('demand.header.shippingAddress')}
                  </div>
                  <FormField
                    control={form.control}
                    name="demand.shippingAddressId"
                    render={({ field }) => (
                      <FormItem className="space-y-0 min-w-0">
                        <Select
                          onValueChange={(value) => field.onChange(value ? Number(value) : null)}
                          value={field.value?.toString() || ''}
                        >
                          <FormControl>
                            <SelectTrigger className={cn(styles.selectTrigger, "px-4 hover:border-emerald-400 dark:hover:border-emerald-600 shadow-sm focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500")}>
                              <SelectValue placeholder={t('demand.header.selectShippingAddress')} className="truncate block" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className={cn(styles.selectContent, "max-w-[90vw] md:max-w-xl")}>
                            {shippingAddresses.map((address) => (
                              <SelectItem key={address.id} value={address.id.toString()} className={styles.selectItem}>
                                <span className="text-xs sm:text-sm truncate block">{address.addressText}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                name="demand.currency"
                render={({ field }) => (
                  <FormItem className="space-y-0 relative group">
                    <FormLabel className={styles.label} required={isZodFieldRequired(createDemandSchema, 'demand.currency')}>Para Birimi</FormLabel>
                    <Select
                      onValueChange={(value) => handleCurrencyChange(value)}
                      value={field.value ? String(field.value) : ''}
                      disabled={readOnly}
                    >
                      <FormControl>
                        <div className="relative">
                          <div className={cn(styles.iconWrapper, currencyConfig.color)}>
                            <Banknote className="h-4 w-4" />
                          </div>
                          <SelectTrigger className={cn(
                            styles.selectTrigger,
                            "pl-10 font-bold tracking-wide transition-all focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500",
                            currencyConfig.color,
                            currencyConfig.bg,
                            currencyConfig.border,
                            "hover:brightness-95 dark:hover:brightness-110"
                          )}>
                            <SelectValue placeholder={t('demand.select')} />
                          </SelectTrigger>
                        </div>
                      </FormControl>
                      <SelectContent className={styles.selectContent}>
                        {erpRates.map((currency: KurDto) => (
                          <SelectItem key={currency.dovizTipi} value={String(currency.dovizTipi)} className={styles.selectItem}>
                            <span className="font-bold">{currency.dovizIsmi || `Döviz ${currency.dovizTipi}`}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="mt-1" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="demand.paymentTypeId"
                render={({ field }) => (
                  <FormItem className="space-y-0 relative group">
                    <FormLabel className={styles.label}>Ödeme Planı</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? Number(value) : null)}
                      value={field.value?.toString() || ''}
                    >
                      <FormControl>
                        <div className="relative">
                           <div className={cn(styles.iconWrapper, "text-zinc-400 group-focus-within:text-pink-500")}>
                             <CreditCard className="h-4 w-4" />
                           </div>
                           <SelectTrigger className={cn(styles.selectTrigger, "pl-10 hover:border-pink-400 dark:hover:border-zinc-700 focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500")}>
                             <SelectValue placeholder={t('demand.select')} />
                           </SelectTrigger>
                        </div>
                      </FormControl>
                      <SelectContent className={styles.selectContent}>
                        {paymentTypes.map((pt) => (
                          <SelectItem key={pt.id} value={pt.id.toString()} className={styles.selectItem}>
                            {pt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
              <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6 md:gap-4">
                <FormField
                  control={form.control}
                  name="demand.offerType"
                  render={({ field }) => (
                    <FormItem className="space-y-0 relative group">
                      <FormLabel className={styles.label} required={isZodFieldRequired(createDemandSchema, 'demand.offerType')}>
                        {t('common.offerType.label')}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''} disabled={readOnly}>
                        <FormControl>
                           <div className="relative">
                              <div className={cn(styles.iconWrapper, "text-zinc-400 group-focus-within:text-pink-500")}><Layers className="h-4 w-4" /></div>
                              <SelectTrigger className={cn(styles.selectTrigger, "pl-10 focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500")}>
                                <SelectValue placeholder={t('common.offerType.selectPlaceholder')} />
                              </SelectTrigger>
                           </div>
                        </FormControl>
                        <SelectContent className={styles.selectContent}>
                          <SelectItem value={OfferType.YURTICI} className={styles.selectItem}>{t('common.offerType.yurtici')}</SelectItem>
                          <SelectItem value={OfferType.YURTDISI} className={styles.selectItem}>{t('common.offerType.yurtdisi')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="mt-1" />
                    </FormItem>
                  )}
                />
                {watchedOfferType && (
                  <FormField
                    control={form.control}
                    name="demand.deliveryMethod"
                    render={({ field }) => (
                      <FormItem className="space-y-0 relative group">
                        <FormLabel className={cn(styles.label, "truncate whitespace-nowrap")}>Teslim Şekli</FormLabel>
                        <div className="relative">
                          <div className={styles.iconWrapper}><Truck className="h-4 w-4 text-zinc-400 group-focus-within:text-pink-500" /></div>
                          <Select disabled={readOnly} onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger className={cn(styles.selectTrigger, "pl-10 focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500")}>
                                <SelectValue placeholder={t('quotation.select')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className={styles.selectContent}>
                              {salesTypesByOfferType.map((item) => (
                                <SelectItem key={item.id} value={String(item.id)} className={styles.selectItem}>{item.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <FormMessage className="mt-1" />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6 md:gap-4 pt-1">
                 <FormField
                  control={form.control}
                  name="demand.offerDate"
                  render={({ field }) => (
                    <FormItem className="space-y-0 relative group">
                      <FormLabel className={styles.label}>Teklif T.</FormLabel>
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
                  name="demand.deliveryDate"
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
                    name="demand.documentSerialTypeId"
                    render={({ field }) => (
                      <FormItem className="space-y-0 relative group">
                        <FormLabel className={styles.label} required={isZodFieldRequired(createDemandSchema, 'demand.documentSerialTypeId')}>Seri No</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value ? Number(value) : null)}
                          value={field.value?.toString() || ''}
                          disabled={readOnly || customerTypeId === undefined || !watchedRepresentativeId}
                        >
                          <FormControl>
                            <div className="relative">
                              <div className={cn(styles.iconWrapper, "text-zinc-400 group-focus-within:text-pink-500")}><Hash className="h-4 w-4" /></div>
                              <SelectTrigger className={cn(styles.selectTrigger, "pl-10 shadow-sm focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500")}>
                                <SelectValue placeholder={t('demand.select')} />
                              </SelectTrigger>
                            </div>
                          </FormControl>
                          <SelectContent className={styles.selectContent}>
                            {availableDocumentSerialTypes.length === 0 ? (
                              <div className="p-3 text-center text-xs text-muted-foreground">Uygun seri yok</div>
                            ) : (
                              availableDocumentSerialTypes
                                .filter((d) => d.serialPrefix?.trim() !== '')
                                .map((d) => (
                                  <SelectItem key={d.id} value={d.id.toString()} className={styles.selectItem}>{d.serialPrefix}</SelectItem>
                                ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage className="mt-1" />
                      </FormItem>
                    )}
                  />
                )}
                <div>
                  <FormField
                    control={form.control}
                    name="demand.projectCode"
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
                            options={projects.map((p) => ({
                              value: p.projeKod,
                              label: p.projeAciklama ? `${p.projeKod} - ${p.projeAciklama}` : p.projeKod
                            }))}
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
                  name="demand.description"
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
                                  className="p-0.5 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors flex-shrink-0"
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
                            placeholder={t('demand.header.descriptionPlaceholder')}
                            className="min-h-[100px] max-h-[160px] overflow-y-auto w-full break-all whitespace-pre-wrap rounded-xl border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/30 resize-none focus-visible:border-pink-500 focus-visible:ring-4 focus-visible:ring-pink-500/20 transition-all text-sm py-2.5 pr-10 shadow-sm"
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
          form.setValue('demand.potentialCustomerId', result.customerId ?? null);
          form.setValue('demand.erpCustomerCode', result.erpCustomerCode ?? null);
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
          demandId={demandId}
          demandOfferNo={demandOfferNo}
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
              {t('demand.header.currencyChange.title')}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {t('demand.header.currencyChange.message')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={handleCurrencyChangeCancel} className="rounded-xl border-zinc-200 dark:border-zinc-800">
              {t('demand.cancel')}
            </Button>
            <Button onClick={handleCurrencyChangeConfirm} className="rounded-xl bg-pink-600 hover:bg-pink-700 text-white shadow-lg shadow-pink-500/20 transition-all">
              {t('demand.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}