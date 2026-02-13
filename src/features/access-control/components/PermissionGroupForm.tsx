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
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { PermissionDefinitionMultiSelect } from './PermissionDefinitionMultiSelect';
import { FieldHelpTooltip } from './FieldHelpTooltip';
import { createPermissionGroupSchema, type CreatePermissionGroupSchema } from '../schemas/permission-group-schema';
import type { PermissionGroupDto } from '../types/access-control.types';
import { isZodFieldRequired } from '@/lib/zod-required';

interface PermissionGroupFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePermissionGroupSchema) => void | Promise<void>;
  item?: PermissionGroupDto | null;
  isLoading?: boolean;
}

export function PermissionGroupForm({
  open,
  onOpenChange,
  onSubmit,
  item,
  isLoading = false,
}: PermissionGroupFormProps): ReactElement {
  const { t } = useTranslation(['access-control', 'common']);

  const form = useForm<CreatePermissionGroupSchema>({
    resolver: zodResolver(createPermissionGroupSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      isSystemAdmin: false,
      isActive: true,
      permissionDefinitionIds: [],
    },
  });
  const isFormValid = form.formState.isValid;

  useEffect(() => {
    if (item) {
      form.reset({
        name: item.name,
        description: item.description ?? '',
        isSystemAdmin: item.isSystemAdmin,
        isActive: item.isActive,
        permissionDefinitionIds: item.permissionDefinitionIds ?? [],
      });
    } else {
      form.reset({
        name: '',
        description: '',
        isSystemAdmin: false,
        isActive: true,
        permissionDefinitionIds: [],
      });
    }
  }, [item, form, open]);

  const handleSubmit = async (data: CreatePermissionGroupSchema): Promise<void> => {
    await onSubmit(data);
    if (!isLoading) {
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white max-w-2xl w-[95%] sm:w-full shadow-2xl sm:rounded-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50">
          <DialogTitle className="text-xl font-bold">
            {item
              ? t('permissionGroups.form.editTitle')
              : t('permissionGroups.form.addTitle')}
          </DialogTitle>
          <DialogDescription>
            {item
              ? t('permissionGroups.form.editDescription')
              : t('permissionGroups.form.addDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <Form {...form}>
            <form id="permission-group-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="inline-flex items-center" required={isZodFieldRequired(createPermissionGroupSchema, 'name')}>
                      {t('permissionGroups.form.name')}
                      <FieldHelpTooltip text={t('help.permissionGroup.name')} />
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('permissionGroups.form.namePlaceholder')} maxLength={100} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('permissionGroups.form.description')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value ?? ''} placeholder={t('permissionGroups.form.descriptionPlaceholder')} maxLength={500} className="min-h-[80px]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isSystemAdmin"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <FormLabel className="inline-flex items-center">
                      {t('permissionGroups.form.isSystemAdmin')}
                      <FieldHelpTooltip text={t('help.permissionGroup.isSystemAdmin')} />
                    </FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <FormLabel className="inline-flex items-center">
                      {t('permissionGroups.form.isActive')}
                      <FieldHelpTooltip text={t('help.permissionGroup.isActive')} />
                    </FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="permissionDefinitionIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="inline-flex items-center">
                      {t('permissionGroups.form.permissions')}
                      <FieldHelpTooltip text={t('help.permissionGroup.permissions')} />
                    </FormLabel>
                    <FormControl>
                      <PermissionDefinitionMultiSelect value={field.value} onChange={field.onChange} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <DialogFooter className="px-6 py-5 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <span className="inline-flex items-center gap-1">
            <FieldHelpTooltip text={t('help.permissionGroup.save')} side="top" />
            <Button type="submit" form="permission-group-form" disabled={isLoading || !isFormValid}>
              {isLoading ? t('common.saving') : t('common.save')}
            </Button>
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
