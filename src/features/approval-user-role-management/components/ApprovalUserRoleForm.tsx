import { type ReactElement, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import { approvalUserRoleFormSchema, type ApprovalUserRoleFormSchema } from '../types/approval-user-role-types';
import type { ApprovalUserRoleDto } from '../types/approval-user-role-types';
import { useUserOptions } from '@/features/user-discount-limit-management/hooks/useUserOptions';
import { useApprovalRoleOptions } from '@/features/approval-role-management/hooks/useApprovalRoleOptions';
import { ShieldCheck } from 'lucide-react';

interface ApprovalUserRoleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ApprovalUserRoleFormSchema) => void | Promise<void>;
  userRole?: ApprovalUserRoleDto | null;
  isLoading?: boolean;
}

const INPUT_STYLE = `
  h-11 rounded-lg
  bg-slate-50 dark:bg-[#0c0516] 
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

export function ApprovalUserRoleForm({
  open,
  onOpenChange,
  onSubmit,
  userRole,
  isLoading = false,
}: ApprovalUserRoleFormProps): ReactElement {
  const { t } = useTranslation();
  const { data: userOptions = [] } = useUserOptions();
  const { data: approvalRoleOptions = [] } = useApprovalRoleOptions();

  const form = useForm<ApprovalUserRoleFormSchema>({
    resolver: zodResolver(approvalUserRoleFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      userId: 0,
      approvalRoleId: 0,
    },
  });
  const isFormValid = form.formState.isValid;

  useEffect(() => {
    if (userRole) {
      form.reset({
        userId: userRole.userId,
        approvalRoleId: userRole.approvalRoleId,
      });
    } else {
      form.reset({
        userId: 0,
        approvalRoleId: 0,
      });
    }
  }, [userRole, form]);

  const handleSubmit = async (data: ApprovalUserRoleFormSchema): Promise<void> => {
    await onSubmit(data);
    if (!isLoading) {
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white max-w-lg shadow-2xl shadow-slate-200/50 dark:shadow-black/50 sm:rounded-2xl max-h-[90vh] h-auto flex flex-col gap-0 p-0 overflow-hidden transition-colors duration-300">
        <DialogHeader className="border-b border-slate-100 dark:border-white/5 px-6 py-5 bg-white/80 dark:bg-[#130822]/90 backdrop-blur-md shrink-0 flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
             <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20">
                <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[14px] flex items-center justify-center">
                  <ShieldCheck size={24} className="text-pink-600 dark:text-pink-500" />
                </div>
              </div>
             <div>
                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  {userRole
                    ? t('approvalUserRole.form.editTitle')
                    : t('approvalUserRole.form.addTitle')}
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                  {userRole
                    ? t('approvalUserRole.form.editDescription')
                    : t('approvalUserRole.form.addDescription')}
                </DialogDescription>
             </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE}>
                      {t('approvalUserRole.form.userId')} *
                    </FormLabel>
                    <VoiceSearchCombobox
                      value={field.value && field.value !== 0 ? field.value.toString() : ''}
                      onSelect={(value) => field.onChange(value ? parseInt(value) : 0)}
                      options={userOptions.map((user) => ({
                        value: user.id.toString(),
                        label: user.fullName || user.username || ''
                      }))}
                      placeholder={t('approvalUserRole.form.selectUser')}
                      searchPlaceholder={t('common.search')}
                      className={INPUT_STYLE}
                    />
                    <FormMessage className="text-red-500 text-[10px] mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="approvalRoleId"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE}>
                      {t('approvalUserRole.form.approvalRoleId')} *
                    </FormLabel>
                    <VoiceSearchCombobox
                      value={field.value && field.value !== 0 ? field.value.toString() : ''}
                      onSelect={(value) => field.onChange(value ? parseInt(value) : 0)}
                      options={approvalRoleOptions.map((role) => ({
                        value: role.id.toString(),
                        label: `${role.name} ${role.approvalRoleGroupName ? `(${role.approvalRoleGroupName})` : ''}`
                      }))}
                      placeholder={t('approvalUserRole.form.selectApprovalRole')}
                      searchPlaceholder={t('common.search')}
                      className={INPUT_STYLE}
                    />
                    <FormMessage className="text-red-500 text-[10px] mt-1" />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <DialogFooter className="border-t border-slate-100 dark:border-white/5 px-6 py-5 bg-slate-50/50 dark:bg-[#130822] sm:justify-between sm:space-x-0">
          <div className="flex items-center gap-2 w-full justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="bg-white dark:bg-transparent border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 h-11 px-6 rounded-xl"
            >
              {t('approvalUserRole.form.cancel')}
            </Button>
            <Button 
              onClick={form.handleSubmit(handleSubmit)}
              disabled={isLoading || !isFormValid}
              className="bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white border-0 shadow-lg shadow-pink-500/20 h-11 px-8 rounded-xl font-bold tracking-wide transition-all hover:scale-105"
            >
              {isLoading
                ? t('approvalUserRole.form.saving')
                : t('approvalUserRole.form.save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
