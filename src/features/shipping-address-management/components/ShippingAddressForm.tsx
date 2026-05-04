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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import {
  useCustomerOptionsInfinite,
  useCountryOptionsInfinite,
  useCityOptionsInfinite,
  useDistrictOptionsInfinite,
} from '@/components/shared/dropdown/useDropdownEntityInfinite';
import { shippingAddressFormSchema, type ShippingAddressFormSchema } from '../types/shipping-address-types';
import type { ShippingAddressDto } from '../types/shipping-address-types';
import { MapPin, Loader2, User, Phone, FileText, Hash, Globe, Building, X } from 'lucide-react';
import { isZodFieldRequired } from '@/lib/zod-required';

interface ShippingAddressFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ShippingAddressFormSchema) => void | Promise<void>;
  shippingAddress?: ShippingAddressDto | null;
  isLoading?: boolean;
}

const INPUT_STYLE = `
  h-12 rounded-xl
  bg-slate-50 dark:bg-[#0c0516]
  border border-slate-200 dark:border-white/10
  text-slate-900 dark:text-white text-sm
  placeholder:text-slate-400 dark:placeholder:text-slate-600
  focus-visible:ring-0 focus-visible:ring-offset-0
  focus:bg-white focus:border-pink-500 focus:shadow-[0_0_0_3px_rgba(236,72,153,0.15)]
  dark:focus:bg-[#0c0516] dark:focus:border-pink-500/60 dark:focus:shadow-[0_0_0_3px_rgba(236,72,153,0.1)]
  transition-all duration-200
`;

const LABEL_STYLE =
  'text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1 mb-1.5 flex items-center gap-1.5';

