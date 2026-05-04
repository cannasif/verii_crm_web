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
import * as DialogPrimitive from "@radix-ui/react-dialog";
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
import { ShieldCheck, Sparkles, X, FileText, Info, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PermissionGroupFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePermissionGroupSchema) => void | Promise<void>;
  item?: PermissionGroupDto | null;
  isLoading?: boolean;
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
      <DialogContent className="max-h-[92dvh] w-[95%] !max-w-5xl overflow-hidden flex flex-col border border-slate-100 dark:border-white/10 p-0 text-slate-900 shadow-2xl dark:bg-[#130822] dark:text-white sm:w-full rounded-2xl [&>button:last-of-type]:hidden">
        <DialogPrimitive.Close className="absolute right-6 top-6 z-50 rounded-2xl bg-slate-100 p-2.5 text-slate-400 transition-all duration-200 hover:bg-red-600 hover:text-white active:scale-90 dark:bg-white/5 dark:text-white/40 dark:hover:bg-red-600 dark:hover:text-white">
          <X size={20} strokeWidth={2.5} />
        </DialogPrimitive.Close>

        <DialogHeader className="p-2 pb-0 shrink-0">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] bg-linear-to-br from-pink-500 to-orange-500 shadow-lg shadow-pink-500/20">
              <ShieldCheck size={32} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="space-y-1">

              <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {item
                  ? t('permissionGroups.form.editTitle')
                  : t('permissionGroups.form.addTitle')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                {item
                  ? t('permissionGroups.form.editDescription')
                  : t('permissionGroups.form.addDescription')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-0 sm:pt-0 custom-scrollbar">
          <Form {...form}>
            <form id="permission-group-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="space-y-6 pt-6 border-t border-dashed border-slate-200 dark:border-white/10">
                <div className="grid gap-6 sm:grid-cols-2 items-start">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={LABEL_STYLE}>
                          <FileText size={16} className="text-pink-500" />
                          {t('permissionGroups.form.name')}
                          <FieldHelpTooltip text={t('help.permissionGroup.name')} />
                          {isZodFieldRequired(createPermissionGroupSchema, 'name') && <span className="text-destructive ml-0.5">*</span>}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} className={INPUT_STYLE} placeholder={t('permissionGroups.form.namePlaceholder')} maxLength={100} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-[0.65rem] border border-slate-200 bg-slate-50/50 p-2.5 px-4 dark:border-white/10 dark:bg-white/5 h-[45px] mt-[34px]">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-bold flex items-center gap-2">
                            <Sparkles size={16} className="text-pink-500" />
                            {t('permissionGroups.form.isActive')}
                            <FieldHelpTooltip text={t('help.permissionGroup.isActive')} />
                          </FormLabel>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}>
                        <Info size={16} className="text-pink-500" />
                        {t('permissionGroups.form.description')}
                      </FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ''} placeholder={t('permissionGroups.form.descriptionPlaceholder')} maxLength={500} className={cn(INPUT_STYLE, "min-h-[100px] py-3")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="permissionDefinitionIds"
                  render={({ field }) => (
                    <FormItem className="w-full overflow-hidden">
                      <FormLabel className={cn(LABEL_STYLE, "mb-3")}>
                        <Lock size={16} className="text-pink-500" />
                        {t('permissionGroups.form.permissions')}
                        <FieldHelpTooltip text={t('help.permissionGroup.permissions')} />
                      </FormLabel>
                      <FormControl className="w-full overflow-hidden">
                        <PermissionDefinitionMultiSelect value={field.value} onChange={field.onChange} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </div>

        <DialogFooter className="px-8 py-4 shrink-0 border-t border-dashed border-slate-200 dark:border-white/10 mt-auto">
          <div className="flex flex-row items-center justify-end gap-3 w-full">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading} className="h-11 px-6 rounded-xl dark:bg-[#180F22] font-bold border border-slate-200 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10 text-xs sm:text-sm">
              {t('common.cancel')}
            </Button>
            <div className="inline-flex items-center gap-2">
              <FieldHelpTooltip text={t('help.permissionGroup.save')} side="top" />
              <Button
                type="submit"
                form="permission-group-form"
                disabled={isLoading || !isFormValid}
                className="h-11 px-6 sm:px-10 rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-pink-500/25 text-xs sm:text-sm opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
              >
                {isLoading ? (
                  <>
                    <X className="mr-2 size-4 animate-spin" />
                    {t('common.saving')}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 size-4" />
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
