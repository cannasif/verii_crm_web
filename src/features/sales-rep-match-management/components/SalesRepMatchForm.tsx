import { type ReactElement, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Link2, Loader2, X } from 'lucide-react';
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
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import { useUserOptionsInfinite } from '@/components/shared/dropdown/useDropdownEntityInfinite';
import { isZodFieldRequired } from '@/lib/zod-required';
import { useSalesRepOptionsInfinite } from '../hooks/useSalesRepOptionsInfinite';
import {
  salesRepMatchFormSchema,
  type SalesRepMatchFormInput,
  type SalesRepMatchFormSchema,
} from '../types/sales-rep-match-types';

interface SalesRepMatchFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SalesRepMatchFormSchema) => void | Promise<void>;
  isLoading?: boolean;
}

const INPUT_STYLE = `
  h-12 rounded-xl
  bg-slate-50 dark:bg-[#0c0516]
  border border-slate-200 dark:border-white/10
  text-slate-900 dark:text-white text-sm
  focus-visible:ring-0 focus-visible:ring-offset-0
  focus:bg-white focus:border-pink-500 focus:shadow-[0_0_0_3px_rgba(236,72,153,0.15)]
  dark:focus:bg-[#0c0516] dark:focus:border-pink-500/60 dark:focus:shadow-[0_0_0_3px_rgba(236,72,153,0.1)]
  transition-all duration-200
`;

const LABEL_STYLE =
  'text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1 mb-1.5 block';

export function SalesRepMatchForm({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: SalesRepMatchFormProps): ReactElement {
  const { t } = useTranslation(['sales-rep-match-management', 'common']);
  const [salesRepSearchTerm, setSalesRepSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const salesRepDropdown = useSalesRepOptionsInfinite(salesRepSearchTerm, open);
  const userDropdown = useUserOptionsInfinite(userSearchTerm, open);

  const form = useForm<SalesRepMatchFormInput, unknown, SalesRepMatchFormSchema>({
    resolver: zodResolver(salesRepMatchFormSchema),
    mode: 'onChange',
    defaultValues: {
      salesRepCodeId: '0',
      userId: '0',
    },
  });

  const handleSubmit = async (data: SalesRepMatchFormSchema): Promise<void> => {
    await onSubmit(data);
    form.reset({ salesRepCodeId: '0', userId: '0' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[96vw] xl:max-w-[700px] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white/90 dark:bg-[#130822]/90 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 shadow-2xl rounded-[2.5rem]">
        <DialogHeader className="px-6 sm:px-8 py-6 border-b border-slate-100 dark:border-white/5  shrink-0 flex-row items-center justify-between space-y-0 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20">
              <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[14px] flex items-center justify-center">
                <Link2 size={24} className="text-pink-600 dark:text-pink-400" />
              </div>
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                {t('form.addTitle')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                {t('form.addDescription')}
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

        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="salesRepCodeId"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(salesRepMatchFormSchema, 'salesRepCodeId')}>
                      {t('form.salesRep')}
                    </FormLabel>
                    <FormControl>
                      <VoiceSearchCombobox
                        options={salesRepDropdown.options}
                        value={Number(field.value ?? 0) > 0 ? String(field.value) : ''}
                        onSelect={(value) => field.onChange(value ?? '0')}
                        onDebouncedSearchChange={setSalesRepSearchTerm}
                        onFetchNextPage={salesRepDropdown.fetchNextPage}
                        hasNextPage={salesRepDropdown.hasNextPage}
                        isLoading={salesRepDropdown.isLoading}
                        isFetchingNextPage={salesRepDropdown.isFetchingNextPage}
                        placeholder={t('form.salesRepPlaceholder')}
                        searchPlaceholder={t('form.salesRepSearchPlaceholder')}
                        className={INPUT_STYLE}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 text-[10px] mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(salesRepMatchFormSchema, 'userId')}>
                      {t('form.user')}
                    </FormLabel>
                    <FormControl>
                      <VoiceSearchCombobox
                        options={userDropdown.options}
                        value={Number(field.value ?? 0) > 0 ? String(field.value) : ''}
                        onSelect={(value) => field.onChange(value ?? '0')}
                        onDebouncedSearchChange={setUserSearchTerm}
                        onFetchNextPage={userDropdown.fetchNextPage}
                        hasNextPage={userDropdown.hasNextPage}
                        isLoading={userDropdown.isLoading}
                        isFetchingNextPage={userDropdown.isFetchingNextPage}
                        placeholder={t('form.userPlaceholder')}
                        searchPlaceholder={t('form.userSearchPlaceholder')}
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

        <DialogFooter className="px-6 sm:px-8 py-6 border-t border-slate-100 dark:border-white/5 shrink-0 flex flex-row justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="h-12 px-8 rounded-2xl border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 font-bold transition-all"
          >
            {t('common.cancel', { ns: 'common' })}
          </Button>
          <Button
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isLoading || !form.formState.isValid}
            className="h-12 px-10 rounded-2xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-black shadow-lg shadow-pink-500/20 ring-1 ring-pink-400/30 transition-all duration-300 hover:scale-[1.05] hover:from-pink-500 hover:to-orange-500 active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.saving', { ns: 'common' })}
              </>
            ) : t('common.save', { ns: 'common' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
