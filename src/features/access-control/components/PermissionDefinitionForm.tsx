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
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import {
  createPermissionDefinitionSchema,
  type CreatePermissionDefinitionSchema,
} from '../schemas/permission-definition-schema';
import type { PermissionDefinitionDto } from '../types/access-control.types';
import { FieldHelpTooltip } from './FieldHelpTooltip';
import { PERMISSION_CODE_CATALOG, getRoutesForPermissionCode, getPermissionDisplayLabel } from '../utils/permission-config';
import { Badge } from '@/components/ui/badge';
import { isZodFieldRequired } from '@/lib/zod-required';
import { KeyRound, Sparkles } from 'lucide-react';

interface PermissionDefinitionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePermissionDefinitionSchema) => void | Promise<void>;
  item?: PermissionDefinitionDto | null;
  isLoading?: boolean;
  usedCodes?: string[];
}

export function PermissionDefinitionForm({
  open,
  onOpenChange,
  onSubmit,
  item,
  isLoading = false,
  usedCodes = [],
}: PermissionDefinitionFormProps): ReactElement {
  const { t } = useTranslation(['access-control', 'common']);

  const form = useForm<CreatePermissionDefinitionSchema>({
    resolver: zodResolver(createPermissionDefinitionSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      code: '',
      name: '',
      description: '',
      isActive: true,
    },
  });
  const isFormValid = form.formState.isValid;

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
    const usedSet = new Set(usedCodes.map((code) => code.toLowerCase()));
    const currentCode = item?.code?.toLowerCase();

    return PERMISSION_CODE_CATALOG.filter((code) => {
      const lowerCode = code.toLowerCase();
      if (currentCode && lowerCode === currentCode) return true;
      return !usedSet.has(lowerCode);
    }).map((code) => {
      const title = getPermissionDisplayLabel(code, (key, fallback) => t(key, fallback));
      return { value: code, label: `${title} (${code})` };
    });
  }, [t, usedCodes, item?.code]);

  const handleSubmit = async (data: CreatePermissionDefinitionSchema): Promise<void> => {
    await onSubmit(data);
    if (!isLoading) {
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95%] max-w-2xl overflow-visible border border-slate-100 bg-white p-0 text-slate-900 shadow-2xl dark:border-white/10 dark:bg-[#130822] dark:text-white sm:w-full sm:rounded-2xl">
        <DialogHeader className="sticky top-0 z-10 border-b border-slate-100 bg-linear-to-r from-slate-50 via-white to-cyan-50/50 px-6 py-5 backdrop-blur-sm dark:border-white/5 dark:from-[#1a1025] dark:via-[#130822] dark:to-cyan-950/30">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-white/80 px-3 py-1.5 text-xs font-black text-cyan-700 shadow-sm dark:border-cyan-800/40 dark:bg-blue-950/60 dark:text-cyan-300">
              <Sparkles className="size-4" />
              {item ? t('permissionDefinitions.form.editTitle') : t('permissionDefinitions.form.addTitle')}
            </div>
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
              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
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
                      <Combobox
                        options={permissionCodeOptions}
                        value={field.value}
                        modal
                        onValueChange={(value) => {
                          field.onChange(value);
                          const title = getPermissionDisplayLabel(value, (key, fallback) => t(key, fallback));
                          if (!form.getValues('name') && title) {
                            form.setValue('name', title, { shouldDirty: true });
                          }
                        }}
                        placeholder={t('permissionDefinitions.form.codePlaceholder')}
                        searchPlaceholder={t('permissionDefinitions.form.codeSearchPlaceholder')}
                        emptyText={t('permissionDefinitions.form.codeEmpty')}
                      />
                    </FormControl>
                    <FormMessage />
                    {field.value ? (
                      <div className="pt-3">
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
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>
            </form>
          </Form>
        </div>

        <DialogFooter className="px-6 py-5 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <span className="inline-flex items-center gap-1">
            <FieldHelpTooltip text={t('help.permissionDefinition.save')} side="top" />
            <Button type="submit" form="permission-definition-form" disabled={isLoading || !isFormValid} className="rounded-2xl bg-linear-to-r from-pink-600 to-orange-600 text-white shadow-lg shadow-pink-500/20 hover:text-white">
              <KeyRound className="mr-2 size-4" />
              {isLoading ? t('common.saving') : t('common.save')}
            </Button>
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
