import { type ReactElement, useCallback, useEffect, useState } from 'react';
import { useForm, type FieldErrors, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
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
  Form,
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
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import {
  useCustomerOptionsInfinite,
  useTitleOptionsInfinite,
} from '@/components/shared/dropdown/useDropdownEntityInfinite';
import { contactFormSchema, SALUTATION_TYPE, type ContactFormSchema } from '../types/contact-types';
import type { ContactDto } from '../types/contact-types';
import { isZodFieldRequired } from '@/lib/zod-required';
import { buildContactInputClassName, sanitizePhoneValue, useFieldShake } from '../utils/contact-form-ui';
import {
  AddTeamIcon,
  UserCircleIcon,
  Building03Icon,
  Briefcase01Icon,
  Mail01Icon,
  Call02Icon,
  SmartPhone01Icon,
  Note01Icon,
} from 'hugeicons-react';

interface ContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ContactFormSchema) => void | Promise<void>;
  contact?: ContactDto | null;
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

const DROPDOWN_CONTENT_STYLE = `
  bg-white dark:bg-[#1a1025] 
  border border-slate-200 dark:border-white/10 
  text-slate-700 dark:text-slate-200 
  shadow-xl rounded-xl
  z-50
`;

const DROPDOWN_ITEM_STYLE = `
  cursor-pointer 
  focus:bg-pink-50 dark:focus:bg-pink-500/10 
  focus:text-pink-600 dark:focus:text-pink-400 
  py-2.5 px-3 my-1 rounded-lg text-sm
`;

const LABEL_STYLE = "text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1 mb-2 flex items-center gap-2";

const CONTACT_NS = 'contact-management' as const;

