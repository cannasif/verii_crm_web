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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import {
  userPowerbiGroupFormSchema,
  type UserPowerBIGroupFormSchema,
} from '../types/userPowerbiGroup.types';
import type { UserPowerBIGroupGetDto } from '../types/userPowerbiGroup.types';
import { usePowerbiGroupList } from '../hooks/usePowerbiGroup';
import { useUserOptionsInfinite } from '@/components/shared/dropdown/useDropdownEntityInfinite';
import { Loader2, UserPlus, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

const GROUP_LIST_PARAMS = { pageNumber: 1, pageSize: 500 };

interface UserGroupFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: UserPowerBIGroupGetDto | null;
  onSubmit: (data: UserPowerBIGroupFormSchema) => void | Promise<void>;
  isSubmitting: boolean;
}

export function UserGroupForm({
  open,
  onOpenChange,
  initial,
  onSubmit,
  isSubmitting,
}: UserGroupFormProps): ReactElement {
  const { t } = useTranslation();
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const { data: groupsData } = usePowerbiGroupList(GROUP_LIST_PARAMS);
  const userDropdown = useUserOptionsInfinite(userSearchTerm, open);
  const groups = groupsData?.data ?? [];

  const form = useForm<UserPowerBIGroupFormSchema>({
    resolver: zodResolver(userPowerbiGroupFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      userId: 0,
      groupId: 0,
    },
  });
  const isFormValid = form.formState.isValid;

  useEffect(() => {
    if (initial) {
      form.reset({
        userId: initial.userId,
        groupId: initial.groupId,
      });
    } else {
      form.reset({
        userId: 0,
        groupId: 0,
      });
    }
  }, [initial, form, open]);

  const handleSubmit = async (data: UserPowerBIGroupFormSchema): Promise<void> => {
    await onSubmit(data);
    if (!isSubmitting) {
      form.reset();
      onOpenChange(false);
    }
  };

  const inputClass = "w-full h-10 rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50 transition-all font-medium";
  const labelClass = "text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] !max-w-[900px] p-0 border-0 shadow-2xl bg-white dark:bg-[#180F22] rounded-3xl ring-1 ring-slate-200 dark:ring-white/10 flex flex-col overflow-hidden">
        <DialogPrimitive.Close className="absolute right-6 top-6 z-50 rounded-2xl bg-slate-100 p-2.5 text-slate-400 transition-all duration-200 hover:bg-red-600 hover:text-white active:scale-90 dark:bg-white/5 dark:text-white/40 dark:hover:bg-red-600 dark:hover:text-white">
          <X size={20} strokeWidth={2.5} />
        </DialogPrimitive.Close>

        <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-white/5 text-left">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-100 dark:bg-white/5 shadow-inner border border-pink-200 dark:border-white/10 relative overflow-hidden group">
              <div className="absolute inset-0 bg-linear-to-br from-pink-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <UserPlus className="h-6 w-6 text-pink-600 dark:text-pink-400 relative z-10" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {initial ? t('powerbi.userGroup.edit') : t('powerbi.userGroup.add')}
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                {initial ? t('powerbi.userGroup.editDescription') : t('powerbi.userGroup.createDescription')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6 px-6 pt-2 pb-5">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <label className={labelClass}>{t('powerbi.userGroup.userId')}</label>
                    <FormControl>
                      <VoiceSearchCombobox
                        options={userDropdown.options}
                        value={field.value ? String(field.value) : ''}
                        onSelect={(v) => field.onChange(v ? Number(v) : 0)}
                        onDebouncedSearchChange={setUserSearchTerm}
                        onFetchNextPage={userDropdown.fetchNextPage}
                        hasNextPage={userDropdown.hasNextPage}
                        isLoading={userDropdown.isLoading}
                        isFetchingNextPage={userDropdown.isFetchingNextPage}
                        placeholder={t('powerbi.userGroup.selectUser')}
                        className={inputClass}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="groupId"
                render={({ field }) => (
                  <FormItem>
                    <label className={labelClass}>{t('powerbi.userGroup.groupId')}</label>
                    <FormControl>
                      <VoiceSearchCombobox
                        options={groups.map((g) => ({ value: String(g.id), label: g.name }))}
                        value={field.value ? String(field.value) : ''}
                        onSelect={(v) => field.onChange(v ? Number(v) : 0)}
                        placeholder={t('powerbi.userGroup.selectGroup')}
                        className={inputClass}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="border-t border-slate-100 dark:border-white/5 px-6 py-4 flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 font-bold px-6 h-11"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !isFormValid}
                className="rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_5px_15px_-5px_rgba(219,39,119,0.5)] disabled:opacity-30 disabled:hover:scale-100 px-8 h-11 gap-2 opacity-75 grayscale-[0] dark:opacity-100 dark:grayscale-0"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
