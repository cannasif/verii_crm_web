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
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { PERMISSION_CODE_CATALOG, getRoutesForPermissionCode, getPermissionDisplayLabel, inferPermissionPlatforms } from '../utils/permission-config';
import { Badge } from '@/components/ui/badge';
import { isZodFieldRequired } from '@/lib/zod-required';
import { KeyRound, X, FileText, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PermissionDefinitionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePermissionDefinitionSchema) => void | Promise<void>;
  item?: PermissionDefinitionDto | null;
  isLoading?: boolean;
  usedCodes?: string[];
}

const INPUT_STYLE = `
  h-11 rounded-lg
  bg-slate-50 dark:bg-white/5
  border border-slate-200 dark:border-white/10
  text-slate-900 dark:text-white text-sm
  placeholder:text-slate-400 dark:placeholder:text-slate-500
  focus-visible:bg-white dark:focus-visible:bg-white/5
  focus-visible:border-pink-500/70 focus-visible:ring-2 focus-visible:ring-pink-500/10 focus-visible:ring-offset-0
  transition-all duration-200 w-full
`;

const LABEL_STYLE = 'text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2';

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
      availableOnWeb: true,
      availableOnMobile: false,
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
        availableOnWeb: item.availableOnWeb,
        availableOnMobile: item.availableOnMobile,
      });
    } else {
      form.reset({
        code: '',
        name: '',
        description: '',
        isActive: true,
        availableOnWeb: true,
        availableOnMobile: false,
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
      <DialogContent className="max-h-[92dvh] w-[98vw] !max-w-5xl overflow-hidden flex flex-col border-none p-0 text-slate-900 shadow-2xl dark:bg-[#130822] dark:text-white sm:w-[90vw] rounded-[2.5rem] [&>button:last-of-type]:hidden">
        <DialogPrimitive.Close className="absolute right-6 top-6 z-50 rounded-2xl bg-slate-100 p-2.5 text-slate-400 transition-all duration-200 hover:bg-red-600 hover:text-white active:scale-90 dark:bg-white/5 dark:text-white/40 dark:hover:bg-red-600 dark:hover:text-white">
          <X size={20} strokeWidth={2.5} />
        </DialogPrimitive.Close>

        <DialogHeader className="p-4 pb-4 shrink-0">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] bg-linear-to-br from-pink-500 to-orange-500 shadow-lg shadow-pink-500/20">
              <KeyRound size={32} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {item
                  ? t('permissionDefinitions.form.editTitle')
                  : t('permissionDefinitions.form.addTitle')}
              </DialogTitle>
              <DialogDescription className="flex text-slate-500 dark:text-slate-400 text-sm font-medium">
                {item
                  ? t('permissionDefinitions.form.editDescription')
                  : t('permissionDefinitions.form.addDescription')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-0 sm:pt-0 custom-scrollbar">
          <Form {...form}>
            <form id="permission-definition-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="space-y-6 pt-4 border-t border-dashed border-slate-200 dark:border-white/10">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}>
                        <KeyRound size={16} className="text-pink-500" />
                        {t('permissionDefinitions.form.code')}
                        <FieldHelpTooltip text={t('help.permissionDefinition.code')} />
                        {isZodFieldRequired(createPermissionDefinitionSchema, 'code') && <span className="text-destructive ml-0.5">*</span>}
                      </FormLabel>
                      <FormControl>
                        <Combobox
                          options={permissionCodeOptions}
                          value={field.value}
                          modal
                          onValueChange={(value) => {
                            field.onChange(value);
                            const title = getPermissionDisplayLabel(value, (key, fallback) => t(key, fallback));
                            const platforms = inferPermissionPlatforms(value);
                            if (!form.getValues('name') && title) {
                              form.setValue('name', title, { shouldDirty: true });
                            }
                            form.setValue('availableOnWeb', platforms.availableOnWeb, { shouldDirty: true });
                            form.setValue('availableOnMobile', platforms.availableOnMobile, { shouldDirty: true });
                          }}
                          placeholder={t('permissionDefinitions.form.codePlaceholder')}
                          searchPlaceholder={t('permissionDefinitions.form.codeSearchPlaceholder')}
                          emptyText={t('permissionDefinitions.form.codeEmpty')}
                          className={cn(INPUT_STYLE, "justify-start px-3 h-11 font-medium")}
                        />
                      </FormControl>
                      <FormMessage />
                      {field.value ? (
                        <div className="mt-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 p-4">
                          <div className="flex items-center gap-2 mb-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <Info size={14} className="text-pink-500" />
                            {t('permissionDefinitions.form.affectedRoutes')}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {getRoutesForPermissionCode(field.value).length === 0 ? (
                              <span className="text-xs text-slate-400 font-medium">
                                {t('permissionDefinitions.form.affectedRoutesNone')}
                              </span>
                            ) : (
                              getRoutesForPermissionCode(field.value).map((route) => (
                                <Badge key={route} variant="secondary" className="font-mono text-[10px] bg-white dark:bg-white/10 border-slate-200 dark:border-white/10">
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

                <div className="grid gap-6 sm:grid-cols-1">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={LABEL_STYLE}>
                          <FileText size={16} className="text-pink-500" />
                          {t('permissionDefinitions.form.name')}
                          <FieldHelpTooltip text={t('help.permissionDefinition.name')} />
                          {isZodFieldRequired(createPermissionDefinitionSchema, 'name') && <span className="text-destructive ml-0.5">*</span>}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} className={INPUT_STYLE} placeholder={t('permissionDefinitions.form.namePlaceholder')} maxLength={150} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="availableOnWeb"
                    render={({ field }) => (
                      <FormItem className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                        <div className="flex items-start gap-3">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className={LABEL_STYLE}>
                              {t('permissionDefinitions.form.availableOnWeb')}
                            </FormLabel>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              {t('permissionDefinitions.form.availableOnWebHint')}
                            </p>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="availableOnMobile"
                    render={({ field }) => (
                      <FormItem className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                        <div className="flex items-start gap-3">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className={LABEL_STYLE}>
                              {t('permissionDefinitions.form.availableOnMobile')}
                            </FormLabel>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              {t('permissionDefinitions.form.availableOnMobileHint')}
                            </p>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={LABEL_STYLE}>
                          <Info size={16} className="text-pink-500" />
                          {t('permissionDefinitions.form.description')}
                          <FieldHelpTooltip text={t('help.permissionDefinition.description')} />
                        </FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value ?? ''} placeholder={t('permissionDefinitions.form.descriptionPlaceholder')} maxLength={500} className={cn(INPUT_STYLE, "min-h-[100px] py-3")} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </form>
          </Form>
        </div>

        <DialogFooter className="px-8 py-6 shrink-0 border-t border-dashed border-slate-200 dark:border-white/10 mt-auto">
          <div className="flex flex-row items-center justify-end gap-3 w-full">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading} className="h-11 px-6 rounded-xl dark:bg-[#180F22] font-bold border border-slate-200 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10 text-xs sm:text-sm">
              {t('common.cancel')}
            </Button>
            <div className="inline-flex items-center gap-2">
              <FieldHelpTooltip text={t('help.permissionDefinition.save')} side="top" />
              <Button
                type="submit"
                form="permission-definition-form"
                disabled={isLoading || !isFormValid}
                className="h-11 px-6 sm:px-10 rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-pink-500/25 text-xs sm:text-sm opacity-75 grayscale-[0] dark:opacity-100 dark:grayscale-0"
              >
                {isLoading ? (
                  <>
                    <X className="mr-2 size-4 animate-spin" />
                    {t('common.saving')}
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 size-4" />
                    {t('common.save')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
