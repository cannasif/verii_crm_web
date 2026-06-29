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
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ErpFieldHint } from '@/components/shared/ErpFieldHint';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CustomerSelectDialog } from '@/components/shared/CustomerSelectDialog';
import { CustomerErpBalanceDialog } from '@/components/shared/CustomerErpBalanceDialog';
import { useCustomerComboListKeyboard } from '@/components/shared/useCustomerComboListKeyboard';
import { useShippingAddresses } from '../hooks/useShippingAddresses';
import { useDemandRelatedUsers } from '../hooks/useDemandRelatedUsers';
import {
  usePaymentTypeOptionsInfinite,
  useSalesTypeOptionsInfinite,
} from '@/components/shared/dropdown/useDropdownEntityInfinite';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import { useCustomer } from '@/features/customer-management/hooks/useCustomer';
import { useCustomerOptions } from '@/features/customer-management/hooks/useCustomerOptions';
import { useCustomerActivities } from '@/features/activity-management/hooks/useCustomerActivities';
import {
  mapCustomerToComboboxOption,
  resolveCustomerFieldDisplayValue,
  type CustomerComboboxOption,
} from '@/features/customer-management/utils/customer-integration';
import { useErpProjectCodesInfinite } from '@/services/hooks/useErpProjectCodesInfinite';
import { useSpecialCodeExists, useSpecialCodesInfinite } from '@/services/hooks/useSpecialCodesInfinite';
import { useAvailableDocumentSerialTypes } from '@/features/document-serial-type-management/hooks/useAvailableDocumentSerialTypes';
import { useDocumentSerialAutoFill } from '@/features/document-serial-type-management/hooks/useDocumentSerialAutoFill';
import { useWindoDefinitionOptions } from '@/features/windo-profil-demir-vida-management/hooks/useWindoDefinitionOptions';
import { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';
import type { KurDto } from '@/services/erp-types';
import { ExchangeRateDialog } from './ExchangeRateDialog';
import { QuotationNotesDialog } from '@/features/quotation/components/QuotationNotesDialog';
import { QuotationStructuredNotesList } from '@/features/quotation/components/QuotationStructuredNotesList';
import { QuotationNotesAddLineButton } from '@/features/quotation/components/QuotationNotesAddLineButton';
import type { QuotationNotesDto } from '@/features/quotation/types/quotation-types';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import { 
  Search, SearchX, User, Truck, Briefcase, Globe, 
  Calendar, CreditCard, Hash, FileText, ArrowRightLeft, 
  Layers, Folder, MapPin, BookUser, Check, Building2,
  Banknote
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { createDemandSchema, type CreateDemandSchema } from '../schemas/demand-schema';
import { OfferType } from '@/types/offer-type';
import type { DemandExchangeRateFormState } from '../types/demand-types';
import { cn } from '@/lib/utils';
import { matchesSearchTerm } from '@/lib/search';
import { isZodFieldRequired } from '@/lib/zod-required';
import {
  canApplySpecialCodeDefault,
  getDefaultSpecialCodeForOfferType,
} from '@/lib/sales-document-special-code-defaults';

interface DemandHeaderFormProps {
  exchangeRates?: DemandExchangeRateFormState[];
  onExchangeRatesChange?: (rates: DemandExchangeRateFormState[]) => void;
  onApplyExchangeRateChangeToLines?: (oldExchangeRate: number, newExchangeRate: number) => void;
  quotationNotes?: QuotationNotesDto;
  onQuotationNotesChange?: (notes: QuotationNotesDto) => void;
  onSaveNotes?: (notes: QuotationNotesDto) => Promise<void>;
  isSavingNotes?: boolean;
  lines?: Array<{ productCode?: string | null; productName?: string | null }>;
  onLinesChange?: (lines: Array<{ productCode?: string | null; productName?: string | null }>) => void;
  onCurrencyChange?: (oldCurrency: number, newCurrency: number) => Promise<void> | void;
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
  onApplyExchangeRateChangeToLines,
  quotationNotes = {},
  onQuotationNotesChange,
  onSaveNotes,
  isSavingNotes = false,
  lines = [],
  onLinesChange,
  onCurrencyChange,
  initialCurrency,
  demandId,
  demandOfferNo,
  readOnly = false,
  showDocumentSerialType = true,
}: DemandHeaderFormProps = {}): ReactElement {
  const { t } = useTranslation(['demand', 'common']);
  const form = useFormContext<CreateDemandSchema>();
  const { data: erpRates = [] } = useExchangeRate();
  const user = useAuthStore((state) => state.user);
  const branch = useAuthStore((state) => state.branch);

  const [customerSelectDialogOpen, setCustomerSelectDialogOpen] = useState(false);
  const [customerBalanceDialogOpen, setCustomerBalanceDialogOpen] = useState(false);
  const [exchangeRateDialogOpen, setExchangeRateDialogOpen] = useState(false);
  const [currencyChangeDialogOpen, setCurrencyChangeDialogOpen] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);
  const [customerComboboxOpen, setCustomerComboboxOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [ozelKod1SearchTerm, setOzelKod1SearchTerm] = useState('');
  const [ozelKod2SearchTerm, setOzelKod2SearchTerm] = useState('');
  const [paymentTypeSearchTerm, setPaymentTypeSearchTerm] = useState('');
  const [deliveryMethodSearchTerm, setDeliveryMethodSearchTerm] = useState('');
  const [activitySearchTerm, setActivitySearchTerm] = useState('');
  const isInitialLoadRef = useRef(true);

  const handleRemoveNote = (key: keyof QuotationNotesDto): void => {
    if (onQuotationNotesChange) {
      onQuotationNotesChange({ ...quotationNotes, [key]: '' });
    }
  };

  const watchedCustomerId = form.watch('demand.potentialCustomerId');
  const watchedErpCustomerCode = form.watch('demand.erpCustomerCode');
  const watchedCurrency = form.watch('demand.currency');
  const watchedRepresentativeId = form.watch('demand.representativeId');
  const watchedActivityId = form.watch('demand.activityId');
  const watchedDocumentSerialTypeId = form.watch('demand.documentSerialTypeId');
  const prevRepresentativeIdRef = useRef<number | null | undefined>(watchedRepresentativeId);
  const watchedOfferType = form.watch('demand.offerType');
  const defaultSpecialCode = getDefaultSpecialCodeForOfferType(watchedOfferType);
  const specialCodeManualChangeRef = useRef({ ozelKod1: false, ozelKod2: false });

  const paymentTypeDropdown = usePaymentTypeOptionsInfinite(paymentTypeSearchTerm, true);
  const { koliBaskiOptions, isLoading: isKoliBaskiOptionsLoading } = useWindoDefinitionOptions();
  const deliveryMethodDropdown = useSalesTypeOptionsInfinite(
    deliveryMethodSearchTerm,
    !!watchedOfferType,
    watchedOfferType ?? null
  );
  const customerActivitiesQuery = useCustomerActivities(watchedCustomerId, activitySearchTerm);
  const activityOptions = useMemo(
    () =>
      (customerActivitiesQuery.data ?? []).map((activity) => ({
        value: String(activity.id),
        label: [
          activity.subject || `#${activity.id}`,
          activity.startDateTime ? new Date(activity.startDateTime).toLocaleDateString() : null,
        ].filter(Boolean).join(' - '),
      })),
    [customerActivitiesQuery.data],
  );
  const specialCode1Dropdown = useSpecialCodesInfinite(1, ozelKod1SearchTerm);
  const specialCode2Dropdown = useSpecialCodesInfinite(2, ozelKod2SearchTerm);
  const specialCode1DefaultExists = useSpecialCodeExists(1, defaultSpecialCode, !readOnly && !demandId);
  const specialCode2DefaultExists = useSpecialCodeExists(2, defaultSpecialCode, !readOnly && !demandId);
  const prevOfferTypeRef = useRef(watchedOfferType);
  useEffect(() => {
    if (prevOfferTypeRef.current !== watchedOfferType) {
      prevOfferTypeRef.current = watchedOfferType;
      form.setValue('demand.deliveryMethod', null);
    }
  }, [watchedOfferType, form]);

  useEffect(() => {
    if (!watchedCustomerId) {
      if (watchedActivityId != null) {
        form.setValue('demand.activityId', null, { shouldDirty: true, shouldValidate: true });
      }
      return;
    }

    if (
      watchedActivityId &&
      !customerActivitiesQuery.isLoading &&
      !activityOptions.some((option) => option.value === String(watchedActivityId))
    ) {
      form.setValue('demand.activityId', null, { shouldDirty: true, shouldValidate: true });
    }
  }, [activityOptions, customerActivitiesQuery.isLoading, form, watchedActivityId, watchedCustomerId]);

  const watchedOzelKod1 = form.watch('demand.ozelKod1');

  useEffect(() => {
    const currentOzelKod2 = form.getValues('demand.ozelKod2');
    if (!watchedOzelKod1) {
      if (currentOzelKod2 !== '') {
        form.setValue('demand.ozelKod2', '', { shouldDirty: false, shouldValidate: true });
      }
      return;
    }
    const firstChar = watchedOzelKod1.charAt(0).toUpperCase();
    const targetValue = ['I', 'K', 'N'].includes(firstChar) ? firstChar : '';
    if (currentOzelKod2 !== targetValue) {
      form.setValue('demand.ozelKod2', targetValue, { shouldDirty: false, shouldValidate: true });
    }
  }, [watchedOzelKod1, form]);

  useEffect(() => {
    if (readOnly || demandId) return;

    if (!defaultSpecialCode) return;

    const currentOzelKod1 = form.getValues('demand.ozelKod1');

    if (
      !specialCodeManualChangeRef.current.ozelKod1 &&
      canApplySpecialCodeDefault(currentOzelKod1) &&
      currentOzelKod1 !== defaultSpecialCode &&
      specialCode1DefaultExists.data === true
    ) {
      form.setValue('demand.ozelKod1', defaultSpecialCode, { shouldDirty: false, shouldValidate: true });
    }
  }, [
    defaultSpecialCode,
    demandId,
    readOnly,
    form,
    specialCode1DefaultExists.data,
    specialCode2DefaultExists.data,
  ]);

  const { data: shippingAddresses } = useShippingAddresses(watchedCustomerId || undefined);
  const { data: relatedUsers = [] } = useDemandRelatedUsers(user?.id);
  const {
    data: customerOptions = [],
    isFetched: hasCustomerOptionsLoaded,
  } = useCustomerOptions(watchedRepresentativeId);
  const shouldFetchCustomer = Boolean(watchedCustomerId && watchedCustomerId > 0);
  const { data: customer } = useCustomer(watchedCustomerId ?? 0, shouldFetchCustomer);
  const projectDropdown = useErpProjectCodesInfinite(projectSearchTerm);
  
  const customerTypeId = useMemo(() => {
    if (watchedErpCustomerCode) return 0;
    return customer?.customerTypeId ?? 0;
  }, [watchedErpCustomerCode, customer?.customerTypeId]);
  
  const { data: availableDocumentSerialTypes = [] } = useAvailableDocumentSerialTypes(
    customerTypeId,
    watchedRepresentativeId ?? undefined,
    PricingRuleType.Demand
  );

  const { handleDocumentSerialTypeSelect } = useDocumentSerialAutoFill({
    rootKey: 'demand',
    ruleType: PricingRuleType.Demand,
    documentId: demandId,
    readOnly,
    availableDocumentSerialTypes,
    watchedDocumentSerialTypeId,
    watchedRepresentativeId,
    userId: user?.id,
    branchCode: branch?.code ?? branch?.id,
  });

  const customerDisplayValue = useMemo(
    () =>
      resolveCustomerFieldDisplayValue({
        customerId: watchedCustomerId,
        erpCustomerCode: watchedErpCustomerCode,
        customer,
        customerOptions,
      }),
    [watchedCustomerId, watchedErpCustomerCode, customer, customerOptions]
  );

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

    form.setValue('demand.potentialCustomerId', undefined, { shouldDirty: true, shouldValidate: true });
    form.setValue('demand.erpCustomerCode', '', { shouldDirty: true, shouldValidate: true });
    form.setValue('demand.shippingAddressId', null, { shouldDirty: true, shouldValidate: true });
  }, [
    customerOptions,
    form,
    hasCustomerOptionsLoaded,
    watchedCustomerId,
    watchedErpCustomerCode,
    watchedRepresentativeId,
  ]);

  const allCustomerOptions = useMemo(
    () => customerOptions.map((customerOption) => mapCustomerToComboboxOption(customerOption)),
    [customerOptions]
  );

  const filteredCustomerOptions = useMemo(() => {
    let options = allCustomerOptions;

    if (customerTypeId && !watchedCustomerId && !watchedErpCustomerCode) {
      options = options.filter((o) => o.customerTypeId === customerTypeId);
    }

    if (!customerSearchQuery) return options.slice(0, 50);
    return options
      .filter((option) => matchesSearchTerm(customerSearchQuery, [option.label, option.code]))
      .slice(0, 50);
  }, [allCustomerOptions, customerSearchQuery, customerTypeId, watchedCustomerId, watchedErpCustomerCode]);

  const handleComboboxSelect = (option: CustomerComboboxOption): void => {
    form.setValue('demand.potentialCustomerId', option.id, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue('demand.erpCustomerCode', option.code ?? null, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setCustomerComboboxOpen(false);
  };

  const customerCommandListRef = useRef<HTMLDivElement | null>(null);
  const customerKeyboard = useCustomerComboListKeyboard({
    readOnly,
    filterKey: customerSearchQuery,
    filteredOptions: filteredCustomerOptions,
    comboboxOpen: customerComboboxOpen,
    setComboboxOpen: setCustomerComboboxOpen,
    onSelectOption: handleComboboxSelect,
  });

  useEffect(() => {
    if (!customerComboboxOpen || customerKeyboard.highlightIndex < 0) {
      return;
    }
    const root = customerCommandListRef.current;
    if (!root) {
      return;
    }
    window.requestAnimationFrame(() => {
      const active = root.querySelector('[data-kb-customer-active="true"]');
      if (active instanceof HTMLElement) {
        active.scrollIntoView({ block: 'nearest' });
      }
    });
  }, [customerKeyboard.highlightIndex, customerComboboxOpen]);

  useEffect(() => {
    const currentRepresentativeId = form.watch('demand.representativeId');
    if (!currentRepresentativeId && user?.id) {
      form.setValue('demand.representativeId', user.id);
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
  const canShowCustomerBalance = Boolean(
    watchedCustomerId && watchedCustomerId > 0 && watchedErpCustomerCode?.trim()
  );

  const handleExchangeRatesSave = (rates: DemandExchangeRateFormState[]): void => {
    if (onExchangeRatesChange) onExchangeRatesChange(rates);
  };

  const handleCurrencyChange = (newCurrency: string): void => {
    const currentCurrency = form.watch('demand.currency');
    const newCurrencyNum = Number(newCurrency);
    const currentCurrencyNum =
      currentCurrency === '' || currentCurrency === null || currentCurrency === undefined
        ? null
        : typeof currentCurrency === 'string'
          ? Number(currentCurrency)
          : currentCurrency;
    
    if (isInitialLoadRef.current) {
      form.setValue('demand.currency', newCurrency, { shouldValidate: false, shouldDirty: false });
      return;
    }
    
    if (currentCurrencyNum !== null && currentCurrencyNum === newCurrencyNum) return;
    
    if (lines && lines.length > 0 && onLinesChange) {
      setPendingCurrency(newCurrency);
      setCurrencyChangeDialogOpen(true);
    } else {
      form.setValue('demand.currency', newCurrency);
    }
  };

  const handleCurrencyChangeConfirm = async (): Promise<void> => {
    if (!pendingCurrency || !onLinesChange) {
      return;
    }

    try {
      const watchedCurrencyNum =
        watchedCurrency === '' || watchedCurrency === null || watchedCurrency === undefined
          ? null
          : typeof watchedCurrency === 'string'
            ? Number(watchedCurrency)
            : watchedCurrency;

      if (onCurrencyChange && watchedCurrencyNum != null) {
        await onCurrencyChange(watchedCurrencyNum, Number(pendingCurrency));
      } else {
        onLinesChange(lines || []);
      }
      form.setValue('demand.currency', pendingCurrency);
    } catch {
      // ZERO_RATE vb. durumda para birimini değiştirme
    } finally {
      setCurrencyChangeDialogOpen(false);
      setPendingCurrency(null);
    }
  };

  const handleCurrencyChangeCancel = (): void => {
    setCurrencyChangeDialogOpen(false);
    setPendingCurrency(null);
  };

  const styles = {
    glassCard: "relative overflow-hidden rounded-2xl border border-slate-400/80 dark:border-white/14 bg-white/88 dark:bg-[#130822]/48 backdrop-blur-xl shadow-[0_1px_0_rgba(15,23,42,0.05),0_14px_30px_-24px_rgba(15,23,42,0.4)] ring-1 ring-slate-300/60 dark:ring-white/10 transition-all duration-300 hover:shadow-md",
    inputBase: "h-11 bg-white dark:bg-[#0f0a18] border-slate-400/75 dark:border-white/16 rounded-xl shadow-sm transition-all duration-300 focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 outline-none w-full",
    label: "text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2",
    iconWrapper: "absolute left-3 top-1/2 -translate-y-1/2 transition-colors z-20 flex items-center justify-center pointer-events-none",
    selectTrigger: "w-full h-11 bg-white dark:bg-[#0f0a18] border-slate-500/80 dark:border-white/22 hover:border-pink-400 dark:hover:border-white/30 transition-all shadow-[0_1px_0_rgba(15,23,42,0.05),0_6px_14px_-10px_rgba(15,23,42,0.35)] rounded-xl focus:ring-4 focus:ring-pink-500/12 focus:border-pink-500 outline-none text-slate-800 dark:text-slate-100",
    selectContent: "rounded-xl border border-slate-300 dark:border-white/16 bg-white dark:bg-[#0f0a18] shadow-2xl backdrop-blur-xl",
    selectItem: "focus:bg-pink-50 dark:focus:bg-pink-900/10 focus:text-pink-600 cursor-pointer rounded-lg m-1"
  };
  const getIconTone = (hasValue: boolean): string =>
    hasValue ? 'text-pink-500' : 'text-slate-400 group-focus-within:text-pink-500';

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
                    {t('demand:header.customer')}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1 group min-w-0">
                      <div className={cn("absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none transition-colors", customerSearchQuery?.trim() ? "text-pink-500" : "text-slate-400 group-focus-within:text-pink-500")}>
                        <Search className="h-4 w-4" />
                      </div>
                      <FormControl>
                        <Input
                          className={cn(styles.inputBase, "pl-10 font-medium truncate caret-pink-500")}
                          value={customerSearchQuery}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCustomerSearchQuery(v);
                            setCustomerComboboxOpen(v.trim().length > 0);
                          }}
                          onKeyDown={customerKeyboard.onInputKeyDown}
                          placeholder={t('demand:header.selectCustomer')}
                          disabled={readOnly}
                          autoComplete="off"
                        />
                      </FormControl>
                      <Popover open={customerComboboxOpen} onOpenChange={setCustomerComboboxOpen}>
                        <PopoverAnchor className="absolute top-full left-0 h-0 w-full" />
                        <PopoverContent
                          className="p-0 w-[90vw] sm:w-[550px] max-h-[350px] overflow-hidden bg-white dark:bg-[#0f0a18] border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl"
                          align="start"
                          sideOffset={8}
                          onOpenAutoFocus={(e) => e.preventDefault()}
                        >
                          <Command shouldFilter={false}>
                            <div
                              ref={customerCommandListRef}
                              className="max-h-[350px] overflow-y-auto"
                            >
                              <CommandList className="p-2 space-y-1">
                              {filteredCustomerOptions.length === 0 && (
                                <CommandEmpty className="py-8 text-center flex flex-col items-center gap-2">
                                  <SearchX className="w-5 h-5 text-slate-400" />
                                  <span className="text-sm font-medium text-slate-500">{t('common.noResults')}</span>
                                </CommandEmpty>
                              )}
                              <CommandGroup>
                                {filteredCustomerOptions.map((option, index) => (
                                  <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    data-kb-customer-active={customerKeyboard.isOptionKeyboardActive(index) ? 'true' : undefined}
                                    onSelect={() => handleComboboxSelect(option)}
                                    className={cn(
                                      'cursor-pointer mb-1 rounded-xl px-3 py-2 data-[selected=true]:bg-rose-50 dark:data-[selected=true]:bg-rose-950/20 transition-colors',
                                      customerKeyboard.isOptionKeyboardActive(index) &&
                                        'ring-2 ring-rose-500 ring-offset-2 ring-offset-white dark:ring-offset-[#0f0a18]',
                                    )}
                                  >
                                    <div className="flex items-center gap-3 w-full min-w-0">
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
                                        {option.code && <span className="text-[11px] text-slate-500 font-mono">{option.code}</span>}
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                            </div>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCustomerSelectDialogOpen(true)}
                      className="h-11 w-11 shrink-0 rounded-xl border-slate-200 dark:border-white/10 hover:bg-rose-600 hover:border-rose-600 hover:text-white transition-all duration-300 shadow-sm"
                      disabled={readOnly}
                    >
                      <BookUser className="h-5 w-5" />
                    </Button>
                    {canShowCustomerBalance && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCustomerBalanceDialogOpen(true)}
                        className="h-11 w-11 shrink-0 rounded-xl border-slate-200 dark:border-white/10 hover:bg-emerald-600 hover:border-emerald-600 hover:text-white transition-all duration-300 shadow-sm"
                        title={t('customer360:balanceDialog.openButton', { defaultValue: 'Cari bakiye özeti' })}
                        aria-label={t('customer360:balanceDialog.openButton', { defaultValue: 'Cari bakiye özeti' })}
                      >
                        <Banknote className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="xl:col-span-1 space-y-2">
                  <div className={styles.label}>
                    <div className="p-1 rounded-md bg-purple-50 dark:bg-purple-900/20 text-purple-600">
                      <Briefcase className="w-3.5 h-3.5" />
                    </div>
                    {t('demand:header.representative')}
                  </div>
                  <FormField
                    control={form.control}
                    name="demand.representativeId"
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
                            placeholder={t('select')}
                            className={cn(styles.selectTrigger, "min-w-0 px-4 font-medium text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500")}
                            popoverContentClassName="md:min-w-[var(--radix-popover-trigger-width)] md:w-auto md:max-w-[400px]"
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
                    {t('demand:header.shippingAddress')}
                  </div>
                  <FormField
                    control={form.control}
                    name="demand.shippingAddressId"
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
                            placeholder={t('demand:header.selectShippingAddress')}
                            className={cn(styles.selectTrigger, "min-w-0 px-4 hover:border-emerald-400 dark:hover:border-emerald-600 shadow-sm focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500")}
                            popoverContentClassName="md:min-w-[var(--radix-popover-trigger-width)] md:w-auto md:max-w-[400px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {selectedCustomer && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="space-y-2">
                  <div className={styles.label}>
                    <div className="p-1 rounded-md bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600">
                      <BookUser className="w-3.5 h-3.5" />
                    </div>
                    {t('demand:header.activity', { defaultValue: 'Bağlı Aktivite' })}
                  </div>
                  <FormField
                    control={form.control}
                    name="demand.activityId"
                    render={({ field }) => (
                      <FormItem className="space-y-0 min-w-0">
                        <FormControl>
                          <VoiceSearchCombobox
                            options={activityOptions}
                            value={field.value?.toString() || ''}
                            onSelect={(v) => field.onChange(v ? Number(v) : null)}
                            onDebouncedSearchChange={setActivitySearchTerm}
                            isLoading={customerActivitiesQuery.isLoading}
                            placeholder={t('demand:header.selectActivity', { defaultValue: 'Aktivite seçin' })}
                            className={cn(styles.selectTrigger, "min-w-0 px-4 hover:border-cyan-400 dark:hover:border-cyan-600 shadow-sm focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500")}
                            popoverContentClassName="md:min-w-[var(--radix-popover-trigger-width)] md:w-auto md:max-w-[480px]"
                            disabled={readOnly || !watchedCustomerId}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className={styles.glassCard}>
          <div className="p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
                  <CreditCard className="h-4 w-4" />
                </div>
                {t('demand:header.financialCardTitle')}
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
                   {t('demand:header.exchangeRatesLink')}
                 </Button>
               )}
            </div>
            <div className="space-y-4 flex-1">
              <FormField
                control={form.control}
                name="demand.currency"
                render={({ field }) => (
                  <FormItem className="space-y-0 relative group">
                    <FormLabel className={styles.label} required={isZodFieldRequired(createDemandSchema, 'demand.currency')}>{t('demand:header.currency')}</FormLabel>
                    <div className="relative">
                      <div className={cn(styles.iconWrapper, getIconTone(Boolean(field.value)))}>
                        <Banknote className="h-4 w-4" />
                      </div>
                      <FormControl>
                        <VoiceSearchCombobox
                          options={erpRates.map((c: KurDto) => ({
                            value: String(c.dovizTipi),
                            label: c.dovizIsmi || t('demand:header.currencyNameFallback', { code: c.dovizTipi }),
                          }))}
                          value={field.value ? String(field.value) : ''}
                          onSelect={(v) => v && handleCurrencyChange(v)}
                          placeholder={t('select')}
                          className={cn(
                            styles.selectTrigger,
                            "min-w-0 pl-10 font-bold tracking-wide transition-all focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500",
                            "hover:brightness-95 dark:hover:brightness-110"
                          )}
                          popoverContentClassName="md:min-w-[var(--radix-popover-trigger-width)] md:w-auto md:max-w-[400px]"
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
                name="demand.paymentTypeId"
                render={({ field }) => (
                  <FormItem className="space-y-0 relative group">
                    <FormLabel className={styles.label} required>
                      {t('demand:header.paymentType')}
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
                          placeholder={t('select')}
                          className={cn(styles.selectTrigger, "min-w-0 pl-10 hover:border-pink-400 dark:hover:border-white/20 focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500")}
                          popoverContentClassName="md:min-w-[var(--radix-popover-trigger-width)] md:w-auto md:max-w-[400px]"
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
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('demand:header.typeAndDatesCardTitle')}</h4>
            </div>
            <div className="space-y-4 flex-1">
              {/* FIXED: Changed to single column (grid-cols-1) to ensure stacking */}
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="demand.offerType"
                  render={({ field }) => (
                    <FormItem className="space-y-0 relative group w-full min-w-0">
                      <FormLabel className={styles.label} required={isZodFieldRequired(createDemandSchema, 'demand.offerType')}>
                        {t('common.offerType.label')}
                      </FormLabel>
                      <div className="relative w-full min-w-0">
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
                            className={cn(styles.selectTrigger, "min-w-0 pl-10 focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500")}
                            popoverContentClassName="md:min-w-[var(--radix-popover-trigger-width)] md:w-auto md:max-w-[400px]"
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
                    name="demand.deliveryMethod"
                    render={({ field }) => (
                      <FormItem className="space-y-0 relative group w-full min-w-0">
                        <FormLabel className={cn(styles.label, "truncate whitespace-nowrap")}>{t('demand:header.deliveryMethod')}</FormLabel>
                        <div className="relative w-full min-w-0">
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
                              placeholder={t('select')}
                              className={cn(styles.selectTrigger, "min-w-0 pl-10 focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500")}
                              popoverContentClassName="md:min-w-[var(--radix-popover-trigger-width)] md:w-auto md:max-w-[400px]"
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
              {/* FIXED: Changed to single column (grid-cols-1) to ensure dates are stacked */}
              <div className="grid grid-cols-1 gap-4 pt-1">
                 <FormField
                  control={form.control}
                  name="demand.offerDate"
                  render={({ field }) => (
                    <FormItem className="space-y-0 relative group w-full min-w-0">
                      <FormLabel className={styles.label}>{t('demand:header.offerDateAbbrev')}</FormLabel>
                      <div className="relative w-full min-w-0">
                        <div className={cn(styles.iconWrapper, getIconTone(Boolean(field.value)))}><Calendar className="h-4 w-4" /></div>
                        <FormControl>
                          <Input 
                            type="date" 
                            className={cn(styles.inputBase, "pl-10 text-xs sm:text-sm font-medium bg-white dark:bg-[#0f0a18] border-slate-200 dark:border-white/10 shadow-sm focus-visible:ring-4 focus-visible:ring-pink-500/10 focus-visible:border-pink-500")} 
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
                    <FormItem className="space-y-0 relative group w-full min-w-0">
                      <FormLabel className={styles.label}>{t('demand:header.deliveryDateAbbrev')}</FormLabel>
                      <div className="relative w-full min-w-0">
                        <div className={cn(styles.iconWrapper, getIconTone(Boolean(field.value)))}><Truck className="h-4 w-4" /></div>
                        <FormControl>
                          <Input 
                            type="date" 
                            className={cn(styles.inputBase, "pl-10 text-xs sm:text-sm font-medium bg-white dark:bg-[#0f0a18] border-slate-200 dark:border-white/10 shadow-sm focus-visible:ring-4 focus-visible:ring-pink-500/10 focus-visible:border-pink-500")}
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
           <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-600">
                  <FileText className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('demand:header.documentDetail')}</h4>
              </div>
              <div className="space-y-4">
                 {showDocumentSerialType && (
                  <FormField
                    control={form.control}
                    name="demand.documentSerialTypeId"
                    render={({ field }) => (
                      <FormItem className="space-y-0 relative group w-full min-w-0">
                        <FormLabel className={styles.label} required={isZodFieldRequired(createDemandSchema, 'demand.documentSerialTypeId')}>{t('demand:header.serialNumber')}</FormLabel>
                        <div className="relative w-full min-w-0">
                          <div className={cn(styles.iconWrapper, getIconTone(Boolean(field.value)))}><Hash className="h-4 w-4" /></div>
                          <FormControl>
                            <VoiceSearchCombobox
                              options={availableDocumentSerialTypes
                                .filter((d) => d.serialPrefix?.trim() !== '')
                                .map((d) => ({ value: d.id.toString(), label: d.serialPrefix || String(d.id) }))}
                              value={field.value?.toString() || ''}
                              onSelect={(value) => {
                                handleDocumentSerialTypeSelect(value ? Number(value) : null);
                              }}
                              placeholder={t('select')}
                              className={cn(styles.selectTrigger, "min-w-0 pl-10 shadow-sm focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500")}
                              popoverContentClassName="md:min-w-[var(--radix-popover-trigger-width)] md:w-auto md:max-w-[400px]"
                              disabled={readOnly || customerTypeId === undefined || !watchedRepresentativeId}
                            />
                          </FormControl>
                        </div>
                        <FormMessage className="mt-1" />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="demand.projectCode"
                  render={({ field }) => (
                    <FormItem className="gap-0 space-y-0 relative group w-full min-w-0">
                      <FormLabel className={styles.label}>
                        <Folder className="h-3.5 w-3.5" />
                        {t('demand:header.projectCode')}
                      </FormLabel>
                      <div className="relative w-full min-w-0">
                        <div className={cn(styles.iconWrapper, getIconTone(Boolean(field.value)))}><Folder className="h-4 w-4" /></div>
                        <FormControl>
                          <VoiceSearchCombobox
                            className={cn(styles.selectTrigger, "min-w-0 pl-10 shadow-sm focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500")}
                            popoverContentClassName="md:min-w-[var(--radix-popover-trigger-width)] md:w-auto md:max-w-[400px]"
                            value={field.value || ''}
                            onSelect={(value) => field.onChange(value)}
                            options={projectDropdown.options}
                            onDebouncedSearchChange={setProjectSearchTerm}
                            onFetchNextPage={projectDropdown.fetchNextPage}
                            hasNextPage={projectDropdown.hasNextPage}
                            isLoading={projectDropdown.isLoading}
                            isFetchingNextPage={projectDropdown.isFetchingNextPage}
                            placeholder={t('demand:header.projectCodePlaceholder')}
                            searchPlaceholder={t('common.search')}
                            disabled={readOnly}
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="mt-1.5" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="demand.ozelKod1"
                  render={({ field }) => (
                    <FormItem className="gap-0 space-y-0 relative group w-full min-w-0">
                      <FormLabel className={styles.label} required={isZodFieldRequired(createDemandSchema, 'demand.ozelKod1')}>
                        <Layers className="h-3.5 w-3.5" />
                        {t('demand:header.ozelKod1')}
                      </FormLabel>
                      <div className="relative w-full min-w-0">
                        <div className={cn(styles.iconWrapper, getIconTone(Boolean(field.value)))}><Layers className="h-4 w-4" /></div>
                        <FormControl>
                          <VoiceSearchCombobox
                            className={cn(styles.selectTrigger, "min-w-0 pl-10 shadow-sm focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500")}
                            popoverContentClassName="md:min-w-[var(--radix-popover-trigger-width)] md:w-auto md:max-w-[400px]"
                            value={field.value || ''}
                            onSelect={(value) => {
                              specialCodeManualChangeRef.current.ozelKod1 = true;
                              field.onChange(value);
                            }}
                            options={specialCode1Dropdown.options}
                            onDebouncedSearchChange={setOzelKod1SearchTerm}
                            onFetchNextPage={specialCode1Dropdown.fetchNextPage}
                            hasNextPage={specialCode1Dropdown.hasNextPage}
                            isLoading={specialCode1Dropdown.isLoading}
                            isFetchingNextPage={specialCode1Dropdown.isFetchingNextPage}
                            placeholder={t('demand:header.ozelKod1Placeholder')}
                            searchPlaceholder={t('demand:header.specialCodeSearchPlaceholder')}
                            disabled={readOnly}
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="mt-1.5" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="demand.ozelKod2"
                  render={({ field }) => (
                    <FormItem className="gap-0 space-y-0 relative group w-full min-w-0">
                      <FormLabel className={styles.label} required={isZodFieldRequired(createDemandSchema, 'demand.ozelKod2')}>
                        <Layers className="h-3.5 w-3.5" />
                        {t('demand:header.ozelKod2')}
                      </FormLabel>
                      <div className="relative w-full min-w-0">
                        <div className={cn(styles.iconWrapper, getIconTone(Boolean(field.value)))}><Layers className="h-4 w-4" /></div>
                        <FormControl>
                          <VoiceSearchCombobox
                            className={cn(styles.selectTrigger, "min-w-0 pl-10 shadow-sm focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500")}
                            popoverContentClassName="md:min-w-[var(--radix-popover-trigger-width)] md:w-auto md:max-w-[400px]"
                            value={field.value || ''}
                            onSelect={(value) => {
                              specialCodeManualChangeRef.current.ozelKod2 = true;
                              field.onChange(value);
                            }}
                            options={specialCode2Dropdown.options}
                            onDebouncedSearchChange={setOzelKod2SearchTerm}
                            onFetchNextPage={specialCode2Dropdown.fetchNextPage}
                            hasNextPage={specialCode2Dropdown.hasNextPage}
                            isLoading={specialCode2Dropdown.isLoading}
                            isFetchingNextPage={specialCode2Dropdown.isFetchingNextPage}
                            placeholder={t('demand:header.ozelKod2Placeholder')}
                            searchPlaceholder={t('demand:header.specialCodeSearchPlaceholder')}
                            disabled={readOnly || true}
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="mt-1.5" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="demand.koliBaskiDefinitionId"
                  render={({ field }) => (
                    <FormItem className="gap-0 space-y-0 relative group w-full min-w-0">
                      <FormLabel className={styles.label}>
                        <Layers className="h-3.5 w-3.5" />
                        {t('demand:header.koliBaski', { defaultValue: 'Koli Baskı' })}
                      </FormLabel>
                      <div className="relative w-full min-w-0">
                        <div className={cn(styles.iconWrapper, getIconTone(Boolean(field.value)))}><Layers className="h-4 w-4" /></div>
                        <FormControl>
                          <VoiceSearchCombobox
                            className={cn(styles.selectTrigger, "min-w-0 pl-10 shadow-sm focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500")}
                            popoverContentClassName="md:min-w-[var(--radix-popover-trigger-width)] md:w-auto md:max-w-[400px]"
                            value={field.value ? String(field.value) : ''}
                            onSelect={(value) => field.onChange(value ? Number(value) : null)}
                            options={koliBaskiOptions.map((option) => ({ value: String(option.id), label: option.name }))}
                            placeholder={isKoliBaskiOptionsLoading ? t('common.loading', { ns: 'common', defaultValue: 'Yükleniyor...' }) : t('demand:header.koliBaskiPlaceholder', { defaultValue: 'Koli baskı seçin' })}
                            searchPlaceholder={t('demand:header.koliBaskiSearchPlaceholder', { defaultValue: 'Koli baskı ara...' })}
                            disabled={readOnly || isKoliBaskiOptionsLoading}
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="mt-1.5" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="demand.description"
                  render={({ field }) => (
                    <FormItem className="space-y-0 relative group w-full min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <FormLabel className={cn(styles.label, "mb-0")}>{t('demand:header.notes')}</FormLabel>
                          <ErpFieldHint label={t('demand:header.descriptionErpTooltip')} />
                        </div>
                        <span className={cn("text-[10px] transition-colors", (field.value?.length || 0) > 350 ? "text-red-500 font-bold" : "text-slate-400")}>
                          {field.value?.length || 0}/400
                        </span>
                      </div>
                      <FormControl>
                        <div className="relative w-full min-w-0">
                          <Textarea
                            {...field}
                            value={field.value || ''}
                            maxLength={400}
                            placeholder={t('demand:header.descriptionPlaceholder')}
                            className="min-h-[100px] max-h-[160px] overflow-y-auto w-full break-all whitespace-pre-wrap rounded-xl border-slate-200 dark:border-white/10 bg-white/50 dark:bg-[#0f0a18]/30 resize-none focus-visible:border-pink-500 focus-visible:ring-4 focus-visible:ring-pink-500/20 transition-all text-sm py-2.5 pr-10 shadow-sm"
                            disabled={readOnly}
                          />
                          {onQuotationNotesChange && (
                            <QuotationNotesAddLineButton
                              onClick={() => setNotesDialogOpen(true)}
                              disabled={readOnly}
                            />
                          )}
                        </div>
                      </FormControl>
                      <QuotationStructuredNotesList
                        notes={quotationNotes}
                        readOnly={readOnly}
                        onRemove={onQuotationNotesChange ? handleRemoveNote : undefined}
                        context="demand"
                      />
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
          form.setValue('demand.potentialCustomerId', result.customerId ?? null, {
            shouldDirty: true,
            shouldValidate: true,
          });
          form.setValue('demand.erpCustomerCode', result.erpCustomerCode ?? null, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }}
      />

      <CustomerErpBalanceDialog
        open={customerBalanceDialogOpen}
        onOpenChange={setCustomerBalanceDialogOpen}
        customerId={watchedCustomerId}
        erpCustomerCode={watchedErpCustomerCode}
        customerName={customerDisplayValue}
      />

      {exchangeRates !== undefined && onExchangeRatesChange && (
        <ExchangeRateDialog
          open={exchangeRateDialogOpen}
          onOpenChange={setExchangeRateDialogOpen}
          exchangeRates={exchangeRates}
          onSave={handleExchangeRatesSave}
          lines={lines}
          currentCurrency={watchedCurrency ? (typeof watchedCurrency === 'string' ? Number(watchedCurrency) : watchedCurrency) : undefined}
          onApplyRateChangeToLines={onApplyExchangeRateChangeToLines}
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
          context="demand"
        />
      )}

      <Dialog open={currencyChangeDialogOpen} onOpenChange={setCurrencyChangeDialogOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[425px] rounded-2xl border-slate-200 dark:border-white/10 shadow-2xl backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-pink-600">
              <ArrowRightLeft className="h-5 w-5" />
              {t('demand:header.currencyChange.title')}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {t('demand:header.currencyChange.message')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={handleCurrencyChangeCancel} className="rounded-xl border-slate-200 dark:border-white/10">
              {t('cancel')}
            </Button>
            <Button onClick={handleCurrencyChangeConfirm} className="rounded-xl bg-pink-600 hover:bg-pink-700 text-white shadow-lg shadow-pink-500/20 transition-all">
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