export function ShippingAddressForm({
  open,
  onOpenChange,
  onSubmit,
  shippingAddress,
  isLoading = false,
}: ShippingAddressFormProps): ReactElement {
  const { t } = useTranslation();
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [countrySearchTerm, setCountrySearchTerm] = useState('');
  const [citySearchTerm, setCitySearchTerm] = useState('');
  const [districtSearchTerm, setDistrictSearchTerm] = useState('');

  const form = useForm<ShippingAddressFormSchema>({
    resolver: zodResolver(shippingAddressFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      address: '',
      postalCode: '',
      contactPerson: '',
      phone: '',
      notes: '',
      customerId: 0,
      countryId: undefined,
      cityId: undefined,
      districtId: undefined,
      isDefault: false,
      isActive: true,
    },
  });
  const isFormValid = form.formState.isValid;

  const watchedCountryId = form.watch('countryId');
  const watchedCityId = form.watch('cityId');

  const customerDropdown = useCustomerOptionsInfinite(customerSearchTerm, open);
  const countryDropdown = useCountryOptionsInfinite(countrySearchTerm, open);
  const cityDropdown = useCityOptionsInfinite(citySearchTerm, open, watchedCountryId ?? undefined);
  const districtDropdown = useDistrictOptionsInfinite(districtSearchTerm, open, watchedCityId ?? undefined);

  useEffect(() => {
    if (shippingAddress) {
      form.reset({
        name: shippingAddress.name || '',
        address: shippingAddress.address,
        postalCode: shippingAddress.postalCode || '',
        contactPerson: shippingAddress.contactPerson || '',
        phone: shippingAddress.phone || '',
        notes: shippingAddress.notes || '',
        customerId: shippingAddress.customerId,
        countryId: shippingAddress.countryId || undefined,
        cityId: shippingAddress.cityId || undefined,
        districtId: shippingAddress.districtId || undefined,
        isDefault: shippingAddress.isDefault || false,
        isActive: shippingAddress.isActive ?? false,
      });
    } else {
      form.reset({
        name: '',
        address: '',
        postalCode: '',
        contactPerson: '',
        phone: '',
        notes: '',
        customerId: undefined,
        countryId: undefined,
        cityId: undefined,
        districtId: undefined,
        isDefault: false,
        isActive: true,
      });
    }
  }, [shippingAddress, form]);

  useEffect(() => {
    if (!watchedCountryId) {
      form.setValue('cityId', undefined);
      form.setValue('districtId', undefined);
    }
  }, [watchedCountryId, form]);

  useEffect(() => {
    if (!watchedCityId) {
      form.setValue('districtId', undefined);
    }
  }, [watchedCityId, form]);

  const handleSubmit = async (data: ShippingAddressFormSchema): Promise<void> => {
    await onSubmit(data);
    if (!isLoading) {
      form.reset();
      onOpenChange(false);
    }
  };

  const handleInvalidSubmit = (): void => {
    toast.error(t('common.error'), {
      description: t('common.form.requiredFields'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[96vw] xl:max-w-[900px] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white/90 dark:bg-[#130822]/90 border border-slate-200/60 dark:border-white/10 shadow-2xl rounded-[2.5rem]">

        <DialogHeader className="px-6 sm:px-8 py-6 border-b border-slate-100 dark:border-white/5 shrink-0 flex-row items-center justify-between space-y-0 sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20">
              <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[14px] flex items-center justify-center">
                <MapPin size={24} className="text-pink-600 dark:text-pink-400" />
              </div>
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                {shippingAddress
                  ? t('shippingAddressManagement.edit')
                  : t('shippingAddressManagement.create')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                {shippingAddress
                  ? t('shippingAddressManagement.editDescription')
                  : t('shippingAddressManagement.createDescription')}
              </DialogDescription>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="group relative h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-pink-500 hover:text-white transition-all duration-300 hover:rotate-90 shadow-sm"
          >
            <X size={20} className="relative z-10" />
            <div className="absolute inset-0 rounded-full bg-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <Form {...form}>
            <form id="shipping-address-form" onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(shippingAddressFormSchema, 'customerId')}>
                      <User size={11} className="text-pink-500 shrink-0" />
                      {t('shippingAddressManagement.customerId')}
                    </FormLabel>
                    <VoiceSearchCombobox
                      options={customerDropdown.options}
                      value={field.value && field.value !== 0 ? field.value.toString() : ''}
                      onSelect={(value) => field.onChange(value && value !== '' ? parseInt(value) : undefined)}
                      onDebouncedSearchChange={setCustomerSearchTerm}
                      onFetchNextPage={customerDropdown.fetchNextPage}
                      hasNextPage={customerDropdown.hasNextPage}
                      isLoading={customerDropdown.isLoading}
                      isFetchingNextPage={customerDropdown.isFetchingNextPage}
                      placeholder={t('shippingAddressManagement.selectCustomer')}
                      searchPlaceholder={t('shippingAddressManagement.searchCustomer')}
                      className={INPUT_STYLE}
                      modal={true}
                    />
                    <FormMessage className="text-red-500 text-[10px] mt-1" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className={LABEL_STYLE}>
                        <FileText size={11} className="text-pink-500 shrink-0" />
                        {t('shippingAddressManagement.name')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('shippingAddressManagement.namePlaceholder')}
                          className={INPUT_STYLE}
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-[10px] mt-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className={LABEL_STYLE}>
                        <User size={11} className="text-blue-500 shrink-0" />
                        {t('shippingAddressManagement.contactPerson')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('shippingAddressManagement.contactPersonPlaceholder')}
                          className={INPUT_STYLE}
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-[10px] mt-1" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(shippingAddressFormSchema, 'address')}>
                      <MapPin size={11} className="text-pink-500 shrink-0" />
                      {t('shippingAddressManagement.address')}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('shippingAddressManagement.addressPlaceholder')}
                        className={`${INPUT_STYLE} h-24 py-3 resize-none rounded-2xl`}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 text-[10px] mt-1" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className={LABEL_STYLE}>
                        <Hash size={11} className="text-pink-500 shrink-0" />
                        {t('shippingAddressManagement.postalCode')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('shippingAddressManagement.postalCodePlaceholder')}
                          className={INPUT_STYLE}
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-[10px] mt-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className={LABEL_STYLE}>
                        <Phone size={11} className="text-green-500 shrink-0" />
                        {t('shippingAddressManagement.phone')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('shippingAddressManagement.phonePlaceholder')}
                          className={INPUT_STYLE}
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-[10px] mt-1" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="countryId"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className={LABEL_STYLE}>
                        <Globe size={11} className="text-purple-500 shrink-0" />
                        {t('shippingAddressManagement.country')}
                      </FormLabel>
                      <VoiceSearchCombobox
                        options={countryDropdown.options}
                        value={field.value ? field.value.toString() : ''}
                        onSelect={(value) => field.onChange(value ? parseInt(value) : undefined)}
                        onDebouncedSearchChange={setCountrySearchTerm}
                        onFetchNextPage={countryDropdown.fetchNextPage}
                        hasNextPage={countryDropdown.hasNextPage}
                        isLoading={countryDropdown.isLoading}
                        isFetchingNextPage={countryDropdown.isFetchingNextPage}
                        placeholder={t('shippingAddressManagement.selectCountry')}
                        searchPlaceholder={t('shippingAddressManagement.searchCountry')}
                        className={INPUT_STYLE}
                        modal={true}
                      />
                      <FormMessage className="text-red-500 text-[10px] mt-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cityId"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className={LABEL_STYLE}>
                        <Building size={11} className="text-orange-500 shrink-0" />
                        {t('shippingAddressManagement.city')}
                      </FormLabel>
                      <VoiceSearchCombobox
                        options={cityDropdown.options}
                        value={field.value ? field.value.toString() : ''}
                        onSelect={(value) => field.onChange(value ? parseInt(value) : undefined)}
                        onDebouncedSearchChange={setCitySearchTerm}
                        onFetchNextPage={cityDropdown.fetchNextPage}
                        hasNextPage={cityDropdown.hasNextPage}
                        isLoading={cityDropdown.isLoading}
                        isFetchingNextPage={cityDropdown.isFetchingNextPage}
                        placeholder={t('shippingAddressManagement.selectCity')}
                        searchPlaceholder={t('shippingAddressManagement.searchCity')}
                        className={INPUT_STYLE}
                        disabled={!watchedCountryId}
                        modal={true}
                      />
                      <FormMessage className="text-red-500 text-[10px] mt-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="districtId"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className={LABEL_STYLE}>
                        <MapPin size={11} className="text-red-500 shrink-0" />
                        {t('shippingAddressManagement.district')}
                      </FormLabel>
                      <VoiceSearchCombobox
                        options={districtDropdown.options}
                        value={field.value ? field.value.toString() : ''}
                        onSelect={(value) => field.onChange(value ? parseInt(value) : undefined)}
                        onDebouncedSearchChange={setDistrictSearchTerm}
                        onFetchNextPage={districtDropdown.fetchNextPage}
                        hasNextPage={districtDropdown.hasNextPage}
                        isLoading={districtDropdown.isLoading}
                        isFetchingNextPage={districtDropdown.isFetchingNextPage}
                        placeholder={t('shippingAddressManagement.selectDistrict')}
                        searchPlaceholder={t('shippingAddressManagement.searchDistrict')}
                        className={INPUT_STYLE}
                        disabled={!watchedCityId}
                        modal={true}
                      />
                      <FormMessage className="text-red-500 text-[10px] mt-1" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE}>
                      <FileText size={11} className="text-slate-400 shrink-0" />
                      {t('shippingAddressManagement.notes')}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('shippingAddressManagement.notesPlaceholder')}
                        className={`${INPUT_STYLE} h-20 py-3 resize-none rounded-2xl`}
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 text-[10px] mt-1" />
                  </FormItem>
                )}
              />

              <div className="flex flex-wrap gap-6 pt-2">
                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 px-4 py-3 transition-colors hover:bg-slate-100 dark:hover:bg-white/10">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="h-5 w-5 rounded-md border-slate-300 text-pink-600 focus:ring-pink-500"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                          {t('shippingAddressManagement.isDefault')}
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />


              </div>
            </form>
          </Form>
        </div>

        <DialogFooter className="px-6 sm:px-8 py-6 border-t border-slate-100 dark:border-white/5 shrink-0 flex flex-row justify-end gap-4 backdrop-blur-sm">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="h-12 px-8 rounded-2xl border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 font-bold transition-all"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form="shipping-address-form"
            disabled={isLoading || !isFormValid}
            className="h-12 px-10 rounded-2xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-black shadow-lg shadow-pink-500/20 ring-1 ring-pink-400/30 transition-all duration-300 hover:scale-[1.05] hover:from-pink-500 hover:to-orange-500 active:scale-[0.98] opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.saving')}
              </>
            ) : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
