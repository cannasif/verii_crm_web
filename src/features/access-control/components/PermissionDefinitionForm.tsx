import { type ReactElement, useEffect, useMemo } from 'react';
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
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import {
  createPermissionDefinitionSchema,
  type CreatePermissionDefinitionSchema,
} from '../schemas/permission-definition-schema';
import type { PermissionDefinitionDto } from '../types/access-control.types';
import { FieldHelpTooltip } from './FieldHelpTooltip';
import { PERMISSION_CODE_CATALOG, getRoutesForPermissionCode, getPermissionDisplayMeta } from '../utils/permission-config';
import { Badge } from '@/components/ui/badge';
import { isZodFieldRequired } from '@/lib/zod-required';

interface PermissionDefinitionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePermissionDefinitionSchema) => void | Promise<void>;
  item?: PermissionDefinitionDto | null;
  isLoading?: boolean;
}

export function PermissionDefinitionForm({
  open,
  onOpenChange,
  onSubmit,
  item,
  isLoading = false,
}: PermissionDefinitionFormProps): ReactElement {
  const { t } = useTranslation(['access-control', 'common']);

  const form = useForm<CreatePermissionDefinitionSchema>({
    resolver: zodResolver(createPermissionDefinitionSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (item) {
      form.reset({
        code: item.code,
        name: item.name,
        description: item.description ?? '',
        isActive: item.isActive,
      });
    } else {
      form.reset({
        code: '',
        name: '',
        description: '',
        isActive: true,
      });
    }
  }, [item, form, open]);

  const permissionCodeOptions: ComboboxOption[] = useMemo(() => {
    return PERMISSION_CODE_CATALOG.map((code) => {
      const meta = getPermissionDisplayMeta(code);
      const title = meta ? t(meta.key, meta.fallback) : code;
      return { value: code, label: `${title} (${code})` };
    });
  }, [t]);

  const handleSubmit = async (data: CreatePermissionDefinitionSchema): Promise<void> => {
    await onSubmit(data);
    if (!isLoading) {
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white max-w-2xl w-[95%] sm:w-full shadow-2xl sm:rounded-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 flex flex-row items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
          <div className="space-y-1">
            <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {item
                ? t('permissionDefinitions.form.editTitle')
                : t('permissionDefinitions.form.addTitle')}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
              {item
                ? t('permissionDefinitions.form.editDescription')
                : t('permissionDefinitions.form.addDescription')}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <Form {...form}>
            <form id="permission-definition-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="inline-flex items-center" required={isZodFieldRequired(createPermissionDefinitionSchema, 'code')}>
                      {t('permissionDefinitions.form.code')}
                      <FieldHelpTooltip text={t('help.permissionDefinition.code')} />
                    </FormLabel>
                    <FormControl>
                      {item ? (
                        <Input {...field} maxLength={120} disabled />
                      ) : (
                        <Combobox
                          options={permissionCodeOptions}
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            const meta = getPermissionDisplayMeta(value);
                            const title = meta ? t(meta.key, meta.fallback) : '';
                            if (!form.getValues('name') && title) {
                              form.setValue('name', title, { shouldDirty: true });
                            }
                          }}
                          placeholder={t('permissionDefinitions.form.codePlaceholder')}
                          searchPlaceholder={t('permissionDefinitions.form.codeSearchPlaceholder')}
                          emptyText={t('permissionDefinitions.form.codeEmpty')}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                    {field.value ? (
                      <div className="pt-2">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {t('permissionDefinitions.form.affectedRoutes'
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {getRoutesForPermissionCode(field.value).length === 0 ? (
                            <span className="text-xs text-slate-400">
                              {t('permissionDefinitions.form.affectedRoutesNone'
                              )}
                            </span>
                          ) : (
                            getRoutesForPermissionCode(field.value).map((route) => (
                              <Badge key={route} variant="secondary" className="font-mono text-xs">
                                {route}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                    ) : null}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="inline-flex items-center" required={isZodFieldRequired(createPermissionDefinitionSchema, 'name')}>
                      {t('permissionDefinitions.form.name')}
                      <FieldHelpTooltip text={t('help.permissionDefinition.name')} />
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('permissionDefinitions.form.namePlaceholder')} maxLength={150} />
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
                    <FormLabel className="inline-flex items-center">
                      {t('permissionDefinitions.form.description')}
                      <FieldHelpTooltip text={t('help.permissionDefinition.description')} />
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value ?? ''} placeholder={t('permissionDefinitions.form.descriptionPlaceholder')} maxLength={500} className="min-h-[80px]" />
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
                      {t('permissionDefinitions.form.isActive')}
                      <FieldHelpTooltip text={t('help.permissionDefinition.isActive')} />
                    </FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
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
            <FieldHelpTooltip text={t('help.permissionDefinition.save')} side="top" />
            <Button type="submit" form="permission-definition-form" disabled={isLoading}>
              {isLoading ? t('common.saving') : t('common.save')}
            </Button>
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