export function ContactForm({
  open,
  onOpenChange,
  onSubmit,
  contact,
  isLoading = false,
}: ContactFormProps): ReactElement {
  const { t } = useTranslation([CONTACT_NS, 'common']);
  const tf = useCallback(
    (key: string, options?: Record<string, unknown>): string =>
      t(`form.${key}`, { ns: CONTACT_NS, ...options }),
    [t]
  );
  const { triggerShake, isShaking } = useFieldShake();
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [titleSearchTerm, setTitleSearchTerm] = useState('');
  const customerDropdown = useCustomerOptionsInfinite(customerSearchTerm, open);
  const titleDropdown = useTitleOptionsInfinite(titleSearchTerm, open);

  const form = useForm<ContactFormSchema>({
    resolver: zodResolver(contactFormSchema) as Resolver<ContactFormSchema>,
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      salutation: SALUTATION_TYPE.None,
      firstName: '',
      middleName: '',
      lastName: '',
      fullName: '',
      email: '',
      phone: '',
      mobile: '',
      notes: '',
      customerId: 0,
      titleId: 0,
    },
  });
  useEffect(() => {
    if (!open) {
      return;
    }

    if (contact) {
      form.reset({
        salutation: contact.salutation ?? SALUTATION_TYPE.None,
        firstName: contact.firstName || '',
        middleName: contact.middleName || '',
        lastName: contact.lastName || '',
        fullName: contact.fullName,
        email: contact.email || '',
        phone: contact.phone || '',
        mobile: contact.mobile || '',
        notes: contact.notes || '',
        customerId: contact.customerId,
        titleId: contact.titleId ?? 0,
      });
      return;
    }

    form.reset({
      salutation: SALUTATION_TYPE.None,
      firstName: '',
      middleName: '',
      lastName: '',
      fullName: '',
      email: '',
      phone: '',
      mobile: '',
      notes: '',
      customerId: 0,
      titleId: 0,
    });
  }, [open, contact?.id, contact, form]);

  const handlePhoneFieldChange = useCallback(
    (
      fieldName: 'phone' | 'mobile',
      rawValue: string,
      maxLength: number,
      overflowMessage: string,
      onChange: (value: string) => void
    ): void => {
      const { next, overflowAttempt } = sanitizePhoneValue(rawValue, maxLength);
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

  const handleSubmit = async (data: ContactFormSchema): Promise<void> => {
    await onSubmit(data);
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  const handleInvalidSubmit = (errors: FieldErrors<ContactFormSchema>): void => {
    const fieldNames = Object.keys(errors);
    fieldNames.forEach((fieldName) => triggerShake(fieldName));

    const firstField = fieldNames[0] as keyof ContactFormSchema | undefined;
    if (firstField) {
      form.setFocus(firstField);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[96vw] xl:max-w-[1000px] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white shadow-2xl">

        <DialogHeader className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex flex-row items-center justify-between sticky top-0 z-10 backdrop-blur-md bg-white/95 dark:bg-[#130822]/95">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-pink-500 to-orange-500 flex items-center justify-center shadow-lg shadow-pink-500/20 shrink-0">
              <AddTeamIcon size={24} className="text-white" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                {contact ? tf('editContact') : tf('addContact')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
                {contact ? tf('editDescription') : tf('addDescription')}
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
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 custom-scrollbar">
          <Form {...form}>
            <form id="contact-form" onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)} className="space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">

                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(contactFormSchema, 'firstName')}>
                        <UserCircleIcon size={16} className="text-pink-500" />
                        {tf('firstName')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className={buildContactInputClassName(INPUT_STYLE, !!fieldState.error, isShaking('firstName'))}
                          placeholder={tf('firstNamePlaceholder')}
                          maxLength={100}
                          onChange={(event) => {
                            field.onChange(event);
                            if (event.target.value.trim()) {
                              form.clearErrors('firstName');
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="salutation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}>
                        <UserCircleIcon size={16} className="text-pink-500" />
                        {tf('salutation')}
                      </FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={String(field.value)}
                      >
                        <FormControl>
                          <SelectTrigger className={`${INPUT_STYLE} justify-between px-4`}>
                            <SelectValue placeholder={tf('selectSalutation')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className={DROPDOWN_CONTENT_STYLE}>
                          <SelectItem value={String(SALUTATION_TYPE.None)} className={DROPDOWN_ITEM_STYLE}>{tf('salutationNone')}</SelectItem>
                          <SelectItem value={String(SALUTATION_TYPE.Mr)} className={DROPDOWN_ITEM_STYLE}>{tf('salutationMr')}</SelectItem>
                          <SelectItem value={String(SALUTATION_TYPE.Ms)} className={DROPDOWN_ITEM_STYLE}>{tf('salutationMs')}</SelectItem>
                          <SelectItem value={String(SALUTATION_TYPE.Mrs)} className={DROPDOWN_ITEM_STYLE}>{tf('salutationMrs')}</SelectItem>
                          <SelectItem value={String(SALUTATION_TYPE.Dr)} className={DROPDOWN_ITEM_STYLE}>{tf('salutationDr')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(contactFormSchema, 'lastName')}>
                        <UserCircleIcon size={16} className="text-pink-500" />
                        {tf('lastName')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className={buildContactInputClassName(INPUT_STYLE, !!fieldState.error, isShaking('lastName'))}
                          placeholder={tf('lastNamePlaceholder')}
                          maxLength={100}
                          onChange={(event) => {
                            field.onChange(event);
                            if (event.target.value.trim()) {
                              form.clearErrors('lastName');
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="middleName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}>
                        <UserCircleIcon size={16} className="text-pink-500" />
                        {t('contactManagement.form.middleName')}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} className={INPUT_STYLE} placeholder={t('contactManagement.form.middleNamePlaceholder')} maxLength={100} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="titleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}>
                        <Briefcase01Icon size={16} className="text-pink-500" />
                        {t('contactManagement.form.title')}
                      </FormLabel>
                      <VoiceSearchCombobox
                        options={[{ value: '0', label: t('contactManagement.form.titleNone') }, ...titleDropdown.options]}
                        value={field.value !== undefined && field.value !== null && field.value !== 0 ? field.value.toString() : ''}
                        onSelect={(value) => field.onChange(value ? Number(value) : 0)}
                        onDebouncedSearchChange={setTitleSearchTerm}
                        onFetchNextPage={titleDropdown.fetchNextPage}
                        hasNextPage={titleDropdown.hasNextPage}
                        isLoading={titleDropdown.isLoading}
                        isFetchingNextPage={titleDropdown.isFetchingNextPage}
                        placeholder={t('contactManagement.form.selectTitle')}
                        searchPlaceholder={t('common.search')}
                        className={INPUT_STYLE}
                      />
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(contactFormSchema, 'customerId')}>
                        <Building03Icon size={16} className="text-pink-500" />
                        {tf('customer')}
                      </FormLabel>
                      <VoiceSearchCombobox
                        options={customerDropdown.options}
                        value={field.value && field.value !== 0 ? field.value.toString() : ''}
                        onSelect={(value) => {
                          const nextValue = value ? Number(value) : 0;
                          field.onChange(nextValue);
                          if (nextValue > 0) {
                            form.clearErrors('customerId');
                          }
                        }}
                        onDebouncedSearchChange={setCustomerSearchTerm}
                        onFetchNextPage={customerDropdown.fetchNextPage}
                        hasNextPage={customerDropdown.hasNextPage}
                        isLoading={customerDropdown.isLoading}
                        isFetchingNextPage={customerDropdown.isFetchingNextPage}
                        placeholder={tf('selectCustomer')}
                        searchPlaceholder={t('common.search')}
                        className={buildContactInputClassName(INPUT_STYLE, !!fieldState.error, isShaking('customerId'))}
                      />
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}>
                        <SmartPhone01Icon size={16} className="text-pink-500" />
                        {tf('mobile')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          inputMode="tel"
                          autoComplete="off"
                          className={buildContactInputClassName(INPUT_STYLE, !!fieldState.error, isShaking('mobile'))}
                          placeholder={tf('mobilePlaceholderExample')}
                          maxLength={20}
                          onChange={(event) =>
                            handlePhoneFieldChange(
                              'mobile',
                              event.target.value,
                              20,
                              tf('mobileMaxLength'),
                              field.onChange
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}>
                        <Call02Icon size={16} className="text-pink-500" />
                        {tf('phone')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          inputMode="tel"
                          autoComplete="off"
                          className={buildContactInputClassName(INPUT_STYLE, !!fieldState.error, isShaking('phone'))}
                          placeholder={tf('phonePlaceholderExample')}
                          maxLength={20}
                          onChange={(event) =>
                            handlePhoneFieldChange(
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
                  )}
                />

                <div className="col-span-1 md:col-span-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className={LABEL_STYLE}>
                          <Mail01Icon size={16} className="text-pink-500" />
                          {tf('email')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            autoComplete="off"
                            className={buildContactInputClassName(INPUT_STYLE, !!fieldState.error, isShaking('email'))}
                            placeholder={tf('emailPlaceholderExample')}
                            maxLength={100}
                            onChange={(event) => {
                              field.onChange(event);
                              if (form.formState.errors.email) {
                                void form.trigger('email');
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={LABEL_STYLE}>
                          <Note01Icon size={16} className="text-pink-500" />
                          {t('contactManagement.form.notes')}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            className={`${INPUT_STYLE} min-h-[100px] h-auto py-3 resize-none`}
                            placeholder={t('contactManagement.form.notesPlaceholder')}
                            maxLength={250}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

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
            {t('cancel', { ns: CONTACT_NS })}
          </Button>
          <Button
            type="submit"
            form="contact-form"
            disabled={isLoading}
            className="w-full sm:w-auto h-12 px-8 bg-linear-to-r from-pink-600 to-orange-600 hover:from-pink-500 hover:to-orange-500 text-white font-black rounded-xl shadow-lg shadow-pink-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border-0 opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
          >
            {isLoading ? t('saving', { ns: CONTACT_NS }) : t('save', { ns: CONTACT_NS })}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
