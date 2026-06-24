import { type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, type FieldErrors, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import {
  useCountryOptionsInfinite,
  useCityOptionsInfinite,
  useDistrictOptionsInfinite,
  useCustomerTypeOptionsInfinite,
} from '@/components/shared/dropdown/useDropdownEntityInfinite';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { customerFormSchema, type CustomerFormData, type CustomerDto } from '../types/customer-types';
import { isZodFieldRequired } from '@/lib/zod-required';
import { useShippingAddressesByCustomer } from '@/features/shipping-address-management/hooks/useShippingAddressesByCustomer';
import { useAuthStore } from '@/stores/auth-store';
import { useSystemSettingsStore } from '@/stores/system-settings-store';
import {
  CONFLICT_API_FIELD_TO_FORM,
  type CustomerDuplicateConflictPayload,
} from '../utils/customer-conflict';
import {
  createEmptyCustomerFormData,
  mapCustomerToFormData,
} from '../utils/customer-form-values';
import {
  buildCustomerInputClassName,
  sanitizeDigitsValue,
  useFieldShake,
} from '../utils/customer-form-ui';
import { calculateCustomerCompletion, getCompletionColorClasses } from '../utils/customer-completion';
import {
  Building2,
  Hash,
  FileText,
  Phone,
  Mail,
  Globe,
  MapPin,
  CreditCard,
  X,
} from 'lucide-react';

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CustomerFormData) => void | Promise<void>;
  customer?: CustomerDto | null;
  isLoading?: boolean;
  conflictState?: CustomerDuplicateConflictPayload | null;
  onConflictDismiss?: () => void;
}

const INPUT_STYLE = `
  h-12 rounded-xl
  bg-slate-50 dark:bg-[#0f0a18]
  border border-slate-200 dark:border-white/10
  text-slate-900 dark:text-white text-sm
  placeholder:text-slate-400 dark:placeholder:text-slate-600
  focus-visible:bg-white dark:focus-visible:bg-[#1a1025]
  focus-visible:border-pink-500 dark:focus-visible:border-pink-500/70
  focus-visible:ring-2 focus-visible:ring-pink-500/10 focus-visible:ring-offset-0
  focus:ring-2 focus:ring-pink-500/10 focus:ring-offset-0 focus:border-pink-500
  transition-all duration-200
`;

const LABEL_STYLE =
  'text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1 mb-2 flex items-center gap-2';

const CRM_NS = 'customer-management';

