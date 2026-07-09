import { type ReactElement, useEffect, useState } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
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
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import { useApprovalRoleGroupOptionsInfinite } from '@/components/shared/dropdown/useDropdownEntityInfinite';
import { approvalRoleFormSchema, type ApprovalRoleFormSchema } from '../types/approval-role-types';
import type { ApprovalRoleDto } from '../types/approval-role-types';
import { Shield, X, Loader2 } from 'lucide-react';
import { isZodFieldRequired } from '@/lib/zod-required';
import { cn } from '@/lib/utils';
import { DOCUMENT_DIALOG_CLOSE_BUTTON_BASE_CLASS } from '@/lib/document-line-dialog-styles';

interface ApprovalRoleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ApprovalRoleFormSchema) => void | Promise<void>;
  role?: ApprovalRoleDto | null;
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

export function ApprovalRoleForm({
  open,
  onOpenChange,
  onSubmit,
  role,
  isLoading = false,
}: ApprovalRoleFormProps): ReactElement {
  const { t } = useTranslation();
  const [roleGroupSearchTerm, setRoleGroupSearchTerm] = useState('');
  const roleGroupDropdown = useApprovalRoleGroupOptionsInfinite(roleGroupSearchTerm, open);

  const form = useForm<ApprovalRoleFormSchema>({
    resolver: zodResolver(approvalRoleFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      approvalRoleGroupId: 0,
      name: '',
      maxAmount: 0,
    },
  });

  useEffect(() => {
    if (role) {
      form.reset({
        approvalRoleGroupId: role.approvalRoleGroupId,
        name: role.name,
        maxAmount: role.maxAmount,
      });
    } else {
      form.reset({
        approvalRoleGroupId: 0,
        name: '',
        maxAmount: 0,
      });
    }
  }, [role, form]);

  const handleSubmit = async (data: ApprovalRoleFormSchema): Promise<void> => {
    await onSubmit(data);
    if (!isLoading) {
      form.reset();
      onOpenChange(false);
    }
  };

  const handleInvalidSubmit = (errors: FieldErrors<ApprovalRoleFormSchema>): void => {
    const fieldNames = Object.keys(errors);
    const firstField = fieldNames[0] as keyof ApprovalRoleFormSchema | undefined;
    if (firstField) {
      form.setFocus(firstField);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(40vw-2rem)] !max-w-[96vw] xl:max-w-[600px] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white/90 dark:bg-[#130822]/90 border border-slate-200/60 dark:border-white/10 shadow-2xl rounded-[2.5rem]">

        <DialogHeader className="px-6 sm:px-8 py-6 border-b border-slate-100 dark:border-white/5 shrink-0 flex-row items-center justify-between space-y-0 sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-accent text-primary ring-1 ring-inset ring-primary/15 dark:border-primary/25 dark:bg-primary/10">
              <Shield size={24} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                {role
                  ? t('approvalRole.form.editTitle')
                  : t('approvalRole.form.addTitle')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                {role
                  ? t('approvalRole.form.editDescription')
                  : t('approvalRole.form.addDescription')}
              </DialogDescription>
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

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <Form {...form}>
            <form id="approval-role-form" onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <FormField
                control={form.control}
                name="approvalRoleGroupId"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(approvalRoleFormSchema, 'approvalRoleGroupId')}>
                      {t('approvalRole.form.approvalRoleGroupId')}
                    </FormLabel>
                    <VoiceSearchCombobox
                      value={field.value && field.value !== 0 ? field.value.toString() : ''}
                      onSelect={(value) => field.onChange(value ? parseInt(value) : 0)}
                      options={roleGroupDropdown.options}
                      onDebouncedSearchChange={setRoleGroupSearchTerm}
                      onFetchNextPage={roleGroupDropdown.fetchNextPage}
                      hasNextPage={roleGroupDropdown.hasNextPage}
                      isLoading={roleGroupDropdown.isLoading}
                      isFetchingNextPage={roleGroupDropdown.isFetchingNextPage}
                      placeholder={t('approvalRole.form.selectApprovalRoleGroup')}
                      searchPlaceholder={t('common.search')}
                      className={INPUT_STYLE}
                    />
                    <FormMessage className="text-red-500 text-[10px] mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(approvalRoleFormSchema, 'name')}>
                      {t('approvalRole.form.name')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className={INPUT_STYLE}
                        placeholder={t('approvalRole.form.namePlaceholder')}
                        maxLength={100}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 text-[10px] mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxAmount"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(approvalRoleFormSchema, 'maxAmount')}>
                      {t('approvalRole.form.maxAmount')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                        placeholder={t('approvalRole.form.maxAmountPlaceholder')}
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

        <DialogFooter className="px-6 sm:px-8 py-6 border-t border-slate-100 dark:border-white/5 shrink-0 flex flex-row justify-end gap-4 backdrop-blur-sm">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="h-12 px-8 rounded-2xl border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 font-bold transition-all"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form="approval-role-form"
            disabled={isLoading}
            className="h-12 px-10 rounded-2xl bg-[image:var(--crm-brand-gradient)] text-white font-black shadow-[0_10px_20px_-10px_var(--crm-brand-shadow)] ring-1 ring-primary/30 transition-all duration-300 hover:scale-[1.05] hover:from-primary hover:to-amber-500 active:scale-[0.98] opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.saving')}
              </>
            ) : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
