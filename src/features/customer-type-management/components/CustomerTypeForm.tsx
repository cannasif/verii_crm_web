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
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[96vw] xl:max-w-[1000px] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white shadow-2xl">
        
        <DialogHeader className="px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 flex flex-row items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-xl bg-linear-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20">
               <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[10px] flex items-center justify-center">
                 <Tag size={20} className="text-pink-600 dark:text-pink-500" />
               </div>
             </div>
             <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
               {customerType
                 ? t('customerTypeManagement.form.editCustomerType')
                 : t('customerTypeManagement.form.addCustomerType')}
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

        <DialogFooter className="px-6 py-5 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 flex-col sm:flex-row gap-3 sticky bottom-0 z-10 backdrop-blur-sm">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto h-11 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            {t('customerTypeManagement.form.cancel')}
          </Button>
          <Button 
            type="submit" 
            form="customer-type-form" 
            disabled={isLoading || !isFormValid}
            className="w-full sm:w-auto h-11 bg-linear-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
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
