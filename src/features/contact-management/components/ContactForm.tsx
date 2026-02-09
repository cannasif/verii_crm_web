import { type ReactElement, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
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
import { contactFormSchema, type ContactFormSchema } from '../types/contact-types';
import type { ContactDto } from '../types/contact-types';
import { useCustomerOptions } from '@/features/customer-management/hooks/useCustomerOptions';
import { useTitleOptions } from '@/features/title-management/hooks/useTitleOptions';
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

export function ContactForm({
  open,
  onOpenChange,
  onSubmit,
  contact,
  isLoading = false,
}: ContactFormProps): ReactElement {
  const { t } = useTranslation();
  const { data: customers, isLoading: customersLoading } = useCustomerOptions();
  const { data: titles, isLoading: titlesLoading } = useTitleOptions();

  const form = useForm<ContactFormSchema>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
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
    if (contact) {
      form.reset({
        fullName: contact.fullName,
        email: contact.email || '',
        phone: contact.phone || '',
        mobile: contact.mobile || '',
        notes: contact.notes || '',
        customerId: contact.customerId,
        titleId: contact.titleId,
      });
    } else {
      form.reset({
        fullName: '',
        email: '',
        phone: '',
        mobile: '',
        notes: '',
        customerId: 0,
        titleId: 0,
      });
    }
  }, [contact, form]);

  const handleSubmit = async (data: ContactFormSchema): Promise<void> => {
    await onSubmit(data);
    if (!isLoading) {
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[750px] max-h-[85vh] flex flex-col p-0 bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white shadow-2xl overflow-hidden">
        
        <DialogHeader className="px-6 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 flex flex-row items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20">
               <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[10px] flex items-center justify-center">
                 <AddTeamIcon size={20} className="text-pink-600 dark:text-pink-500" />
               </div>
             </div>
             <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
               {contact ? t('contactManagement.form.editContact', 'İletişim Düzenle') : t('contactManagement.form.addContact', 'Yeni İletişim Ekle')}
             </DialogTitle>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onOpenChange(false)} 
            className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <Form {...form}>
            <form id="contact-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  
                  <div className="col-span-1 md:col-span-2">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={LABEL_STYLE}>
                            <UserCircleIcon size={16} className="text-pink-500" />
                            {t('contactManagement.form.fullName', 'Ad Soyad')} <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} className={INPUT_STYLE} placeholder={t('contactManagement.form.fullNamePlaceholder', 'Örn: Ali Yılmaz')} maxLength={100} />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={LABEL_STYLE}>
                          <Building03Icon size={16} className="text-pink-500" />
                          {t('contactManagement.form.customer', 'Müşteri')} <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={field.value && field.value !== 0 ? field.value.toString() : ""}
                          disabled={customersLoading}
                        >
                          <FormControl>
                            <SelectTrigger className={`${INPUT_STYLE} justify-between px-4`}>
                              <SelectValue placeholder={t('contactManagement.form.selectCustomer', 'Müşteri seçiniz...')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className={DROPDOWN_CONTENT_STYLE}>
                            {customers?.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id.toString()} className={DROPDOWN_ITEM_STYLE}>
                                {customer.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          {t('contactManagement.form.title', 'Ünvan')} <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={field.value && field.value !== 0 ? field.value.toString() : ""}
                          disabled={titlesLoading}
                        >
                          <FormControl>
                            <SelectTrigger className={`${INPUT_STYLE} justify-between px-4`}>
                              <SelectValue placeholder={t('contactManagement.form.selectTitle', 'Ünvan seçiniz...')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className={DROPDOWN_CONTENT_STYLE}>
                            {titles?.map((title) => (
                              <SelectItem key={title.id} value={title.id.toString()} className={DROPDOWN_ITEM_STYLE}>
                                {title.titleName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={LABEL_STYLE}>
                          <Call02Icon size={16} className="text-pink-500" />
                          {t('contactManagement.form.phone', 'Telefon')}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} className={INPUT_STYLE} placeholder="0212..." maxLength={20} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={LABEL_STYLE}>
                          <SmartPhone01Icon size={16} className="text-pink-500" />
                          {t('contactManagement.form.mobile', 'Mobil')}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} className={INPUT_STYLE} placeholder="05XX..." maxLength={20} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <div className="col-span-1 md:col-span-2">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={LABEL_STYLE}>
                            <Mail01Icon size={16} className="text-pink-500" />
                            {t('contactManagement.form.email', 'E-posta')}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} type="email" className={INPUT_STYLE} placeholder="ornek@email.com" maxLength={100} />
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
                            {t('contactManagement.form.notes', 'Notlar')}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              className={`${INPUT_STYLE} min-h-[100px] h-auto py-3 resize-none`}
                              placeholder={t('contactManagement.form.notesPlaceholder', 'Varsa notlarınızı buraya ekleyin...')}
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

        <DialogFooter className="px-6 py-5 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 flex-col sm:flex-row gap-3 sticky bottom-0 z-10 backdrop-blur-sm">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto h-11 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            {t('contactManagement.cancel', 'İptal')}
          </Button>
          <Button 
            type="submit" 
            form="contact-form" 
            disabled={isLoading}
            className="w-full sm:w-auto h-11 bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
          >
            {isLoading ? t('contactManagement.saving', 'Kaydediliyor...') : t('contactManagement.save', 'Kaydet')}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}