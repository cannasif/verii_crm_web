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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check } from 'lucide-react';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useQuotationRelatedUsers } from '../hooks/useQuotationRelatedUsers';
import {
  usePaymentTypeOptionsInfinite,
  useSalesTypeOptionsInfinite,
} from '@/components/shared/dropdown/useDropdownEntityInfinite';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import { useCustomerOptions } from '@/features/customer-management/hooks/useCustomerOptions';
import { useCustomer } from '@/features/customer-management/hooks/useCustomer';
import { useErpProjectCodesInfinite } from '@/services/hooks/useErpProjectCodesInfinite';
import { useAvailableDocumentSerialTypes } from '@/features/document-serial-type-management/hooks/useAvailableDocumentSerialTypes';
import { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';
import type { KurDto } from '@/services/erp-types';
import { ExchangeRateDialog } from './ExchangeRateDialog';
import { QuotationNotesDialog } from './QuotationNotesDialog';
import type { QuotationNotesDto } from '../types/quotation-types';
import { 
  User, Truck, Briefcase, Globe, 
  Calendar, CreditCard, Hash, FileText, ArrowRightLeft, 
  Layers, SearchX,  BookUser, Building2, Folder,
  ListPlus, X, MapPin, Banknote, Search
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { createQuotationSchema, type CreateQuotationSchema } from '../schemas/quotation-schema';
import type { QuotationExchangeRateFormState } from '../types/quotation-types';
import { OfferType } from '@/types/offer-type';
import { cn } from '@/lib/utils';
import { isZodFieldRequired } from '@/lib/zod-required';

interface QuotationHeaderFormProps {
  exchangeRates?: QuotationExchangeRateFormState[];
  onExchangeRatesChange?: (rates: QuotationExchangeRateFormState[]) => void;
  quotationNotes?: QuotationNotesDto;
  onQuotationNotesChange?: (notes: QuotationNotesDto) => void;
  onSaveNotes?: (notes: QuotationNotesDto) => Promise<void>;
  isSavingNotes?: boolean;
  lines?: Array<{ productCode?: string | null; productName?: string | null }>;
  onLinesChange?: (lines: Array<{ productCode?: string | null; productName?: string | null }>) => void;
  onCurrencyChange?: (oldCurrency: number, newCurrency: number) => Promise<void> | void;
  initialCurrency?: string | number | null;
  revisionNo?: string | null;
  quotationId?: number | null;
  quotationOfferNo?: string | null;
  readOnly?: boolean;
  showDocumentSerialType?: boolean;
}

export function QuotationHeaderForm({
  exchangeRates = [],
  onExchangeRatesChange,
  quotationNotes = {},
  onQuotationNotesChange,
  onSaveNotes,
  isSavingNotes = false,
  lines = [],
  onLinesChange,
  onCurrencyChange,
  initialCurrency,
  quotationId,
  quotationOfferNo,
  readOnly = false,
  showDocumentSerialType = true,
}: QuotationHeaderFormProps = {}): ReactElement {
  const { t } = useTranslation(['quotation', 'common']);
  const form = useFormContext<CreateQuotationSchema>();
  const { data: erpRates = [] } = useExchangeRate();
  const user = useAuthStore((state) => state.user);
  
  const [customerSelectDialogOpen, setCustomerSelectDialogOpen] = useState(false);
  const [exchangeRateDialogOpen, setExchangeRateDialogOpen] = useState(false);
  const [currencyChangeDialogOpen, setCurrencyChangeDialogOpen] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);
  const [pendingPreviousCurrency, setPendingPreviousCurrency] = useState<number | null>(null);
  const [customerComboboxOpen, setCustomerComboboxOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
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

  const watchedCustomerId = form.watch('quotation.potentialCustomerId');
  const watchedErpCustomerCode = form.watch('quotation.erpCustomerCode');
  const watchedCurrency = form.watch('quotation.currency');
  const watchedRepresentativeId = form.watch('quotation.representativeId');
  const prevRepresentativeIdRef = useRef<number | null | undefined>(watchedRepresentativeId);

  const watchedDocumentSerialTypeId = form.watch('quotation.documentSerialTypeId');
  
  const watchedOfferType = form.watch('quotation.offerType');

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
      form.setValue('quotation.deliveryMethod', null);
    }
  }, [watchedOfferType, form]);

  const { data: shippingAddresses } = useShippingAddresses(watchedCustomerId || undefined);
  const { data: relatedUsers = [] } = useQuotationRelatedUsers(user?.id);
  
  const {
    data: customerOptions = [],
    isFetched: hasCustomerOptionsLoaded,
  } = useCustomerOptions(watchedRepresentativeId);
  
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
    PricingRuleType.Quotation
  );

  const selectedSerialType = useMemo(() => 
    availableDocumentSerialTypes.find(t => t.id === Number(watchedDocumentSerialTypeId)),
    [availableDocumentSerialTypes, watchedDocumentSerialTypeId]
  );

  const customerDisplayValue = useMemo(() => {
    if (!watchedCustomerId && !watchedErpCustomerCode) return '';
    if (customer) {
      return customer.customerCode?.trim()
        ? `ERP: ${customer.customerCode} - ${customer.name}`
        : `CRM: ${customer.name}`;
    }
    const matchedOption = customerOptions.find(
      (option) =>
        (watchedCustomerId != null && option.id === watchedCustomerId) ||
        (!!watchedErpCustomerCode && option.customerCode === watchedErpCustomerCode)
    );
    if (matchedOption) {
      return matchedOption.customerCode?.trim()
        ? `ERP: ${matchedOption.customerCode} - ${matchedOption.name}`
        : `CRM: ${matchedOption.name}`;
    }
    if (watchedErpCustomerCode) {
      return `ERP: ${watchedErpCustomerCode}`;
    }
    return `ID: ${watchedCustomerId}`;
  }, [watchedCustomerId, watchedErpCustomerCode, customer, customerOptions]);

  useEffect(() => {
    setCustomerSearchQuery(customerDisplayValue);
  }, [customerDisplayValue]);

  useEffect(() => {
    if (!hasCustomerOptionsLoaded) return;

    const previousRep = prevRepresentativeIdRef.current ?? null;
    const currentRep = watchedRepresentativeId ?? null;

    if (previousRep === currentRep) {
      return;
    }

    prevRepresentativeIdRef.current = watchedRepresentativeId;

    if (!watchedCustomerId && !watchedErpCustomerCode) return;

    const hasMatchingCustomer = customerOptions.some(
      (option) =>
        (watchedCustomerId != null && option.id === watchedCustomerId) ||
        (!!watchedErpCustomerCode && option.customerCode === watchedErpCustomerCode)
    );

    if (hasMatchingCustomer) {
      return;
    }

    form.setValue('quotation.potentialCustomerId', undefined, { shouldDirty: true, shouldValidate: true });
    form.setValue('quotation.erpCustomerCode', '', { shouldDirty: true, shouldValidate: true });
    form.setValue('quotation.shippingAddressId', null, { shouldDirty: true, shouldValidate: true });
  }, [
    customerOptions,
    form,
    hasCustomerOptionsLoaded,
    watchedCustomerId,
    watchedErpCustomerCode,
    watchedRepresentativeId,
  ]);

  const allCustomerOptions = useMemo(() => {
    return customerOptions.map((c) => ({
      value: `customer-${c.id}`,
      label: c.customerCode?.trim()
        ? `ERP: ${c.customerCode} - ${c.name}`
        : `CRM: ${c.name}`,
      type: (c.customerCode?.trim() ? 'erp' : 'crm') as 'erp' | 'crm',
      id: c.id,
      code: c.customerCode ?? undefined,
      customerTypeId: c.customerTypeId,
      name: c.name,
      phone: c.phone,
      email: c.email
    }));
  }, [customerOptions]);

  const filteredCustomerOptions = useMemo(() => {
    let options = allCustomerOptions;

    if (selectedSerialType?.customerTypeId && !watchedCustomerId && !watchedErpCustomerCode) {
      options = options.filter(o => o.customerTypeId === selectedSerialType.customerTypeId);
    }

    if (!customerSearchQuery) return options.slice(0, 50);
    const lowerQuery = customerSearchQuery.toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(lowerQuery) ||
      (option.code && option.code.toLowerCase().includes(lowerQuery))
    ).slice(0, 50);
  }, [allCustomerOptions, customerSearchQuery, selectedSerialType, watchedCustomerId, watchedErpCustomerCode]);

  const handleComboboxSelect = (option: (typeof allCustomerOptions)[0]) => {
    form.setValue('quotation.potentialCustomerId', option.id);
    form.setValue('quotation.erpCustomerCode', option.code ?? null);
    setCustomerComboboxOpen(false);
  };

  useEffect(() => {
    const currentRepresentativeId = form.watch('quotation.representativeId');
    if (!currentRepresentativeId && user?.id) {
      form.setValue('quotation.representativeId', user.id);
    }
  }, [form, user]);

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

  const handleExchangeRatesSave = (rates: QuotationExchangeRateFormState[]): void => {
    if (onExchangeRatesChange) onExchangeRatesChange(rates);
  };

  const handleCurrencyChange = (newCurrency: string): void => {
    const currentCurrency = form.watch('quotation.currency');
    const newCurrencyNum = Number(newCurrency);
    const currentCurrencyNum =
      currentCurrency === '' || currentCurrency === null || currentCurrency === undefined
        ? null
        : typeof currentCurrency === 'string'
          ? Number(currentCurrency)
          : currentCurrency;
    
    if (isInitialLoadRef.current) {
      form.setValue('quotation.currency', newCurrency, { shouldValidate: false, shouldDirty: false });
      return;
    }
    
    if (initialCurrency !== null && initialCurrency !== undefined) {
      const initialCurrencyNum = typeof initialCurrency === 'string' ? Number(initialCurrency) : initialCurrency;
      if (initialCurrencyNum === newCurrencyNum) {
        form.setValue('quotation.currency', newCurrency, { shouldValidate: false, shouldDirty: false });
        return;
      }
    }
    
    if (currentCurrencyNum !== null && currentCurrencyNum === newCurrencyNum) return;
    
    if (lines && lines.length > 0 && onLinesChange) {
      setPendingPreviousCurrency(currentCurrencyNum);
      setPendingCurrency(newCurrency);
      setCurrencyChangeDialogOpen(true);
    } else {
      form.setValue('quotation.currency', newCurrency);
    }
  };

  const handleCurrencyChangeConfirm = async (): Promise<void> => {
    if (!pendingCurrency || !onLinesChange) {
      return;
    }

    try {
      if (onCurrencyChange && pendingPreviousCurrency != null) {
        await onCurrencyChange(pendingPreviousCurrency, Number(pendingCurrency));
      } else {
        onLinesChange(lines || []);
      }
      form.setValue('quotation.currency', pendingCurrency);
    } catch {
      // ZERO_RATE veya başka hata durumunda para birimini değiştirme
    } finally {
      setCurrencyChangeDialogOpen(false);
      setPendingCurrency(null);
      setPendingPreviousCurrency(null);
    }
  };

  const handleCurrencyChangeCancel = (): void => {
    setCurrencyChangeDialogOpen(false);
    setPendingCurrency(null);
    setPendingPreviousCurrency(null);
  };

  const styles = {
    glassCard: "relative overflow-hidden rounded-2xl border border-slate-400/80 dark:border-zinc-700/85 bg-white/88 dark:bg-zinc-900/48 backdrop-blur-xl shadow-[0_1px_0_rgba(15,23,42,0.05),0_14px_30px_-24px_rgba(15,23,42,0.4)] ring-1 ring-slate-300/60 dark:ring-white/10 transition-all duration-300 hover:shadow-md",
    inputBase: "h-11 bg-white dark:bg-zinc-950 border-slate-400/75 dark:border-zinc-700 rounded-xl shadow-sm transition-all duration-300 focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 outline-none w-full",
    label: "text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-2",
    iconWrapper: "absolute left-3 top-1/2 -translate-y-1/2 transition-colors z-20 flex items-center justify-center pointer-events-none",
    selectTrigger: "w-full h-11 bg-white dark:bg-zinc-950 border-slate-500/80 dark:border-zinc-600 hover:border-pink-400 dark:hover:border-zinc-500 transition-all shadow-[0_1px_0_rgba(15,23,42,0.05),0_6px_14px_-10px_rgba(15,23,42,0.35)] rounded-xl focus:ring-4 focus:ring-pink-500/12 focus:border-pink-500 outline-none text-slate-800 dark:text-zinc-100",
    selectContent: "rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 shadow-2xl backdrop-blur-xl",
    selectItem: "focus:bg-pink-50 dark:focus:bg-pink-900/10 focus:text-pink-600 cursor-pointer rounded-lg m-1"
  };
  const getIconTone = (hasValue: boolean): string =>
    hasValue ? 'text-pink-500' : 'text-zinc-400 group-focus-within:text-pink-500';

  const forcePaddingStyle = { paddingLeft: '3rem' };

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
                    {t('quotation:header.customer')}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1 group min-w-0">
                      <div className={cn("absolute left-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none transition-colors", customerSearchQuery?.trim() ? "text-pink-500" : "text-zinc-400 group-focus-within:text-pink-500")}>
                        <Search className="h-4 w-4" />
                      </div>
                      <FormControl>
                        <Input
                          className={cn(styles.inputBase, "pl-12! font-medium truncate caret-pink-500")}
                          style={forcePaddingStyle}
                          value={customerSearchQuery}
                          onChange={(e) => {
                            setCustomerSearchQuery(e.target.value);
                            if (!customerComboboxOpen) setCustomerComboboxOpen(true);
                          }}
                          onFocus={() => setCustomerComboboxOpen(true)}
                          placeholder={t('quotation:header.selectCustomer')}
                          disabled={readOnly}
                          autoComplete="off"
                        />
                      </FormControl>
                      <Popover open={customerComboboxOpen} onOpenChange={setCustomerComboboxOpen}>
                        <PopoverTrigger asChild>
                          <div className="absolute top-full left-0 w-full h-0" />
                        </PopoverTrigger>
                        <PopoverContent 
                          className="p-0 w-[90vw] sm:w-[550px] max-h-[350px] overflow-hidden bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl" 
                          align="start"
                          sideOffset={8}
                          onOpenAutoFocus={(e) => e.preventDefault()}
                        >
                          <Command shouldFilter={false}>
                            <CommandList className="max-h-[350px] overflow-y-auto p-2 space-y-1">
                              {filteredCustomerOptions.length === 0 && (
                                <CommandEmpty className="py-8 text-center flex flex-col items-center gap-2">
                                  <SearchX className="w-5 h-5 text-zinc-400" />
                                  <span className="text-sm font-medium text-zinc-500">{t('common.noResults')}</span>
                                </CommandEmpty>
                              )}
                              <CommandGroup>
                                {filteredCustomerOptions.map((option) => (
                                  <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    onSelect={() => handleComboboxSelect(option)}
                                    className="cursor-pointer mb-1 rounded-xl px-3 py-2 data-[selected=true]:bg-pink-50 dark:data-[selected=true]:bg-pink-900/20 transition-colors"
                                  >
                                    <div className="flex items-center gap-3 w-full">
                                      <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                        option.type === 'erp' ? "bg-purple-100 dark:bg-purple-900/40 text-purple-600" : "bg-pink-100 dark:bg-pink-900/40 text-pink-600"
                                      )}>
                                        {option.type === 'erp' ? <Building2 size={14} /> : <User size={14} />}
                                      </div>
                                      <div className="flex flex-col flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-sm truncate">{option.name || option.label}</span>
                                          {((option.type === 'crm' && watchedCustomerId === option.id) || (option.type === 'erp' && watchedErpCustomerCode === option.code)) && (
                                            <Check className="w-3.5 h-3.5 text-pink-500" />
                                          )}
                                        </div>
                                        {option.code && <span className="text-[11px] text-zinc-500 font-mono">{option.code}</span>}
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
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
                    {t('quotation:header.representative')}
                  </div>
                  <FormField
                    control={form.control}
                    name="quotation.representativeId"
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
                            placeholder={t('quotation.select')}
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
                    {t('quotation:header.shippingAddress')}
                  </div>
                  <FormField
                    control={form.control}
                    name="quotation.shippingAddressId"
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
                            placeholder={t('quotation:header.selectShippingAddress')}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={styles.glassCard}>
          <div className="p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
                  <CreditCard className="h-4 w-4" />
                </div>
                {t('quotation:header.financialCardTitle')}
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
                   {t('quotation:header.exchangeRatesLink')}
                 </Button>
               )}
            </div>
            <div className="space-y-4 flex-1">
              <FormField
                control={form.control}
                name="quotation.currency"
                render={({ field }) => (
                  <FormItem className="space-y-0 relative group">
                    <FormLabel className={styles.label} required={isZodFieldRequired(createQuotationSchema, 'quotation.currency')}>{t('quotation:header.currency')}</FormLabel>
                    <div className="relative">
                      <div className={cn(styles.iconWrapper, getIconTone(Boolean(field.value)))}>
                        <Banknote className="h-4 w-4" />
                      </div>
                      <FormControl>
                        <VoiceSearchCombobox
                          options={erpRates.map((c: KurDto) => ({
                            value: String(c.dovizTipi),
                            label: c.dovizIsmi || t('quotation:header.currencyNameFallback', { code: c.dovizTipi }),
                          }))}
                          value={field.value ? String(field.value) : ''}
                          onSelect={(v) => v && handleCurrencyChange(v)}
                          placeholder={t('quotation.select')}
                          className={cn(
                            styles.selectTrigger,
                            "pl-10 font-bold tracking-wide transition-all focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500",
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
                name="quotation.paymentTypeId"
                render={({ field }) => (
                  <FormItem className="space-y-0 relative group">
                    <FormLabel className={styles.label} required>
                      {t('quotation:header.paymentType')}
                    </FormLabel>
                    <div className="relative">
                      <div className={cn(styles.iconWrapper, getIconTone(Boolean(field.value)))}>
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
                          placeholder={t('quotation.select')}
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

        <div className={styles.glassCard}>
          <div className="p-5 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                <Globe className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{t('quotation:header.typeAndDatesCardTitle')}</h4>
            </div>
            <div className="space-y-4 flex-1">
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="quotation.offerType"
                  render={({ field }) => (
                    <FormItem className="space-y-0 relative group">
                      <FormLabel className={styles.label} required={isZodFieldRequired(createQuotationSchema, 'quotation.offerType')}>
                        {t('common.offerType.label')}
                      </FormLabel>
                      <div className="relative">
                        <div className={cn(styles.iconWrapper, getIconTone(Boolean(field.value)))}><Layers className="h-4 w-4" /></div>
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
                    name="quotation.deliveryMethod"
                    render={({ field }) => (
                      <FormItem className="space-y-0 relative group">
                        <FormLabel className={cn(styles.label, "truncate whitespace-nowrap")}>{t('quotation:header.deliveryMethod')}</FormLabel>
                        <div className="relative">
                          <div className={cn(styles.iconWrapper, getIconTone(Boolean(field.value)))}><Truck className="h-4 w-4" /></div>
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
                              placeholder={t('quotation.select')}
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
              <div className="grid grid-cols-1 gap-4 pt-1">
                 <FormField
                  control={form.control}
                  name="quotation.offerDate"
                  render={({ field }) => (
                    <FormItem className="space-y-0 relative group">
                      <FormLabel className={styles.label}>{t('quotation:header.offerDateAbbrev')}</FormLabel>
                      <div className="relative">
                        <div className={cn(styles.iconWrapper, getIconTone(Boolean(field.value)))}><Calendar className="h-4 w-4" /></div>
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
                  name="quotation.deliveryDate"
                  render={({ field }) => (
                    <FormItem className="space-y-0 relative group">
                      <FormLabel className={styles.label}>{t('quotation:header.deliveryDateAbbrev')}</FormLabel>
                      <div className="relative">
                        <div className={cn(styles.iconWrapper, getIconTone(Boolean(field.value)))}><Truck className="h-4 w-4" /></div>
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
                <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{t('quotation:header.documentDetail')}</h4>
              </div>
              <div className="space-y-4 flex-1">
                 {showDocumentSerialType && (
                  <FormField
                    control={form.control}
                    name="quotation.documentSerialTypeId"
                    render={({ field }) => (
                      <FormItem className="space-y-0 relative group">
                        <FormLabel className={styles.label} required={isZodFieldRequired(createQuotationSchema, 'quotation.documentSerialTypeId')}>{t('quotation:header.serialNumber')}</FormLabel>
                        <div className="relative">
                          <div className={cn(styles.iconWrapper, getIconTone(Boolean(field.value)))}><Hash className="h-4 w-4" /></div>
                          <FormControl>
                            <VoiceSearchCombobox
                              options={availableDocumentSerialTypes
                                .filter((d) => d.serialPrefix?.trim() !== '')
                                .map((d) => ({ value: d.id.toString(), label: d.serialPrefix || String(d.id) }))}
                              value={field.value?.toString() || ''}
                              onSelect={(v) => field.onChange(v ? Number(v) : null)}
                              placeholder={t('quotation.select')}
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
                    name="quotation.projectCode"
                    render={({ field }) => (
                      <FormItem className="space-y-0 relative group">
                        <FormLabel className={styles.label}>
                          <Folder className="h-3.5 w-3.5" />
                          {t('quotation:header.projectCode')}
                        </FormLabel>
                        <div className="relative">
                          <div className={cn(styles.iconWrapper, getIconTone(Boolean(field.value)))}><Folder className="h-4 w-4" /></div>
                          <VoiceSearchCombobox
                            className={cn("h-11 w-full pl-12 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm transition-all duration-300 focus-within:ring-4 focus-within:ring-pink-500/10 focus-within:border-pink-500 **:pl-8")}
                            value={field.value || ''}
                            onSelect={(value) => field.onChange(value)}
                            options={projectDropdown.options}
                            onDebouncedSearchChange={setProjectSearchTerm}
                            onFetchNextPage={projectDropdown.fetchNextPage}
                            hasNextPage={projectDropdown.hasNextPage}
                            isLoading={projectDropdown.isLoading}
                            isFetchingNextPage={projectDropdown.isFetchingNextPage}
                            placeholder={t('quotation:header.projectCodePlaceholder')}
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
                  name="quotation.description"
                  render={({ field }) => (
                    <FormItem className="space-y-0 relative group w-full min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <FormLabel className={cn(styles.label, "mb-0")}>{t('quotation:header.notes')}</FormLabel>
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
                            placeholder={t('quotation:header.descriptionPlaceholder')}
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
        contextUserId={watchedRepresentativeId ?? undefined}
        onSelect={(result) => {
          form.setValue('quotation.potentialCustomerId', result.customerId ?? null);
          form.setValue('quotation.erpCustomerCode', result.erpCustomerCode ?? null);
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
          quotationId={quotationId}
          quotationOfferNo={quotationOfferNo}
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
              {t('quotation:header.currencyChange.title')}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {t('quotation:header.currencyChange.message')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={handleCurrencyChangeCancel} className="rounded-xl border-zinc-200 dark:border-zinc-800">
              {t('quotation.cancel')}
            </Button>
            <Button onClick={handleCurrencyChangeConfirm} className="rounded-xl bg-pink-600 hover:bg-pink-700 text-white shadow-lg shadow-pink-500/20 transition-all">
              {t('quotation.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
