import { type ReactElement, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Cancel01Icon } from 'hugeicons-react';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import {
  useCustomerOptionsInfinite,
  useCountryOptionsInfinite,
  useCityOptionsInfinite,
  useDistrictOptionsInfinite,
} from '@/components/shared/dropdown/useDropdownEntityInfinite';
import { shippingAddressFormSchema, type ShippingAddressFormSchema } from '../types/shipping-address-types';
import type { ShippingAddressDto } from '../types/shipping-address-types';

import { MapPin, Loader2, User, Phone, FileText, Hash, Globe, Building } from 'lucide-react';
interface ShippingAddressFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ShippingAddressFormSchema) => void | Promise<void>;
  shippingAddress?: ShippingAddressDto | null;
  isLoading?: boolean;
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

const LABEL_STYLE = "text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1 mb-2 flex items-center gap-2";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] xl:max-w-[1000px] max-h-[92vh] flex flex-col p-0 bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white shadow-2xl shadow-slate-200/50 dark:shadow-black/50 sm:rounded-2xl overflow-hidden transition-colors duration-300">
        <DialogHeader className="px-6 py-5 bg-slate-50/50 dark:bg-[#1a1025]/50 backdrop-blur-sm border-b border-slate-100 dark:border-white/5 shrink-0 flex-row items-center justify-between space-y-0 sticky top-0 z-10">
          <div className="flex items-center gap-4">
             <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20">
               <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[14px] flex items-center justify-center">
                 <MapPin size={24} className="text-pink-600 dark:text-pink-500" />
               </div>
             </div>
             <div className="space-y-1">
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full"
          >
            <Cancel01Icon size={20} />
          </Button>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Hidden submit button for Enter key submission */}
              <button type="submit" className="hidden" />

              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}>
                      <User size={12} className="text-pink-500" />
                      {t('shippingAddressManagement.customerId')} *
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}>
                      <FileText size={12} className="text-pink-500" />
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}>
                      <MapPin size={12} className="text-pink-500" />
                      {t('shippingAddressManagement.address')} *
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('shippingAddressManagement.addressPlaceholder')}
                        className={`${INPUT_STYLE} h-24 py-3 resize-none`}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}>
                        <Hash size={12} className="text-pink-500" />
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}>
                        <Phone size={12} className="text-green-500" />
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}>
                      <User size={12} className="text-blue-500" />
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0f0a18] px-4 py-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                        />
                      </FormControl>
                      <div className="space-y-1">
                        <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
                          {t('shippingAddressManagement.isDefault')}
                        </FormLabel>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <FormField
                  control={form.control}
                  name="countryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}>
                        <Globe size={12} className="text-purple-500" />
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}>
                        <Building size={12} className="text-orange-500" />
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="districtId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}>
                        <MapPin size={12} className="text-red-500" />
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}>
                      <FileText size={12} className="text-slate-500" />
                      {t('shippingAddressManagement.notes')}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('shippingAddressManagement.notesPlaceholder')}
                        className={`${INPUT_STYLE} h-20 py-3 resize-none`}
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 shrink-0 backdrop-blur-sm">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isLoading}
                    className="h-11 rounded-xl border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300"
                >
                    {t('common.cancel')}
                </Button>
                <Button 
                    type="submit"
                    disabled={isLoading || !isFormValid}
                    className="h-11 rounded-xl bg-linear-to-r from-pink-600 to-orange-500 hover:from-pink-700 hover:to-orange-600 text-white font-medium shadow-lg shadow-pink-500/20 border-0"
                >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLoading
                    ? t('common.saving')
                    : t('common.save')}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
