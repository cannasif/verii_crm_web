import { type ReactElement, useEffect } from 'react';
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
import { approvalRoleGroupFormSchema, type ApprovalRoleGroupFormSchema } from '../types/approval-role-group-types';
import type { ApprovalRoleGroupDto } from '../types/approval-role-group-types';
import { ShieldCheck, Loader2, X } from 'lucide-react';
import { isZodFieldRequired } from '@/lib/zod-required';

interface ApprovalRoleGroupFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ApprovalRoleGroupFormSchema) => void | Promise<void>;
  group?: ApprovalRoleGroupDto | null;
  isLoading?: boolean;
}

const INPUT_STYLE = `
  h-12 rounded-xl
  bg-slate-50 dark:bg-[#0c0516]
  border border-slate-200 dark:border-white/10
  text-slate-900 dark:text-white text-sm
  placeholder:text-slate-400 dark:placeholder:text-slate-600
  focus-visible:ring-0 focus-visible:ring-offset-0
  focus:bg-white focus:border-rose-500 focus:shadow-[0_0_0_3px_rgba(244,63,94,0.15)]
  dark:focus:bg-[#0c0516] dark:focus:border-rose-500/60 dark:focus:shadow-[0_0_0_3px_rgba(244,63,94,0.1)]
  transition-all duration-200
`;

const LABEL_STYLE =
  'text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1 mb-1.5 block';

export function ApprovalRoleGroupForm({
  open,
  onOpenChange,
  onSubmit,
  group,
  isLoading = false,
}: ApprovalRoleGroupFormProps): ReactElement {
  const { t } = useTranslation();

  const form = useForm<ApprovalRoleGroupFormSchema>({
    resolver: zodResolver(approvalRoleGroupFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (group) {
      form.reset({
        name: group.name,
      });
    } else {
      form.reset({
        name: '',
      });
    }
  }, [group, form]);

  const handleSubmit = async (data: ApprovalRoleGroupFormSchema): Promise<void> => {
    await onSubmit(data);
    if (!isLoading) {
      form.reset();
      onOpenChange(false);
    }
  };

  const handleInvalidSubmit = (errors: FieldErrors<ApprovalRoleGroupFormSchema>): void => {
    const fieldNames = Object.keys(errors);
    const firstField = fieldNames[0] as keyof ApprovalRoleGroupFormSchema | undefined;
    if (firstField) {
      form.setFocus(firstField);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(40vw-2rem)] !max-w-[96vw] xl:max-w-[550px] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white/90 dark:bg-[#130822]/90 border border-slate-200/60 dark:border-white/10 shadow-2xl rounded-[2.5rem]">

        <DialogHeader className="px-6 sm:px-8 py-6 border-b border-slate-100 dark:border-white/5 shrink-0 flex-row items-center justify-between space-y-0 sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-rose-500 to-amber-500 p-0.5 shadow-[0_10px_20px_-10px_var(--crm-brand-shadow)]">
              <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[14px] flex items-center justify-center">
                <ShieldCheck size={24} className="text-rose-600 dark:text-rose-400" />
              </div>
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                {group
                  ? t('approvalRoleGroup.form.editTitle')
                  : t('approvalRoleGroup.form.addTitle')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                {group
                  ? t('approvalRoleGroup.form.editDescription')
                  : t('approvalRoleGroup.form.addDescription')}
              </DialogDescription>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="group relative h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-rose-500 hover:text-white transition-all duration-300 hover:rotate-90 shadow-sm"
          >
            <X size={20} className="relative z-10" />
            <div className="absolute inset-0 rounded-full bg-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <Form {...form}>
            <form id="approval-role-group-form" onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(approvalRoleGroupFormSchema, 'name')}>
                      {t('approvalRoleGroup.form.name')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('approvalRoleGroup.form.namePlaceholder')}
                        maxLength={100}
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
            form="approval-role-group-form"
            disabled={isLoading}
            className="h-12 px-10 rounded-2xl bg-[image:var(--crm-brand-gradient)] text-white font-black shadow-[0_10px_20px_-10px_var(--crm-brand-shadow)] ring-1 ring-rose-400/30 transition-all duration-300 hover:scale-[1.05] hover:from-rose-500 hover:to-amber-500 active:scale-[0.98] opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
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
