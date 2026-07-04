import { type ReactElement, useEffect } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
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
import { CreditCard, Loader2, X } from 'lucide-react';
import { isZodFieldRequired } from '@/lib/zod-required';
import { cn } from '@/lib/utils';
import { DOCUMENT_DIALOG_CLOSE_BUTTON_BASE_CLASS } from '@/lib/document-line-dialog-styles';

interface PaymentTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PaymentTypeFormSchema) => void | Promise<void>;
  paymentType?: PaymentTypeDto | null;
  isLoading?: boolean;
}

const INPUT_STYLE = `
  h-12 rounded-xl
  bg-slate-50 dark:bg-[#0c0516]
  border border-slate-200 dark:border-white/10
  text-slate-900 dark:text-white text-sm
  placeholder:text-slate-400 dark:placeholder:text-slate-600
  focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0 focus-visible:border-primary
  focus:bg-white dark:focus:bg-[#0c0516] dark:focus-visible:border-primary/40 dark:focus-visible:ring-primary/25
  transition-all duration-200
`;

const LABEL_STYLE =
  'text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1 mb-1.5 block';

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

  const handleInvalidSubmit = (errors: FieldErrors<PaymentTypeFormSchema>): void => {
    const fieldNames = Object.keys(errors);
    const firstField = fieldNames[0] as keyof PaymentTypeFormSchema | undefined;
    if (firstField) {
      form.setFocus(firstField);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[96vw] xl:max-w-[700px] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white/90 dark:bg-[#130822]/90 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 shadow-2xl rounded-[2.5rem]">
        <DialogHeader className="px-6 sm:px-8 py-6 border-b border-slate-100 dark:border-white/5 shrink-0 flex-row items-center justify-between space-y-0 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-primary to-[var(--crm-brand-accent)] p-0.5 shadow-lg shadow-primary/20">
              <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[14px] flex items-center justify-center">
                <CreditCard size={24} className="text-primary" />
              </div>
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                {paymentType
                  ? t('paymentTypeManagement.edit')
                  : t('paymentTypeManagement.create')}
              </DialogTitle>

            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={cn(
              'h-10 w-10 rounded-full shadow-sm active:scale-90',
              DOCUMENT_DIALOG_CLOSE_BUTTON_BASE_CLASS
            )}
          >
            <X size={20} />
          </button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)} className="grid md:grid-cols-2 gap-6">
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

              <button type="submit" className="hidden" />
            </form>
          </Form>
        </div>

        <DialogFooter className="px-6 sm:px-8 py-6 border-t border-slate-100 dark:border-white/5 shrink-0 flex flex-row justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="h-12 px-8 rounded-2xl border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 font-bold transition-all"
          >
            {t('paymentTypeManagement.cancel')}
          </Button>
          <Button
            onClick={form.handleSubmit(handleSubmit, handleInvalidSubmit)}
            disabled={isLoading}
            className="h-12 px-10 rounded-2xl bg-[image:var(--crm-brand-gradient)] text-white font-black shadow-lg shadow-primary/20 ring-1 ring-primary/30 transition-all duration-300 hover:scale-[1.05] hover:opacity-90 active:scale-[0.98] opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('paymentTypeManagement.saving')}
              </>
            ) : t('paymentTypeManagement.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
