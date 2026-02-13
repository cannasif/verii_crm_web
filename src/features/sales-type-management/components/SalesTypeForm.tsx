import { type ReactElement, useEffect } from 'react';
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
import { salesTypeFormSchema, type SalesTypeFormSchema } from '../types/sales-type-types';
import type { SalesTypeGetDto } from '../types/sales-type-types';
import { OfferType } from '@/types/offer-type';
import { Tag, X } from 'lucide-react';
import { isZodFieldRequired } from '@/lib/zod-required';

interface SalesTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SalesTypeFormSchema) => void | Promise<void>;
  salesType?: SalesTypeGetDto | null;
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
  'text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1 mb-1.5 block';

export function SalesTypeForm({
  open,
  onOpenChange,
  onSubmit,
  salesType,
  isLoading = false,
}: SalesTypeFormProps): ReactElement {
  const { t } = useTranslation(['sales-type-management', 'common']);

  const form = useForm<SalesTypeFormSchema>({
    resolver: zodResolver(salesTypeFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      salesType: OfferType.YURTICI,
      name: '',
    },
  });
  const isFormValid = form.formState.isValid;

  useEffect(() => {
    if (salesType) {
      form.reset({
        salesType: salesType.salesType,
        name: salesType.name,
      });
    } else {
      form.reset({
        salesType: OfferType.YURTICI,
        name: '',
      });
    }
  }, [salesType, form]);

  const handleSubmit = async (data: SalesTypeFormSchema): Promise<void> => {
    await onSubmit(data);
    if (!isLoading) {
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[96vw] xl:max-w-[1000px] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 shadow-2xl">
        <DialogHeader className="px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 backdrop-blur-sm shrink-0 flex-row items-center justify-between space-y-0 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-linear-to-br from-pink-500 to-orange-500 p-0.5">
              <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[10px] flex items-center justify-center">
                <Tag size={20} className="text-pink-600 dark:text-pink-500" />
              </div>
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                {salesType
                  ? t('form.editTitle')
                  : t('form.addTitle')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                {salesType
                  ? t('form.editDescription')
                  : t('form.addDescription')}
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-500 dark:text-slate-400"
            >
              <X size={20} />
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="salesType"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(salesTypeFormSchema, 'salesType')}>
                      {t('form.salesType')}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className={INPUT_STYLE}>
                          <SelectValue placeholder={t('common.offerType.selectPlaceholder', { ns: 'common' })} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={OfferType.YURTICI}>
                          {t('common.offerType.yurtici', { ns: 'common' })}
                        </SelectItem>
                        <SelectItem value={OfferType.YURTDISI}>
                          {t('common.offerType.yurtdisi', { ns: 'common' })}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-500 text-[10px] mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(salesTypeFormSchema, 'name')}>
                      {t('form.name')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('form.namePlaceholder')}
                        className={INPUT_STYLE}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 text-[10px] mt-1" />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <DialogFooter className="px-6 py-5 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 backdrop-blur-sm shrink-0 flex flex-row justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="bg-white dark:bg-transparent border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 h-11 px-6 rounded-xl"
          >
            {t('common.cancel', { ns: 'common' })}
          </Button>
          <Button
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isLoading || !isFormValid}
            className="bg-linear-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white border-0 shadow-lg shadow-pink-500/20 h-11 px-8 rounded-xl font-bold tracking-wide transition-all hover:scale-105"
          >
            {isLoading
              ? t('common.saving', { ns: 'common' })
              : t('common.save', { ns: 'common' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
