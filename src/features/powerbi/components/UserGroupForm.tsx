import { type ReactElement, useEffect, useLayoutEffect, useState } from 'react';
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
import { DROPDOWN_MAX_HEIGHT_PX } from '@/components/shared/dropdown/constants';
import { Loader2, UserPlus, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { DOCUMENT_DIALOG_CLOSE_BUTTON_BASE_CLASS } from '@/lib/document-line-dialog-styles';

const GROUP_LIST_PARAMS = { pageNumber: 1, pageSize: 500 };
const USER_GROUP_COMBOBOX_POPOVER_CLASS = 'user-group-form-combobox-popover';

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

  useEffect(() => {
    if (!open) {
      return;
    }

    const dialog = document.querySelector('[data-user-group-form-dialog]');
    if (!(dialog instanceof HTMLElement)) {
      return;
    }

    const previousOverflow = dialog.style.overflow;
    dialog.style.overflow = 'visible';

    return () => {
      dialog.style.overflow = previousOverflow;
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    const dialog = document.querySelector('[data-user-group-form-dialog]');
    if (!(dialog instanceof HTMLElement)) {
      return;
    }

    const repositionPopovers = (): void => {
      const popovers = dialog.querySelectorAll(`.${USER_GROUP_COMBOBOX_POPOVER_CLASS}`);
      popovers.forEach((popover) => {
        if (!(popover instanceof HTMLElement)) {
          return;
        }

        const popoverId = popover.id;
        if (!popoverId) {
          return;
        }

        const trigger = dialog.querySelector(`button[aria-controls="${popoverId}"]`);
        if (!(trigger instanceof HTMLElement)) {
          return;
        }

        const rect = trigger.getBoundingClientRect();
        const popoverHeight = popover.offsetHeight || DROPDOWN_MAX_HEIGHT_PX + 56;
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom - 8;
        const spaceAbove = rect.top - 8;
        const openUpward = spaceBelow < popoverHeight && spaceAbove > spaceBelow;

        popover.style.position = 'fixed';
        popover.style.top = openUpward
          ? `${Math.max(8, rect.top - popoverHeight - 4)}px`
          : `${rect.bottom + 4}px`;
        popover.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8))}px`;
        popover.style.width = `${rect.width}px`;
        popover.style.zIndex = '1000';
      });
    };

    repositionPopovers();

    const observer = new MutationObserver(repositionPopovers);
    observer.observe(dialog, { childList: true, subtree: true });

    window.addEventListener('resize', repositionPopovers);
    window.addEventListener('scroll', repositionPopovers, true);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', repositionPopovers);
      window.removeEventListener('scroll', repositionPopovers, true);
    };
  }, [open]);

  const handleSubmit = async (data: UserPowerBIGroupFormSchema): Promise<void> => {
    await onSubmit(data);
    if (!isSubmitting) {
      form.reset();
      onOpenChange(false);
    }
  };

  const inputClass = "w-full h-10 rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 dark:focus-visible:border-primary/40 dark:focus-visible:ring-primary/25 transition-all font-medium";
  const labelClass = "text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-user-group-form-dialog
        showCloseButton={false}
        className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] !max-w-[900px] max-h-[calc(100dvh-1.5rem)] p-0 border-0 shadow-2xl bg-white dark:bg-[#180F22] rounded-3xl ring-1 ring-slate-200 dark:ring-white/10 flex flex-col overflow-visible"
      >
        <DialogPrimitive.Close
          className={cn(
            'absolute right-6 top-6 z-50 size-10 rounded-2xl p-2.5 active:scale-90',
            DOCUMENT_DIALOG_CLOSE_BUTTON_BASE_CLASS
          )}
        >
          <X size={20} strokeWidth={2.5} />
        </DialogPrimitive.Close>

        <DialogHeader className="shrink-0 p-6 pb-4 border-b border-slate-100 dark:border-white/5 text-left">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-accent text-primary ring-1 ring-inset ring-primary/15 dark:border-primary/25 dark:bg-primary/10">
              <UserPlus className="h-6 w-6" />
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
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-1 flex-col overflow-visible">
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-visible px-6 pt-2 pb-5 md:grid-cols-1">
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
                        popoverContentClassName={USER_GROUP_COMBOBOX_POPOVER_CLASS}
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
                        popoverContentClassName={USER_GROUP_COMBOBOX_POPOVER_CLASS}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="shrink-0 border-t border-slate-100 dark:border-white/5 px-6 py-4 flex-col sm:flex-row gap-3">
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
                className="rounded-xl bg-[image:var(--crm-brand-gradient)] text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_20px_-10px_var(--crm-brand-shadow)] disabled:opacity-30 disabled:hover:scale-100 px-8 h-11 gap-2 opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
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
