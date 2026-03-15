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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { VoiceSearchCombobox, type ComboboxOption } from '@/components/shared/VoiceSearchCombobox';
import { useUserOptionsInfinite } from '@/components/shared/dropdown/useDropdownEntityInfinite';
import { userDiscountLimitFormSchema, type UserDiscountLimitFormSchema } from '../types/user-discount-limit-types';
import type { UserDiscountLimitDto } from '../types/user-discount-limit-types';
import { useStokGroup } from '@/services/hooks/useStokGroup';
import { toast } from 'sonner';
import { userDiscountLimitApi } from '../api/user-discount-limit-api';
import { BadgePercent, X } from 'lucide-react';
import { isZodFieldRequired } from '@/lib/zod-required';

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

interface UserDiscountLimitFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UserDiscountLimitFormSchema) => void | Promise<void>;
  userDiscountLimit?: UserDiscountLimitDto | null;
  isLoading?: boolean;
}

export function UserDiscountLimitForm({
  open,
  onOpenChange,
  onSubmit,
  userDiscountLimit,
  isLoading = false,
}: UserDiscountLimitFormProps): ReactElement {
  const { t } = useTranslation('user-discount-limit-management');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const userDropdown = useUserOptionsInfinite(userSearchTerm, open);
  const { data: stokGroups = [], isLoading: isLoadingGroups } = useStokGroup();

  const form = useForm<UserDiscountLimitFormSchema>({
    resolver: zodResolver(userDiscountLimitFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      erpProductGroupCode: '',
      salespersonId: 0,
      maxDiscount1: 0,
      maxDiscount2: undefined,
      maxDiscount3: undefined,
    },
  });
  const isFormValid = form.formState.isValid;

  useEffect(() => {
    if (userDiscountLimit) {
      form.reset({
        erpProductGroupCode: userDiscountLimit.erpProductGroupCode,
        salespersonId: userDiscountLimit.salespersonId,
        maxDiscount1: userDiscountLimit.maxDiscount1,
        maxDiscount2: userDiscountLimit.maxDiscount2 || undefined,
        maxDiscount3: userDiscountLimit.maxDiscount3 || undefined,
      });
    } else {
      form.reset({
        erpProductGroupCode: '',
        salespersonId: 0,
        maxDiscount1: 0,
        maxDiscount2: undefined,
        maxDiscount3: undefined,
      });
    }
  }, [userDiscountLimit, form]);

  const handleSubmit = async (data: UserDiscountLimitFormSchema): Promise<void> => {
    if (!userDiscountLimit) {
      try {
        const existsResult = await userDiscountLimitApi.existsBySalespersonAndGroup(data.salespersonId, data.erpProductGroupCode);
        if (existsResult) {
          toast.error(t('alreadyExists'));
          return;
        }
      } catch {
        void 0;
      }
    }
    await onSubmit(data);
    if (!isLoading) {
      form.reset();
      onOpenChange(false);
    }
  };

  const groupComboboxOptions: ComboboxOption[] = stokGroups.map(group => {
    const groupCode = group.grupKodu || `__group_${group.isletmeKodu}_${group.subeKodu}`;
    const displayText = group.grupKodu && group.grupAdi 
      ? `${group.grupKodu} - ${group.grupAdi}`
      : group.grupAdi || group.grupKodu || groupCode;
    return {
      value: groupCode,
      label: displayText
    };
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[96vw] xl:max-w-[1000px] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 shadow-2xl">
        <DialogHeader className="px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 backdrop-blur-sm shrink-0 flex-row items-center justify-between space-y-0 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-linear-to-br from-pink-500 to-orange-500 p-0.5">
              <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[10px] flex items-center justify-center">
                <BadgePercent size={20} className="text-pink-600 dark:text-pink-500" />
              </div>
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                {userDiscountLimit
                  ? t('edit')
                  : t('create')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                {userDiscountLimit
                  ? t('editDescription')
                  : t('createDescription')}
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
                name="salespersonId"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(userDiscountLimitFormSchema, 'salespersonId')}>
                      {t('salesperson')}
                    </FormLabel>
                    <VoiceSearchCombobox
                      options={userDropdown.options}
                      value={field.value && field.value > 0 ? field.value.toString() : ''}
                      onSelect={(value) => {
                        field.onChange(value ? Number(value) : 0);
                      }}
                      onDebouncedSearchChange={setUserSearchTerm}
                      onFetchNextPage={userDropdown.fetchNextPage}
                      hasNextPage={userDropdown.hasNextPage}
                      isLoading={userDropdown.isLoading}
                      isFetchingNextPage={userDropdown.isFetchingNextPage}
                      placeholder={t('selectSalesperson')}
                      searchPlaceholder={t('common.search', { ns: 'common' })}
                      className={INPUT_STYLE}
                      modal={true}
                    />
                    <FormMessage className="text-red-500 text-[10px] mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="erpProductGroupCode"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(userDiscountLimitFormSchema, 'erpProductGroupCode')}>
                      {t('erpProductGroupCode')}
                    </FormLabel>
                    <VoiceSearchCombobox
                      options={groupComboboxOptions}
                      value={field.value || ''}
                      onSelect={(value) => {
                        field.onChange(value);
                      }}
                      placeholder={t('enterErpProductGroupCode')}
                      searchPlaceholder={t('common.search', { ns: 'common' })}
                      className={INPUT_STYLE}
                      modal={true}
                      disabled={isLoadingGroups}
                    />
                    <FormMessage className="text-red-500 text-[10px] mt-1" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <FormField
                  control={form.control}
                  name="maxDiscount1"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(userDiscountLimitFormSchema, 'maxDiscount1')}>
                        {t('maxDiscount1')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          className={INPUT_STYLE}
                          type="number"
                          step="0.000001"
                          min="0"
                          max="100"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          value={field.value || ''}
                          placeholder={t('enterMaxDiscount1')}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-[10px] mt-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxDiscount2"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className={LABEL_STYLE}>
                        {t('maxDiscount2')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          className={INPUT_STYLE}
                          type="number"
                          step="0.000001"
                          min="0"
                          max="100"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          value={field.value || ''}
                          placeholder={t('enterMaxDiscount2')}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-[10px] mt-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxDiscount3"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className={LABEL_STYLE}>
                        {t('maxDiscount3')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          className={INPUT_STYLE}
                          type="number"
                          step="0.000001"
                          min="0"
                          max="100"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          value={field.value || ''}
                          placeholder={t('enterMaxDiscount3')}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-[10px] mt-1" />
                    </FormItem>
                  )}
                />
              </div>
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
