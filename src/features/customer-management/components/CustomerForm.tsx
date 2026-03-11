import { type ReactElement, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
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
} from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { customerFormSchema, type CustomerFormData, type CustomerDto } from '../types/customer-types';
import { isZodFieldRequired } from '@/lib/zod-required';
import { useShippingAddressesByCustomer } from '@/features/shipping-address-management/hooks/useShippingAddressesByCustomer';
import type { CustomerDuplicateConflictPayload } from '../utils/customer-conflict';
import {
  AlertTriangle,
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

export function CustomerForm({
  open,
  onOpenChange,
  onSubmit,
  customer,
  isLoading = false,
  conflictState = null,
  onConflictDismiss,
}: CustomerFormProps): ReactElement {
  const { t } = useTranslation();
  const { data: shippingAddresses = [] } = useShippingAddressesByCustomer(customer?.id ?? 0);
  const [countrySearchTerm, setCountrySearchTerm] = useState('');
  const [citySearchTerm, setCitySearchTerm] = useState('');
  const [districtSearchTerm, setDistrictSearchTerm] = useState('');
  const [customerTypeSearchTerm, setCustomerTypeSearchTerm] = useState('');

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      customerCode: '',
      email: '',
      phone: '',
      phone2: '',
      address: '',
      taxNumber: '',
      taxOffice: '',
      tcknNumber: '',
      website: '',
      notes: '',
      salesRepCode: '',
      groupCode: '',
      creditLimit: 0,
      defaultShippingAddressId: null,
      branchCode: 0,
      businessUnitCode: 0,
      countryId: undefined,
      cityId: undefined,
      districtId: undefined,
      customerTypeId: undefined,
      isCompleted: false,
    },
  });
  const isFormValid = form.formState.isValid;

  const selectedCountryId = form.watch('countryId');
  const selectedCityId = form.watch('cityId');

  useEffect(() => {
    form.clearErrors(['taxNumber', 'tcknNumber', 'customerCode']);

    if (!conflictState) {
      return;
    }

    const fieldMessage = t('customerManagement.form.conflictFieldError');
    const conflictFields = new Set(conflictState.conflicts.map((conflict) => conflict.field));

    if (conflictFields.has('TaxNumber')) {
      form.setError('taxNumber', { type: 'server', message: fieldMessage });
    }

    if (conflictFields.has('TcknNumber')) {
      form.setError('tcknNumber', { type: 'server', message: fieldMessage });
    }

    if (conflictFields.has('CustomerCode')) {
      form.setError('customerCode', { type: 'server', message: fieldMessage });
    }
  }, [conflictState, form, t]);

  const countryDropdown = useCountryOptionsInfinite(countrySearchTerm, open);
  const cityDropdown = useCityOptionsInfinite(citySearchTerm, open, selectedCountryId ?? undefined);
  const districtDropdown = useDistrictOptionsInfinite(districtSearchTerm, open, selectedCityId ?? undefined);
  const customerTypeDropdown = useCustomerTypeOptionsInfinite(customerTypeSearchTerm, open);

  useEffect(() => {
    onConflictDismiss?.();

    if (customer) {
      form.reset({
        name: customer.name || '',
        customerCode: customer.customerCode ?? '',
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        phone2: customer.phone2 ?? '',
        address: customer.address ?? '',
        taxNumber: customer.taxNumber ?? '',
        taxOffice: customer.taxOffice ?? '',
        tcknNumber: customer.tcknNumber ?? '',
        website: customer.website ?? '',
        notes: customer.notes ?? '',
        salesRepCode: customer.salesRepCode ?? '',
        groupCode: customer.groupCode ?? '',
        creditLimit: customer.creditLimit ?? 0,
        defaultShippingAddressId: customer.defaultShippingAddressId ?? null,
        branchCode: customer.branchCode ?? 0,
        businessUnitCode: customer.businessUnitCode ?? 0,
        countryId: customer.countryId ?? undefined,
        cityId: customer.cityId ?? undefined,
        districtId: customer.districtId ?? undefined,
        customerTypeId: customer.customerTypeId ?? undefined,
        isCompleted: false,
      });
      return;
    }

    form.reset({
      name: '',
      customerCode: '',
      email: '',
      phone: '',
      phone2: '',
      address: '',
      taxNumber: '',
      taxOffice: '',
      tcknNumber: '',
      website: '',
      notes: '',
      salesRepCode: '',
      groupCode: '',
      creditLimit: 0,
      defaultShippingAddressId: null,
      branchCode: 0,
      businessUnitCode: 0,
      countryId: undefined,
      cityId: undefined,
      districtId: undefined,
      customerTypeId: undefined,
      isCompleted: false,
    });
  }, [customer, form, onConflictDismiss]);

  const getConflictFieldLabel = (field: string): string => {
    switch (field) {
      case 'TaxNumber':
        return t('customerManagement.form.taxNumber');
      case 'TcknNumber':
        return t('customerManagement.form.tcknNumber');
      case 'CustomerCode':
        return t('customerManagement.form.customerCode');
      default:
        return field;
    }
  };

  const handleSubmit = async (data: CustomerFormData): Promise<void> => {
    await onSubmit(data);
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  const handleInvalidSubmit = (): void => {
    toast.error('Hata', {
      description: 'Zorunlu alanlar doldurulmadı.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white max-w-4xl w-[95%] sm:w-full shadow-2xl sm:rounded-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 flex flex-row items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20">
              <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[14px] flex items-center justify-center">
                <Building2 size={24} className="text-pink-600 dark:text-pink-500" />
              </div>
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {customer
                  ? t('customerManagement.form.editCustomer')
                  : t('customerManagement.form.addCustomer')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
                {customer
                  ? t('customerManagement.form.editDescription')
                  : t('customerManagement.form.addDescription')}
              </DialogDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full">
            <X size={20} />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <Form {...form}>
            <form id="customer-form" onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)} className="space-y-6">
              {conflictState && (
                <Alert variant="destructive" className="border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{t('customerManagement.form.conflictTitle')}</AlertTitle>
                  <AlertDescription>
                    <p className="mb-3">{t('customerManagement.form.conflictDescription')}</p>
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {conflictState.conflicts.map((conflict) => (
                        <li key={`${conflict.customerId}-${conflict.field}-${conflict.value}`}>
                          {t('customerManagement.form.conflictItem', {
                            customerName: conflict.customerName,
                            customerId: conflict.customerId,
                            field: getConflictFieldLabel(conflict.field),
                            value: conflict.value,
                            branchCode: conflict.branchCode ?? '-',
                          })}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="col-span-1 sm:col-span-2">
                    <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(customerFormSchema, 'name')}><Building2 size={16} className="text-pink-500" />{t('customerManagement.form.name')}</FormLabel>
                    <FormControl><Input {...field} className={INPUT_STYLE} placeholder={t('customerManagement.form.namePlaceholder')} /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="customerCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><Hash size={16} className="text-pink-500" />{t('customerManagement.form.code')}</FormLabel>
                    <FormControl><Input {...field} value={field.value || ''} className={INPUT_STYLE} placeholder={t('customerManagement.form.customerCodePlaceholder')} /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="customerTypeId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><Building2 size={16} className="text-pink-500" />{t('customerManagement.form.customerType')}</FormLabel>
                    <VoiceSearchCombobox
                      options={customerTypeDropdown.options}
                      value={field.value ? String(field.value) : ''}
                      onSelect={(value) => field.onChange(value ? Number(value) : undefined)}
                      onDebouncedSearchChange={setCustomerTypeSearchTerm}
                      onFetchNextPage={customerTypeDropdown.fetchNextPage}
                      hasNextPage={customerTypeDropdown.hasNextPage}
                      isLoading={customerTypeDropdown.isLoading}
                      isFetchingNextPage={customerTypeDropdown.isFetchingNextPage}
                      placeholder={t('customerManagement.form.customerTypePlaceholder')}
                      searchPlaceholder={t('common.search')}
                      className={INPUT_STYLE}
                    />
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="taxNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><FileText size={16} className="text-pink-500" />{t('customerManagement.form.taxNumber')}</FormLabel>
                    <FormControl><Input {...field} maxLength={10} value={field.value || ''} className={INPUT_STYLE} placeholder={t('customerManagement.form.taxNumberPlaceholder')} /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="taxOffice" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><FileText size={16} className="text-pink-500" />{t('customerManagement.form.taxOffice')}</FormLabel>
                    <FormControl><Input {...field} value={field.value || ''} className={INPUT_STYLE} placeholder="Vergi dairesi..." /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="tcknNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><FileText size={16} className="text-pink-500" />{t('customerManagement.form.tcknNumber')}</FormLabel>
                    <FormControl><Input {...field} maxLength={11} value={field.value || ''} className={INPUT_STYLE} placeholder="TCKN..." /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><Mail size={16} className="text-pink-500" />{t('customerManagement.form.email')}</FormLabel>
                    <FormControl><Input {...field} value={field.value || ''} className={INPUT_STYLE} placeholder="ornek@sirket.com" /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><Globe size={16} className="text-pink-500" />{t('customerManagement.form.website')}</FormLabel>
                    <FormControl><Input {...field} value={field.value || ''} className={INPUT_STYLE} placeholder="www.sirket.com" /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><Phone size={16} className="text-pink-500" />{t('customerManagement.form.phone')}</FormLabel>
                    <FormControl><Input {...field} value={field.value || ''} className={INPUT_STYLE} placeholder="0555..." /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="phone2" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><Phone size={16} className="text-pink-500" />{t('customerManagement.form.phone2')}</FormLabel>
                    <FormControl><Input {...field} value={field.value || ''} className={INPUT_STYLE} placeholder="Alternatif telefon..." /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="countryId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><MapPin size={16} className="text-pink-500" />{t('customerManagement.form.country')}</FormLabel>
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
                      placeholder={t('customerManagement.form.countryPlaceholder')}
                      searchPlaceholder={t('common.search')}
                      className={INPUT_STYLE}
                    />
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="cityId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><MapPin size={16} className="text-pink-500" />{t('customerManagement.form.city')}</FormLabel>
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
                      placeholder={t('customerManagement.form.cityPlaceholder')}
                      searchPlaceholder={t('common.search')}
                      className={INPUT_STYLE}
                      disabled={!selectedCountryId}
                    />
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="districtId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><MapPin size={16} className="text-pink-500" />{t('customerManagement.form.district')}</FormLabel>
                    <VoiceSearchCombobox
                      options={districtDropdown.options}
                      value={field.value ? String(field.value) : ''}
                      onSelect={(value) => field.onChange(value ? Number(value) : undefined)}
                      onDebouncedSearchChange={setDistrictSearchTerm}
                      onFetchNextPage={districtDropdown.fetchNextPage}
                      hasNextPage={districtDropdown.hasNextPage}
                      isLoading={districtDropdown.isLoading}
                      isFetchingNextPage={districtDropdown.isFetchingNextPage}
                      placeholder={t('customerManagement.form.districtPlaceholder')}
                      searchPlaceholder={t('common.search')}
                      className={INPUT_STYLE}
                      disabled={!selectedCityId}
                    />
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="creditLimit" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><CreditCard size={16} className="text-pink-500" />{t('customerManagement.form.creditLimit')}</FormLabel>
                    <FormControl><Input type="number" {...field} value={field.value ?? 0} onChange={(e) => field.onChange(e.target.valueAsNumber || 0)} className={INPUT_STYLE} /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="salesRepCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><Hash size={16} className="text-pink-500" />{t('customerManagement.form.salesRepCode')}</FormLabel>
                    <FormControl><Input {...field} value={field.value || ''} className={INPUT_STYLE} placeholder={t('customerManagement.form.salesRepCodePlaceholder', { defaultValue: 'Satış temsilci kodu...' })} /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="groupCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><Hash size={16} className="text-pink-500" />{t('customerManagement.form.groupCode')}</FormLabel>
                    <FormControl><Input {...field} value={field.value || ''} className={INPUT_STYLE} placeholder="Grup kodu..." /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="branchCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(customerFormSchema, 'branchCode')}><Hash size={16} className="text-pink-500" />{t('customerManagement.form.branchCode.label')}</FormLabel>
                    <FormControl><Input type="number" {...field} value={field.value ?? 0} onChange={(e) => field.onChange(Number(e.target.value || 0))} className={INPUT_STYLE} /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="businessUnitCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(customerFormSchema, 'businessUnitCode')}><Hash size={16} className="text-pink-500" />{t('customerManagement.form.businessUnitCode.label')}</FormLabel>
                    <FormControl><Input type="number" {...field} value={field.value ?? 0} onChange={(e) => field.onChange(Number(e.target.value || 0))} className={INPUT_STYLE} /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="defaultShippingAddressId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><MapPin size={16} className="text-pink-500" />{t('customerManagement.form.defaultShippingAddress')}</FormLabel>
                    <Select onValueChange={(value) => { const numericValue = Number(value); field.onChange(numericValue > 0 ? numericValue : null); }} value={field.value ? String(field.value) : ''} disabled={!customer?.id}>
                      <FormControl><SelectTrigger className={`${INPUT_STYLE} justify-between px-4`}><SelectValue placeholder={t('customerManagement.form.selectDefaultShippingAddress')} /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="0">{t('customerManagement.form.none')}</SelectItem>
                        {shippingAddresses.map((address) => <SelectItem key={address.id} value={String(address.id)}>{address.name || address.address}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem className="col-span-1 sm:col-span-2">
                    <FormLabel className={LABEL_STYLE}><MapPin size={16} className="text-pink-500" />{t('customerManagement.form.address')}</FormLabel>
                    <FormControl><Textarea {...field} value={field.value || ''} className={`${INPUT_STYLE} min-h-[100px] h-auto py-3 resize-none`} placeholder={t('customerManagement.form.addressPlaceholder')} /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem className="col-span-1 sm:col-span-2">
                    <FormLabel className={LABEL_STYLE}><FileText size={16} className="text-pink-500" />{t('customerManagement.form.notes')}</FormLabel>
                    <FormControl><Textarea {...field} value={field.value || ''} className={`${INPUT_STYLE} min-h-[90px] h-auto py-3 resize-none`} placeholder={t('customerManagement.form.notesPlaceholder')} /></FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />
              </div>
            </form>
          </Form>
        </div>

        <DialogFooter className="px-6 py-5 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 flex-col sm:flex-row gap-3 sticky bottom-0 z-10 backdrop-blur-sm">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="w-full sm:w-auto h-11 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5">
            {t('customerManagement.form.cancel')}
          </Button>
          <Button type="submit" form="customer-form" disabled={isLoading || !isFormValid} className="w-full sm:w-auto h-11 bg-linear-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white font-semibold shadow-md hover:shadow-lg transition-all">
            {isLoading ? t('customerManagement.form.saving') : t('customerManagement.form.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
