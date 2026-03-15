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
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import { useApprovalRoleGroupOptionsInfinite } from '@/components/shared/dropdown/useDropdownEntityInfinite';
import { approvalRoleFormSchema, type ApprovalRoleFormSchema } from '../types/approval-role-types';
import type { ApprovalRoleDto } from '../types/approval-role-types';

interface ApprovalRoleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ApprovalRoleFormSchema) => void | Promise<void>;
  role?: ApprovalRoleDto | null;
  isLoading?: boolean;
}

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

  const inputClass = "h-11 bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm focus-visible:border-pink-500 focus-visible:ring-4 focus-visible:ring-pink-500/20 transition-all duration-300";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[500px] p-0 overflow-hidden border-0 shadow-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl ring-1 ring-zinc-200 dark:ring-zinc-800">
        <DialogHeader className="p-6 pb-2 space-y-1">
          <DialogTitle className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-foreground">
            {role
              ? t('approvalRole.form.editTitle')
              : t('approvalRole.form.addTitle')}
          </DialogTitle>
          <DialogDescription className="text-zinc-500 dark:text-muted-foreground text-base">
            {role
              ? t('approvalRole.form.editDescription')
              : t('approvalRole.form.addDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 p-6 pt-2">
            <FormField
              control={form.control}
              name="approvalRoleGroupId"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
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
                    className={inputClass}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    {t('approvalRole.form.name')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className={inputClass}
                      placeholder={t('approvalRole.form.namePlaceholder')}
                      maxLength={100}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxAmount"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    {t('approvalRole.form.maxAmount')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.000001"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                      placeholder={t('approvalRole.form.maxAmountPlaceholder')}
                      className={inputClass}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="h-11 px-6 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              >
                {t('approvalRole.form.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="h-11 px-8 bg-linear-to-r from-pink-600 to-orange-600 text-white font-semibold shadow-lg shadow-pink-500/20 hover:scale-[1.02] transition-transform"
              >
                {isLoading
                  ? t('approvalRole.form.saving')
                  : t('approvalRole.form.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
