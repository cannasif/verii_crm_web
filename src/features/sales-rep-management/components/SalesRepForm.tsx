import { type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Building2, UserRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { isZodFieldRequired } from '@/lib/zod-required';
import { salesRepFormSchema, type SalesRepFormInput, type SalesRepFormSchema } from '../types/sales-rep-types';

interface SalesRepFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SalesRepFormSchema) => void | Promise<void>;
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

export function SalesRepForm({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: SalesRepFormProps): ReactElement {
  const { t } = useTranslation(['sales-rep-management', 'common']);
  const form = useForm<SalesRepFormInput, unknown, SalesRepFormSchema>({
    resolver: zodResolver(salesRepFormSchema),
    mode: 'onChange',
    defaultValues: {
      branchCode: '0',
      salesRepCode: '',
      salesRepDescription: '',
      name: '',
    },
  });

  const handleSubmit = async (data: SalesRepFormSchema): Promise<void> => {
    await onSubmit(data);
    form.reset({
      branchCode: '0',
      salesRepCode: '',
      salesRepDescription: '',
      name: '',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[96vw] xl:max-w-[900px] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 shadow-2xl">
        <DialogHeader className="px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 backdrop-blur-sm shrink-0 flex-row items-center justify-between space-y-0 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-linear-to-br from-sky-500 to-cyan-500 p-0.5">
              <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[10px] flex items-center justify-center">
                <UserRound size={20} className="text-sky-600 dark:text-sky-500" />
              </div>
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                {t('form.addTitle')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                {t('form.addDescription')}
              </DialogDescription>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-500 dark:text-slate-400"
          >
            <X size={20} />
          </button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-5 md:grid-cols-2">
              <FormField
                control={form.control}
                name="branchCode"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(salesRepFormSchema, 'branchCode')}>
                      {t('form.branchCode')}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          value={field.value == null ? '' : String(field.value)}
                          onChange={(event) => field.onChange(event.target.value)}
                          type="number"
                          placeholder={t('form.branchCodePlaceholder')}
                          className={`${INPUT_STYLE} pl-10`}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-500 text-[10px] mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="salesRepCode"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(salesRepFormSchema, 'salesRepCode')}>
                      {t('form.salesRepCode')}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={8} placeholder={t('form.salesRepCodePlaceholder')} className={INPUT_STYLE} />
                    </FormControl>
                    <FormMessage className="text-red-500 text-[10px] mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="salesRepDescription"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE}>{t('form.salesRepDescription')}</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={30} placeholder={t('form.salesRepDescriptionPlaceholder')} className={INPUT_STYLE} />
                    </FormControl>
                    <FormMessage className="text-red-500 text-[10px] mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE}>{t('form.name')}</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={35} placeholder={t('form.namePlaceholder')} className={INPUT_STYLE} />
                    </FormControl>
                    <FormMessage className="text-red-500 text-[10px] mt-1" />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <DialogFooter className="px-6 py-5 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 backdrop-blur-sm shrink-0 flex flex-row justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="bg-white dark:bg-transparent border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 h-11 px-6 rounded-xl">
            {t('common.cancel', { ns: 'common' })}
          </Button>
          <Button onClick={form.handleSubmit(handleSubmit)} disabled={isLoading || !form.formState.isValid} className="bg-linear-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white border-0 shadow-lg shadow-sky-500/20 h-11 px-8 rounded-xl font-bold tracking-wide transition-all hover:scale-105">
            {isLoading ? t('common.saving', { ns: 'common' }) : t('common.save', { ns: 'common' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