export function CustomerForm({
  open,
  onOpenChange,
  onSubmit,
  customer,
  isLoading = false,
  conflictState = null,
  onConflictDismiss: _onConflictDismiss,
}: CustomerFormProps): ReactElement {
  const { t } = useTranslation(['customer-management', 'common']);
  const tf = useCallback(
    (key: string, options?: Record<string, unknown>): string =>
      t(`form.${key}`, { ns: CRM_NS, ...options }),
    [t]
  );
  const branch = useAuthStore((state) => state.branch);
  const systemSettings = useSystemSettingsStore((state) => state.settings);
  const { data: shippingAddresses = [] } = useShippingAddressesByCustomer(customer?.id ?? 0);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const isCreateMode = !customer;
  const { triggerShake, isShaking } = useFieldShake();
  const [countrySearchTerm, setCountrySearchTerm] = useState('');
  const [citySearchTerm, setCitySearchTerm] = useState('');
  const [districtSearchTerm, setDistrictSearchTerm] = useState('');
  const [customerTypeSearchTerm, setCustomerTypeSearchTerm] = useState('');
  const customerCodeRuleDescription = useMemo(() => {
    if (!systemSettings.customerCodeRuleEnabled || !systemSettings.customerCodeMask) {
      return null;
    }

    const parts = [
      `Format: ${systemSettings.customerCodeMask}`,
      systemSettings.customerCodeExample ? `Örnek: ${systemSettings.customerCodeExample}` : null,
      systemSettings.customerCodeErrorMessage ? `Uyarı: ${systemSettings.customerCodeErrorMessage}` : null,
    ].filter(Boolean);

    return `${parts.join(' · ')} · 9=rakam, A=harf, X=harf/rakam.`;
  }, [
    systemSettings.customerCodeErrorMessage,
    systemSettings.customerCodeExample,
    systemSettings.customerCodeMask,
    systemSettings.customerCodeRuleEnabled,
  ]);

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema) as Resolver<CustomerFormData>,
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: createEmptyCustomerFormData(branch?.code),
  });

  const selectedCountryId = form.watch('countryId');
  const selectedCityId = form.watch('cityId');

  const blockUntilNameFilled = useCallback(
    (_fieldName?: keyof CustomerFormData): boolean => {

      return false;
    },
    []
  );

  const handleDigitsFieldChange = useCallback(
    (
      fieldName: 'taxNumber' | 'tcknNumber' | 'phone' | 'phone2',
      rawValue: string,
      maxLength: number,
      overflowMessage: string,
      onChange: (value: string) => void
    ): void => {
      const { next, overflowAttempt } = sanitizeDigitsValue(rawValue, maxLength);
      onChange(next);

      if (overflowAttempt) {
        form.setError(fieldName, { type: 'manual', message: overflowMessage });
        triggerShake(fieldName);
        void form.trigger(fieldName);
        return;
      }

      if (form.formState.errors[fieldName]?.type === 'manual') {
        form.clearErrors(fieldName);
        void form.trigger(fieldName);
      }
    },
    [form, triggerShake]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextValues = customer
      ? mapCustomerToFormData(customer, branch?.code)
      : createEmptyCustomerFormData(branch?.code);

    form.reset(nextValues);

  }, [open, customer?.id, branch?.code, form, isCreateMode, customer]);

  useEffect(() => {
    if (!conflictState) {
      return;
    }

    let firstConflictField: keyof CustomerFormData | undefined;

    conflictState.conflicts.forEach((conflict) => {
      const formField = CONFLICT_API_FIELD_TO_FORM[conflict.field];
      if (!formField) {
        return;
      }

      if (!firstConflictField) {
        firstConflictField = formField;
      }

      const conflictMessage = tf(`conflict.${conflict.field}`, {
        defaultValue: tf('conflictFieldError'),
        customerName: conflict.customerName,
        customerId: conflict.customerId,
      });

      form.setError(formField, { type: 'server', message: conflictMessage });
      triggerShake(formField);
    });

    if (firstConflictField) {
      form.setFocus(firstConflictField);
    }
  }, [conflictState, form, tf, triggerShake]);

  const countryDropdown = useCountryOptionsInfinite(countrySearchTerm, open);
  const cityDropdown = useCityOptionsInfinite(citySearchTerm, open, selectedCountryId ?? undefined);
  const districtDropdown = useDistrictOptionsInfinite(districtSearchTerm, open, selectedCityId ?? undefined);
  const customerTypeDropdown = useCustomerTypeOptionsInfinite(customerTypeSearchTerm, open);

  const handleSubmit = async (data: CustomerFormData): Promise<void> => {
    if (blockUntilNameFilled()) {
      return;
    }
    await onSubmit(data);
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  const handleInvalidSubmit = (errors: FieldErrors<CustomerFormData>): void => {
    const fieldNames = Object.keys(errors) as (keyof CustomerFormData)[];
    fieldNames.forEach((fieldName) => triggerShake(fieldName));

    const firstField = fieldNames[0];
    if (firstField) {
      form.setFocus(firstField);
    }
  };

  const formValues = form.watch();

  const completionPercentage = calculateCustomerCompletion(formValues);
  const completionColors = getCompletionColorClasses(completionPercentage);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white !max-w-[900px] w-[95%] sm:w-full shadow-2xl sm:rounded-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex flex-col gap-5 sticky top-0 z-10 backdrop-blur-md bg-white/95 dark:bg-[#130822]/95">
          <div className="flex flex-row items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-pink-500 to-orange-500 flex items-center justify-center shadow-lg shadow-pink-500/20 shrink-0">
                <Building2 size={24} className="text-white" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  {customer
                    ? tf('editCustomer')
                    : tf('addCustomer')}
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
                  {customer
                    ? tf('editDescription')
                    : tf('addDescription')}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="group h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-pink-500 hover:text-white transition-all duration-300 hover:scale-110 shadow-sm shrink-0"
            >
              <X size={20} className="relative z-10" />
            </Button>
          </div>

          <div className="w-full">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
              <span>{t('completion', { defaultValue: 'Doluluk Oranı' })}</span>
              <span className={completionColors.text}>{completionPercentage}%</span>
            </div>
            <div className="h-2.5 sm:h-3 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full transition-all duration-500 ease-out rounded-full ${completionColors.bg} ${completionColors.shadow}`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <Form {...form}>
            <form id="customer-form" onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField control={form.control} name="name" render={({ field, fieldState }) => (
                  <FormItem className="col-span-1 sm:col-span-2">
                    <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(customerFormSchema, 'name')}><Building2 size={16} className="text-pink-500" />{tf('name')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        ref={(node) => {
                          field.ref(node);
                          nameInputRef.current = node;
                        }}
                        className={buildCustomerInputClassName(INPUT_STYLE, !!fieldState.error, isShaking('name'))}
                        placeholder={tf('namePlaceholder')}
                        onChange={(event) => {
                          field.onChange(event);
                          if (event.target.value.trim()) {
                            form.clearErrors('name');
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="customerCode" render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><Hash size={16} className="text-pink-500" />{tf('code')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        className={buildCustomerInputClassName(INPUT_STYLE, !!fieldState.error, isShaking('customerCode'))}
                        placeholder={tf('customerCodePlaceholder')}
                        onFocus={() => blockUntilNameFilled('customerCode')}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-slate-500 dark:text-slate-400">
                      {tf('customerCodeHint')}
                      {customerCodeRuleDescription ? (
                        <span className="mt-1 block text-pink-600 dark:text-pink-300">
                          {customerCodeRuleDescription}
                        </span>
                      ) : null}
                    </FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="customerTypeId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><Building2 size={16} className="text-pink-500" />{tf('customerType')}</FormLabel>
                    <VoiceSearchCombobox
                      options={customerTypeDropdown.options}
                      value={field.value ? String(field.value) : ''}
                      onSelect={(value) => field.onChange(value ? Number(value) : undefined)}
                      onDebouncedSearchChange={setCustomerTypeSearchTerm}
                      onFetchNextPage={customerTypeDropdown.fetchNextPage}
                      hasNextPage={customerTypeDropdown.hasNextPage}
                      isLoading={customerTypeDropdown.isLoading}
                      isFetchingNextPage={customerTypeDropdown.isFetchingNextPage}
                      placeholder={tf('customerTypePlaceholder')}
                      searchPlaceholder={t('common.search')}
                      className={INPUT_STYLE}
                    />
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="taxNumber" render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><FileText size={16} className="text-pink-500" />{tf('taxNumber')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        inputMode="numeric"
                        autoComplete="off"
                        value={field.value || ''}
                        className={buildCustomerInputClassName(INPUT_STYLE, !!fieldState.error, isShaking('taxNumber'))}
                        placeholder={tf('taxNumberPlaceholder')}
                        onFocus={() => blockUntilNameFilled('taxNumber')}
                        onChange={(event) =>
                          handleDigitsFieldChange(
                            'taxNumber',
                            event.target.value,
                            10,
                            tf('taxNumberExactLength'),
                            field.onChange
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="taxOffice" render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><FileText size={16} className="text-pink-500" />{tf('taxOffice')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        className={buildCustomerInputClassName(INPUT_STYLE, !!fieldState.error, isShaking('taxOffice'))}
                        placeholder={tf('taxOfficePlaceholderExample')}
                        onFocus={() => blockUntilNameFilled('taxOffice')}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="tcknNumber" render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><FileText size={16} className="text-pink-500" />{tf('tcknNumber')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        inputMode="numeric"
                        autoComplete="off"
                        value={field.value || ''}
                        className={buildCustomerInputClassName(INPUT_STYLE, !!fieldState.error, isShaking('tcknNumber'))}
                        placeholder={tf('tcknPlaceholderExample')}
                        onFocus={() => blockUntilNameFilled('tcknNumber')}
                        onChange={(event) =>
                          handleDigitsFieldChange(
                            'tcknNumber',
                            event.target.value,
                            11,
                            tf('tcknNumberExactLength'),
                            field.onChange
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="email" render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><Mail size={16} className="text-pink-500" />{tf('email')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        autoComplete="email"
                        value={field.value || ''}
                        className={buildCustomerInputClassName(INPUT_STYLE, !!fieldState.error, isShaking('email'))}
                        placeholder={tf('emailPlaceholderExample')}
                        onFocus={() => blockUntilNameFilled('email')}
                        onChange={(event) => {
                          field.onChange(event.target.value);
                          if (form.formState.errors.email?.type === 'server') {
                            form.clearErrors('email');
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="website" render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><Globe size={16} className="text-pink-500" />{tf('website')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        className={buildCustomerInputClassName(INPUT_STYLE, !!fieldState.error, isShaking('website'))}
                        placeholder={tf('websitePlaceholderExample')}
                        onFocus={() => blockUntilNameFilled('website')}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="phone" render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><Phone size={16} className="text-pink-500" />{tf('phone')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        inputMode="numeric"
                        autoComplete="tel"
                        value={field.value || ''}
                        className={buildCustomerInputClassName(INPUT_STYLE, !!fieldState.error, isShaking('phone'))}
                        placeholder={tf('phonePlaceholderExample')}
                        onFocus={() => blockUntilNameFilled('phone')}
                        onChange={(event) =>
                          handleDigitsFieldChange(
                            'phone',
                            event.target.value,
                            20,
                            tf('phoneMaxLength'),
                            field.onChange
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="phone2" render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><Phone size={16} className="text-pink-500" />{tf('phone2')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        inputMode="numeric"
                        autoComplete="tel"
                        value={field.value || ''}
                        className={buildCustomerInputClassName(INPUT_STYLE, !!fieldState.error, isShaking('phone2'))}
                        placeholder={tf('phone2PlaceholderExample')}
                        onFocus={() => blockUntilNameFilled('phone2')}
                        onChange={(event) =>
                          handleDigitsFieldChange(
                            'phone2',
                            event.target.value,
                            20,
                            tf('phone2MaxLength'),
                            field.onChange
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="countryId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><MapPin size={16} className="text-pink-500" />{tf('country')}</FormLabel>
                    <VoiceSearchCombobox
                      options={countryDropdown.options}
                      value={field.value ? String(field.value) : ''}
                      onSelect={(value) => {
                        field.onChange(value ? Number(value) : undefined);
                        form.setValue('cityId', undefined);
                        form.setValue('districtId', undefined);
                      }}
                      onDebouncedSearchChange={setCountrySearchTerm}
                      onFetchNextPage={countryDropdown.fetchNextPage}
                      hasNextPage={countryDropdown.hasNextPage}
                      isLoading={countryDropdown.isLoading}
                      isFetchingNextPage={countryDropdown.isFetchingNextPage}
                      placeholder={tf('countryPlaceholder')}
                      searchPlaceholder={t('common.search')}
                      className={INPUT_STYLE}
                    />
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="cityId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><MapPin size={16} className="text-pink-500" />{tf('city')}</FormLabel>
                    <VoiceSearchCombobox
                      options={cityDropdown.options}
                      value={field.value ? String(field.value) : ''}
                      onSelect={(value) => {
                        field.onChange(value ? Number(value) : undefined);
                        form.setValue('districtId', undefined);
                      }}
                      onDebouncedSearchChange={setCitySearchTerm}
                      onFetchNextPage={cityDropdown.fetchNextPage}
                      hasNextPage={cityDropdown.hasNextPage}
                      isLoading={cityDropdown.isLoading}
                      isFetchingNextPage={cityDropdown.isFetchingNextPage}
                      placeholder={tf('cityPlaceholder')}
                      searchPlaceholder={t('common.search')}
                      className={INPUT_STYLE}
                      disabled={!selectedCountryId}
                    />
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="districtId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><MapPin size={16} className="text-pink-500" />{tf('district')}</FormLabel>
                    <VoiceSearchCombobox
                      options={districtDropdown.options}
                      value={field.value ? String(field.value) : ''}
                      onSelect={(value) => field.onChange(value ? Number(value) : undefined)}
                      onDebouncedSearchChange={setDistrictSearchTerm}
                      onFetchNextPage={districtDropdown.fetchNextPage}
                      hasNextPage={districtDropdown.hasNextPage}
                      isLoading={districtDropdown.isLoading}
                      isFetchingNextPage={districtDropdown.isFetchingNextPage}
                      placeholder={tf('districtPlaceholder')}
                      searchPlaceholder={t('common.search')}
                      className={INPUT_STYLE}
                      disabled={!selectedCityId}
                    />
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="postalCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><MapPin size={16} className="text-pink-500" />{tf('postalCode')}</FormLabel>
                    <FormControl><Input {...field} value={field.value || ''} className={INPUT_STYLE} placeholder={tf('postalCodePlaceholder')} /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="creditLimit" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><CreditCard size={16} className="text-pink-500" />{tf('creditLimit')}</FormLabel>
                    <FormControl><Input type="number" {...field} value={field.value ?? 0} onChange={(e) => field.onChange(e.target.valueAsNumber || 0)} className={INPUT_STYLE} /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="groupCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><Hash size={16} className="text-pink-500" />{tf('groupCode')}</FormLabel>
                    <FormControl><Input {...field} value={field.value || ''} className={INPUT_STYLE} placeholder={tf('groupCodePlaceholder')} /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="accountingCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><Hash size={16} className="text-pink-500" />{tf('accountingCode')}</FormLabel>
                    <FormControl><Input {...field} value={field.value || ''} className={INPUT_STYLE} placeholder={tf('accountingCodePlaceholder')} /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="defaultShippingAddressId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><MapPin size={16} className="text-pink-500" />{tf('defaultShippingAddress')}</FormLabel>
                    <Select onValueChange={(value) => { const numericValue = Number(value); field.onChange(numericValue > 0 ? numericValue : null); }} value={field.value ? String(field.value) : ''} disabled={!customer?.id}>
                      <FormControl><SelectTrigger className={`${INPUT_STYLE} justify-between px-4`}><SelectValue placeholder={tf('selectDefaultShippingAddress')} /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="0">{tf('none')}</SelectItem>
                        {shippingAddresses.map((address) => <SelectItem key={address.id} value={String(address.id)}>{address.name || address.address}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem className="col-span-1 sm:col-span-2">
                    <FormLabel className={LABEL_STYLE}><MapPin size={16} className="text-pink-500" />{tf('address')}</FormLabel>
                    <FormControl><Textarea {...field} value={field.value || ''} className={`${INPUT_STYLE} min-h-[100px] h-auto py-3 resize-none`} placeholder={tf('addressPlaceholder')} /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem className="col-span-1 sm:col-span-2">
                    <FormLabel className={LABEL_STYLE}><FileText size={16} className="text-pink-500" />{tf('notes')}</FormLabel>
                    <FormControl><Textarea {...field} value={field.value || ''} className={`${INPUT_STYLE} min-h-[90px] h-auto py-3 resize-none`} placeholder={tf('notesPlaceholder')} /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />
              </div>
            </form>
          </Form>
        </div>

        <DialogFooter className="px-6 py-5 border-t border-slate-100 dark:border-white/5 flex-col sm:flex-row gap-3 sticky bottom-0 z-10 backdrop-blur-md bg-white/95 dark:bg-[#130822]/95">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto h-12 rounded-xl border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold transition-all"
          >
            {tf('cancel')}
          </Button>
          <Button
            type="submit"
            form="customer-form"
            disabled={isLoading}
            className="w-full sm:w-auto h-12 px-8 bg-linear-to-r from-pink-600 to-orange-600 hover:from-pink-500 hover:to-orange-500 text-white font-black rounded-xl shadow-lg shadow-pink-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border-0 opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
          >
            {isLoading ? tf('saving') : tf('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
