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
import { customerTypeFormSchema, type CustomerTypeFormSchema } from '../types/customer-type-types';
import type { CustomerTypeDto } from '../types/customer-type-types';
import { Tag, FileText } from 'lucide-react';
import { isZodFieldRequired } from '@/lib/zod-required';

interface CustomerTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CustomerTypeFormSchema) => void | Promise<void>;
  customerType?: CustomerTypeDto | null;
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

export function CustomerTypeForm({
  open,
  onOpenChange,
  onSubmit,
  customerType,
  isLoading = false,
}: CustomerTypeFormProps): ReactElement {
  const { t } = useTranslation();

  const form = useForm<CustomerTypeFormSchema>({
    resolver: zodResolver(customerTypeFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
    },
  });
  const isFormValid = form.formState.isValid;

  useEffect(() => {
    if (customerType) {
      form.reset({
        name: customerType.name,
        description: customerType.description || '',
      });
    } else {
      form.reset({
        name: '',
        description: '',
      });
    }
  }, [customerType, form]);

  const handleSubmit = async (data: CustomerTypeFormSchema): Promise<void> => {
    await onSubmit(data);
    if (!isLoading) {
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[96vw] xl:max-w-[1000px] max-h-[92vh] flex flex-col rounded-[1.2rem] p-0 overflow-hidden bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white shadow-2xl">

        <DialogHeader className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex flex-row items-center justify-between sticky top-0 z-10 backdrop-blur-md bg-white/95 dark:bg-[#130822]/95">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-pink-500 to-orange-500 flex items-center justify-center shadow-lg shadow-pink-500/20 shrink-0">
              <Tag size={24} className="text-white" />
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {customerType
                ? t('customerTypeManagement.form.editCustomerType')
                : t('customerTypeManagement.form.addCustomerType')}
            </DialogTitle>
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
            <form id="customer-type-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">

                <div className="col-span-1 md:col-span-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(customerTypeFormSchema, 'name')}>
                          <Tag size={16} className="text-pink-500" />
                          {t('customerTypeManagement.form.name')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className={INPUT_STYLE}
                            placeholder={t('customerTypeManagement.form.namePlaceholder')}
                            maxLength={100}
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
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={LABEL_STYLE}>
                          <FileText size={16} className="text-pink-500" />
                          {t('customerTypeManagement.form.description')}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            className={`${INPUT_STYLE} min-h-[120px] h-auto py-3 resize-none`}
                            placeholder={t('customerTypeManagement.form.descriptionPlaceholder')}
                            maxLength={500}
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
            {t('customerTypeManagement.form.cancel')}
          </Button>
          <Button
            type="submit"
            form="customer-type-form"
            disabled={isLoading || !isFormValid}
            className="w-full sm:w-auto h-12 px-8 bg-linear-to-r from-pink-600 to-orange-600 hover:from-pink-500 hover:to-orange-500 text-white font-black rounded-xl shadow-lg shadow-pink-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border-0 opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
          >
            {isLoading
              ? t('customerTypeManagement.form.saving')
              : t('customerTypeManagement.form.save')}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
