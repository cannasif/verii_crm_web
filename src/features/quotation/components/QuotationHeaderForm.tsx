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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { usePaymentTypes } from '../hooks/usePaymentTypes';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import { useCustomerOptions } from '@/features/customer-management/hooks/useCustomerOptions';
import { useCustomer } from '@/features/customer-management/hooks/useCustomer';
import { useErpProjects } from '@/services/hooks/useErpProjects';
import { useAvailableDocumentSerialTypes } from '@/features/document-serial-type-management/hooks/useAvailableDocumentSerialTypes';
import { useSalesTypeList } from '@/features/sales-type-management/hooks/useSalesTypeList';
import { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';
import type { KurDto } from '@/services/erp-types';
import { ExchangeRateDialog } from './ExchangeRateDialog';
import { QuotationNotesDialog } from './QuotationNotesDialog';
import type { QuotationNotesDto } from '../types/quotation-types';
import { 
  User, Truck, Briefcase, Globe, 
  Calendar, CreditCard, Hash, FileText, ArrowRightLeft, 
  Layers, SearchX, Coins, BookUser, Building2, Phone, Mail, Folder,
  ListPlus, X
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
  initialCurrency,
  quotationId,
  quotationOfferNo,
  readOnly = false,
  showDocumentSerialType = true,
}: QuotationHeaderFormProps = {}): ReactElement {
  const { t } = useTranslation();
  const form = useFormContext<CreateQuotationSchema>();
  const { data: erpRates = [] } = useExchangeRate();
  const user = useAuthStore((state) => state.user);
  
  const [customerSelectDialogOpen, setCustomerSelectDialogOpen] = useState(false);
  const [exchangeRateDialogOpen, setExchangeRateDialogOpen] = useState(false);
  const [currencyChangeDialogOpen, setCurrencyChangeDialogOpen] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);
  const [customerComboboxOpen, setCustomerComboboxOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
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

  const watchedCustomerId = form.watch('quotation.potentialCustomerId');
  const watchedErpCustomerCode = form.watch('quotation.erpCustomerCode');
  const watchedCurrency = form.watch('quotation.currency');
  const watchedRepresentativeId = form.watch('quotation.representativeId');
  const watchedDocumentSerialTypeId = form.watch('quotation.documentSerialTypeId');
  const watchedOfferType = form.watch('quotation.offerType');

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
      form.setValue('quotation.deliveryMethod', null);
    }
  }, [watchedOfferType, form]);

  const { data: shippingAddresses } = useShippingAddresses(watchedCustomerId || undefined);
  const { data: relatedUsers = [] } = useQuotationRelatedUsers(user?.id);
  const { data: paymentTypes } = usePaymentTypes();
  const { data: customerOptions = [] } = useCustomerOptions();
  const { data: customer } = useCustomer(watchedCustomerId ?? 0);
  const { data: projects = [] } = useErpProjects();
  
  const customerTypeId = useMemo(() => {
    if (watchedErpCustomerCode) return 0;
    return customer?.customerTypeId ?? undefined;
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
    if (!watchedCustomerId) return '';
    if (customer) {
      return customer.customerCode?.trim()
        ? `ERP: ${customer.customerCode} - ${customer.name}`
        : `CRM: ${customer.name}`;
    }
    return `ID: ${watchedCustomerId}`;
  }, [watchedCustomerId, customer]);

  useEffect(() => {
    setCustomerSearchQuery(customerDisplayValue);
  }, [customerDisplayValue]);

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
    const currentCurrencyNum = typeof currentCurrency === 'string' ? Number(currentCurrency) : currentCurrency;
    
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
    
    if (currentCurrencyNum === newCurrencyNum) return;
    
    if (lines && lines.length > 0 && onLinesChange) {
      setPendingCurrency(newCurrency);
      setCurrencyChangeDialogOpen(true);
    } else {
      form.setValue('quotation.currency', newCurrency);
    }
  };

  const handleCurrencyChangeConfirm = (): void => {
    if (pendingCurrency && onLinesChange) {
      form.setValue('quotation.currency', pendingCurrency);
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
    inputBase: "!pl-12 h-11 bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm hover:shadow transition-all duration-300 ease-out focus-visible:border-pink-500 focus-visible:ring-4 focus-visible:ring-pink-500/20 w-full",
    label: "text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 pl-1 flex items-center gap-1.5",
    iconWrapper: "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-pink-600 dark:group-focus-within:text-pink-500 pointer-events-none z-10 flex items-center justify-center",
  };

  const forcePaddingStyle = { paddingLeft: '3rem' };

  return (
    <div className="relative space-y-6 pt-2 pb-8 animate-in fade-in slide-in-from-bottom-3 duration-700">
      <div className="absolute -top-10 -left-10 w-96 h-96 bg-pink-500/10 blur-[100px] pointer-events-none rounded-full" />
      <div className="absolute top-20 right-0 w-80 h-80 bg-orange-500/5 blur-[80px] pointer-events-none rounded-full" />
      
      <div className={cn(styles.glassCard, "flex flex-col")}>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-600">
                  <FileText className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Belge Detayı</h4>
              </div>

              <div className="grid grid-cols-1 gap-6">
                 {showDocumentSerialType && (
                   <div>
                     <FormField
                      control={form.control}
                      name="quotation.documentSerialTypeId"
                      render={({ field }) => (
                        <FormItem className="space-y-0 relative group">
                          <FormLabel className={styles.label} required={isZodFieldRequired(createQuotationSchema, 'quotation.documentSerialTypeId')}>Seri No</FormLabel>
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
                              placeholder={t('quotation.select')}
                              searchPlaceholder={t('common.search')}
                              disabled={readOnly || !watchedRepresentativeId}
                            />
                          </div>
                          <FormMessage className="mt-1" />
                        </FormItem>
                      )}
                    />
                   </div>
                 )}

                 <div>
                  <FormField
                    control={form.control}
                    name="quotation.description"
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
                                  {(quotationNotes[key] ?? '').trim() || `${t('quotation.notes.noteLabel')} ${idx + 1}`}
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
                              placeholder={t('quotation.header.descriptionPlaceholder')}
                              className="min-h-[46px] rounded-xl border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/30 resize-none focus-visible:border-pink-500 focus-visible:ring-4 focus-visible:ring-pink-500/20 transition-all text-sm py-2.5 pr-10"
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

              <div>
                <FormField
                  control={form.control}
                  name="quotation.projectCode"
                  render={({ field }) => (
                    <FormItem className="space-y-0 relative group">
                      <FormLabel className={styles.label}>
                        <Folder className="h-3.5 w-3.5" />
                        {t('quotation.header.projectCode')}
                      </FormLabel>
                      <div className="relative">
                        <div className={styles.iconWrapper}><Folder className="h-4 w-4" /></div>
                        <VoiceSearchCombobox
                          className={styles.inputBase}
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
            </div>

            {/* Right Column: Customer & Sales Info */}
            <div className="flex flex-col gap-6">
              {/* Main Info Header */}
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  <User className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-200">
                  {t('quotation.header.mainInfo')}
                </h4>
              </div>

              <div className="space-y-6">
                {/* Customer Account */}
                <div>
                  <FormField
                    control={form.control}
                    name="quotation.potentialCustomerId"
                    render={() => (
                      <FormItem className="space-y-0 relative group">
                        <FormLabel className={styles.label}>
                          {t('quotation.header.customer')}
                        </FormLabel>
                        <div className="flex gap-2">
                          <div className="relative flex-1 group">
                            <div className={cn(styles.iconWrapper, "pointer-events-none")}>
                              <User className="h-4 w-4" />
                            </div>
                            <FormControl>
                              <Input
                                className={cn(styles.inputBase, "font-semibold text-zinc-900 dark:text-zinc-100 z-10 relative caret-pink-500")}
                                style={forcePaddingStyle}
                                value={customerSearchQuery}
                                onChange={(e) => {
                                  setCustomerSearchQuery(e.target.value);
                                  if (!customerComboboxOpen) setCustomerComboboxOpen(true);
                                }}
                                onFocus={() => setCustomerComboboxOpen(true)}
                                onBlur={() => {
                                  setTimeout(() => {
                                    if (customerSearchQuery !== customerDisplayValue) {
                                      if (!customerSearchQuery.trim()) {
                                        form.setValue('quotation.potentialCustomerId', null);
                                        form.setValue('quotation.erpCustomerCode', null);
                                      } else {
                                        setCustomerSearchQuery(customerDisplayValue);
                                      }
                                    }
                                  }, 200);
                                }}
                                placeholder={t('quotation.header.selectCustomer')}
                                disabled={readOnly}
                                autoComplete="off"
                              />
                            </FormControl>
                            <Popover open={customerComboboxOpen} onOpenChange={setCustomerComboboxOpen}>
                              <PopoverTrigger asChild>
                                <div className="absolute top-full left-0 w-full h-0" />
                              </PopoverTrigger>
                              <PopoverContent 
                                className="p-0 w-[90vw] sm:w-[550px] max-h-[350px] overflow-hidden bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 shadow-2xl rounded-2xl" 
                                align="start"
                                sideOffset={8}
                                onOpenAutoFocus={(e) => e.preventDefault()}
                              >
                                <Command shouldFilter={false} className="bg-transparent">
                                  <CommandList className="max-h-[350px] overflow-y-auto p-2 custom-scrollbar space-y-1">
                                    {filteredCustomerOptions.length === 0 && (
                                      <CommandEmpty className="py-8 text-center flex flex-col items-center justify-center gap-2">
                                        <div className="p-2.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500">
                                          <SearchX className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                                            {t('common.noResults')}
                                          </span>
                                          <span className="text-xs text-slate-500 dark:text-slate-400">
                                            {t('quotation.header.tryDifferentSearch')}
                                          </span>
                                        </div>
                                      </CommandEmpty>
                                    )}
                                    <CommandGroup>
                                      {filteredCustomerOptions.map((option) => (
                                        <CommandItem
                                          key={option.value}
                                          value={option.value}
                                          onSelect={() => handleComboboxSelect(option)}
                                          className="cursor-pointer mb-1 last:mb-0 rounded-xl px-3 py-2 data-[selected=true]:bg-slate-100 dark:data-[selected=true]:bg-white/10 data-[selected=true]:text-slate-900 dark:data-[selected=true]:text-white transition-colors"
                                        >
                                          <div className="flex items-center gap-3 w-full">
                                            <div className={cn(
                                              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                              option.type === 'erp' 
                                                ? "bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400" 
                                                : "bg-pink-100 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400"
                                            )}>
                                              {option.type === 'erp' ? <Building2 size={16} /> : <User size={16} />}
                                            </div>
                                            
                                            <div className="flex flex-col flex-1 min-w-0">
                                              <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm text-slate-900 dark:text-zinc-200 truncate">
                                                  {option.name || option.label}
                                                </span>
                                                {((option.type === 'crm' && watchedCustomerId === option.id) || (option.type === 'erp' && watchedErpCustomerCode === option.code)) && (
                                                  <Check className="w-3.5 h-3.5 text-pink-500" />
                                                )}
                                              </div>
                                              <div className="flex items-center gap-2">
                                                {option.code && (
                                                  <span className="text-[11px] text-slate-500 dark:text-zinc-500 font-mono truncate bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                                                    {option.code}
                                                  </span>
                                                )}
                                              </div>
                                            </div>

                                            <div className="hidden sm:flex flex-col items-end gap-0.5 min-w-[120px]">
                                              {option.phone && (
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
                                                  <Phone size={12} className="opacity-70" />
                                                  <span>{option.phone}</span>
                                                </div>
                                              )}
                                              {option.email && (
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
                                                  <Mail size={12} className="opacity-70" />
                                                  <span className="max-w-[120px] truncate text-right">{option.email}</span>
                                                </div>
                                              )}
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
                            onClick={() => setCustomerSelectDialogOpen(true)}
                            disabled={readOnly}
                            className="h-11 w-11 p-0 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white shadow-md hover:shadow-lg transition-all border border-zinc-800 active:scale-95 flex items-center justify-center"
                            title={t('quotation.guide')}
                          >
                            <BookUser className="h-5 w-5" />
                          </Button>
                        </div>
                        <FormMessage className="mt-1.5" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Representative */}
                <div>
                  <FormField
                    control={form.control}
                    name="quotation.representativeId"
                    render={({ field }) => (
                      <FormItem className="space-y-0 relative group">
                        <FormLabel className={styles.label}>
                          {t('quotation.header.representative')}
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
                              placeholder={t('quotation.select')}
                              searchPlaceholder={t('common.search')}
                              disabled={readOnly}
                            />
                        </div>
                        <FormMessage className="mt-1.5" />
                      </FormItem>
                    )}
                  />
                </div>

                {selectedCustomer && (
                  <div className="animate-in slide-in-from-top-2 fade-in duration-500">
                    <FormField
                      control={form.control}
                      name="quotation.shippingAddressId"
                      render={({ field }) => (
                        <FormItem className="space-y-0 relative group">
                          <FormLabel className={styles.label}>
                              <Truck className="h-3.5 w-3.5 text-orange-500" />
                            {t('quotation.header.shippingAddress')}
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
                                placeholder={t('quotation.header.selectShippingAddress')}
                                searchPlaceholder={t('common.search')}
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
        </div>
      </div>

      {/* Bottom Section: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Column: Type & Dates */}
        <div className={cn(styles.glassCard, "flex flex-col")}>
            <div className="p-5 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-md bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400">
                  <Globe className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Tip & Tarihler</h4>
              </div>

              <div className="space-y-4 flex-1">
                <div className={cn("grid gap-4", watchedOfferType ? "grid-cols-2" : "grid-cols-1")}>
                  <FormField
                    control={form.control}
                    name="quotation.offerType"
                    render={({ field }) => (
                      <FormItem className="space-y-0 relative group">
                        <FormLabel className={styles.label} required={isZodFieldRequired(createQuotationSchema, 'quotation.offerType')}>
                          {t('common.offerType.label')}
                        </FormLabel>
                        <div className="relative">
                           <div className={styles.iconWrapper}><Layers className="h-4 w-4" /></div>
                           <VoiceSearchCombobox
                             className={styles.inputBase}
                             value={field.value || ''}
                             onSelect={(value) => field.onChange(value)}
                             options={[
                               { value: OfferType.YURTICI, label: t('common.offerType.yurtici') },
                               { value: OfferType.YURTDISI, label: t('common.offerType.yurtdisi') }
                             ]}
                             placeholder={t('common.offerType.selectPlaceholder')}
                             searchPlaceholder={t('common.search')}
                             disabled={readOnly}
                           />
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
                          <FormLabel className={styles.label}>
                            Gönderim/Teslim Şekli
                          </FormLabel>
                          <div className="relative">
                            <div className={styles.iconWrapper}><Truck className="h-4 w-4" /></div>
                            <Select 
                              disabled={readOnly} 
                              onValueChange={field.onChange} 
                              value={field.value || ''}
                            >
                              <FormControl>
                                <SelectTrigger className={cn(styles.inputBase, "pl-10")}>
                                  <SelectValue placeholder={t('quotation.select')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {salesTypesByOfferType.map((item) => (
                                  <SelectItem key={item.id} value={String(item.id)}>
                                    {item.name}
                                  </SelectItem>
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="quotation.offerDate"
                    render={({ field }) => (
                      <FormItem className="space-y-0 relative group">
                        <FormLabel className={styles.label}>Teklif T.</FormLabel>
                        <div className="relative">
                          <div className={styles.iconWrapper}><Calendar className="h-4 w-4" /></div>
                          <FormControl>
                            <Input 
                              type="date" 
                              className={cn(styles.inputBase, "text-xs")} 
                              style={forcePaddingStyle}
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

                  <FormField
                    control={form.control}
                    name="quotation.deliveryDate"
                    render={({ field }) => (
                      <FormItem className="space-y-0 relative group">
                        <FormLabel className={styles.label} required={isZodFieldRequired(createQuotationSchema, 'quotation.deliveryDate')}>Teslim T.</FormLabel>
                        <div className="relative">
                          <div className={styles.iconWrapper}><Truck className="h-4 w-4" /></div>
                          <FormControl>
                            <Input 
                              type="date" 
                              className={cn(styles.inputBase, "text-xs")}
                              style={forcePaddingStyle}
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

        {/* Right Column: Financial */}
        <div className={cn(styles.glassCard, "flex flex-col")}>
            <div className="p-5 flex flex-col h-full">
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
                  name="quotation.currency"
                  render={({ field }) => (
                    <FormItem className="space-y-0 relative group">
                      <FormLabel className={styles.label} required={isZodFieldRequired(createQuotationSchema, 'quotation.currency')}>Para Birimi</FormLabel>
                      <div className="relative">
                        <div className={styles.iconWrapper}><Coins className="h-4 w-4" /></div>
                        <VoiceSearchCombobox
                          className={styles.inputBase}
                          value={field.value ? String(field.value) : ''}
                          onSelect={(value) => value && handleCurrencyChange(value)}
                          options={erpRates.map((currency: KurDto) => ({
                            value: String(currency.dovizTipi),
                            label: currency.dovizIsmi || `Döviz ${currency.dovizTipi}`
                          }))}
                          placeholder={t('quotation.select')}
                          searchPlaceholder={t('common.search')}
                          disabled={readOnly}
                        />
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
                      <FormLabel className={styles.label} required={isZodFieldRequired(createQuotationSchema, 'quotation.paymentTypeId')}>Ödeme Planı</FormLabel>
                      <div className="relative">
                         <div className={styles.iconWrapper}><CreditCard className="h-4 w-4" /></div>
                         <VoiceSearchCombobox
                           className={styles.inputBase}
                           value={field.value?.toString() || ''}
                           onSelect={(value) => field.onChange(value ? Number(value) : null)}
                           options={paymentTypes.map((pt) => ({
                             value: pt.id.toString(),
                             label: pt.name
                           }))}
                           placeholder={t('quotation.select')}
                           searchPlaceholder={t('common.search')}
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

      </div>

      <CustomerSelectDialog
        open={customerSelectDialogOpen}
        onOpenChange={setCustomerSelectDialogOpen}
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
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[425px] bg-white/80 dark:bg-[#0c0516]/80 backdrop-blur-xl border-slate-200 dark:border-white/10 p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="px-6 py-5 border-b border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
            <DialogTitle className="flex items-center gap-3 text-slate-900 dark:text-white text-lg">
              <div className="bg-linear-to-br from-pink-500 to-rose-600 p-2.5 rounded-xl shadow-lg shadow-pink-500/20 text-white">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              {t('quotation.header.currencyChange.title')}
            </DialogTitle>
            <DialogDescription className="pt-2 text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              {t('quotation.header.currencyChange.message')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 p-6 bg-slate-50/30 dark:bg-black/20">
            <Button 
              variant="outline" 
              onClick={handleCurrencyChangeCancel} 
              className="h-11 px-6 rounded-xl border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 font-medium transition-all"
            >
              {t('quotation.cancel')}
            </Button>
            <Button 
              onClick={handleCurrencyChangeConfirm} 
              className="h-11 px-6 rounded-xl bg-linear-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 border-0 font-medium transition-all"
            >
              {t('quotation.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
