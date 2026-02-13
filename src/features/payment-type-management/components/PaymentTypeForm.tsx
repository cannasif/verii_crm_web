import { type ReactElement, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { paymentTypeFormSchema, type PaymentTypeFormSchema } from '../types/payment-type-types';
import type { PaymentTypeDto } from '../types/payment-type-types';
import { CreditCard, Loader2 } from 'lucide-react';
import { Cancel01Icon } from 'hugeicons-react';
import { isZodFieldRequired } from '@/lib/zod-required';

interface PaymentTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PaymentTypeFormSchema) => void | Promise<void>;
  paymentType?: PaymentTypeDto | null;
  isLoading?: boolean;
}

const INPUT_STYLE = `
  h-12 rounded-xl
  bg-slate-50 dark:bg-[#0f0a18] 
  border border-slate-200 dark:border-white/10 
  text-slate-900 dark:text-white text-sm
  placeholder:text-slate-400 dark:placeholder:text-slate-600 
  
  focus-visible:ring-0 focus-visible:ring-offset-0 
  
  focus:bg-white 
  focus:border-pink-500 
  focus:shadow-[0_0_0_3px_rgba(236,72,153,0.15)] 

  dark:focus:bg-[#0c0516] 
  dark:focus:border-pink-500/60 
  dark:focus:shadow-[0_0_0_3px_rgba(236,72,153,0.1)]

  transition-all duration-200
`;

const LABEL_STYLE = "text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1 mb-1.5 block";

export function PaymentTypeForm({
  open,
  onOpenChange,
  onSubmit,
  paymentType,
  isLoading = false,
}: PaymentTypeFormProps): ReactElement {
  const { t } = useTranslation();

  const form = useForm<PaymentTypeFormSchema>({
    resolver: zodResolver(paymentTypeFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
    },
  });
  const isFormValid = form.formState.isValid;

  useEffect(() => {
    if (paymentType) {
      form.reset({
        name: paymentType.name,
        description: paymentType.description || '',
      });
    } else {
      form.reset({
        name: '',
        description: '',
      });
    }
  }, [paymentType, form]);

  const handleSubmit = async (data: PaymentTypeFormSchema): Promise<void> => {
    await onSubmit(data);
    if (!isLoading) {
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[96vw] xl:max-w-[1000px] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 shadow-2xl transition-colors duration-300">
        <DialogHeader className="px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 backdrop-blur-sm shrink-0 flex-row items-center justify-between space-y-0 sticky top-0 z-10">
          <div className="flex items-center gap-4">
             <div className="h-10 w-10 rounded-xl bg-linear-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20">
               <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[10px] flex items-center justify-center">
                 <CreditCard size={20} className="text-pink-600 dark:text-pink-500" />
               </div>
             </div>
             <div className="space-y-1">
                <DialogTitle className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  {paymentType
                    ? t('paymentTypeManagement.edit')
                    : t('paymentTypeManagement.create')}
                </DialogTitle>
             </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full">
            <Cancel01Icon size={20} />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(paymentTypeFormSchema, 'name')}>
                      {t('paymentTypeManagement.name')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('paymentTypeManagement.namePlaceholder')}
                        maxLength={100}
                        className={INPUT_STYLE}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 text-[10px] mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE}>
                      {t('paymentTypeManagement.description')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('paymentTypeManagement.descriptionPlaceholder')}
                        maxLength={500}
                        className={INPUT_STYLE}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 text-[10px] mt-1" />
                  </FormItem>
                )}
              />
              
              {/* Hidden submit button to allow Enter key submission */}
              <button type="submit" className="hidden" />
            </form>
          </Form>
        </div>

        <DialogFooter className="px-6 py-5 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 shrink-0 backdrop-blur-sm flex flex-row justify-end gap-3">
            <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="h-11 rounded-xl border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300"
            >
                {t('paymentTypeManagement.cancel')}
            </Button>
            <Button 
                onClick={form.handleSubmit(handleSubmit)}
                disabled={isLoading || !isFormValid}
                className="h-11 rounded-xl bg-linear-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white font-medium shadow-lg shadow-pink-500/20 border-0"
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading
                ? t('paymentTypeManagement.saving')
                : t('paymentTypeManagement.save')}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
