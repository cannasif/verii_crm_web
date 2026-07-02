import { type ReactElement, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Shield, Sparkles, X, Network, FileText, Info, type LucideIcon } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FieldHelpTooltip } from './FieldHelpTooltip';
import type { VisibilityPolicyDto } from '../types/access-control.types';
import { createVisibilityPolicySchema, type CreateVisibilityPolicySchema } from '../schemas/visibility-policy-schema';
import { getVisibilityEntityMeta, getVisibilityScopeMeta, VISIBILITY_ENTITY_OPTIONS, VISIBILITY_SCOPE_OPTIONS } from '../utils/visibility-options';
import { cn } from '@/lib/utils';
import {
  DOCUMENT_DIALOG_CLOSE_BUTTON_BASE_CLASS,
  DOCUMENT_LINE_FORM_SAVE_BUTTON_CLASS,
} from '@/lib/document-line-dialog-styles';

interface VisibilityPolicyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateVisibilityPolicySchema) => void | Promise<void>;
  item?: VisibilityPolicyDto | null;
  isLoading?: boolean;
}

const INPUT_STYLE = `
  h-11 rounded-lg
  bg-slate-50 dark:bg-white/5
  border border-slate-200 dark:border-white/10
  text-slate-900 dark:text-white text-sm
  placeholder:text-slate-400 dark:placeholder:text-slate-500
  focus-visible:bg-white dark:focus-visible:bg-white/5
  focus-visible:border-rose-500/70 focus-visible:ring-2 focus-visible:ring-rose-500/10 focus-visible:ring-offset-0
  transition-all duration-200 w-full
`;

const LABEL_STYLE = 'text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2';

const LABEL_ICON_WRAP_CLASS =
  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-accent text-primary ring-1 ring-inset ring-primary/15 dark:border-primary/25 dark:bg-primary/10';

function FormLabelIcon({ icon: Icon }: { icon: LucideIcon }): ReactElement {
  return (
    <span className={LABEL_ICON_WRAP_CLASS}>
      <Icon size={14} aria-hidden />
    </span>
  );
}

export function VisibilityPolicyForm({
  open,
  onOpenChange,
  onSubmit,
  item,
  isLoading = false,
}: VisibilityPolicyFormProps): ReactElement {
  const { t } = useTranslation(['access-control', 'common']);

  const form = useForm<CreateVisibilityPolicySchema>({
    resolver: zodResolver(createVisibilityPolicySchema),
    mode: 'onChange',
    defaultValues: {
      code: '',
      name: '',
      entityType: 'Activity',
      description: '',
      scopeType: 1,
      includeSelf: true,
      isActive: true,
    },
  });

  useEffect(() => {
    if (item) {
      form.reset({
        code: item.code,
        name: item.name,
        entityType: item.entityType,
        description: item.description ?? '',
        scopeType: item.scopeType,
        includeSelf: item.includeSelf,
        isActive: item.isActive,
      });
      return;
    }

    form.reset({
      code: '',
      name: '',
      entityType: 'Activity',
      description: '',
      scopeType: 1,
      includeSelf: true,
      isActive: true,
    });
  }, [item, form, open]);

  const handleSubmit = async (data: CreateVisibilityPolicySchema): Promise<void> => {
    await onSubmit(data);
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[95%] !max-w-4xl overflow-hidden flex flex-col border border-slate-100 dark:border-white/10 p-0 text-slate-900 shadow-2xl dark:bg-[#130822] dark:text-white sm:w-full rounded-2xl [&>button:last-of-type]:hidden">
        <DialogPrimitive.Close
          className={cn(
            'absolute right-6 top-6 z-50 h-10 w-10 rounded-full p-0 shadow-sm active:scale-90',
            DOCUMENT_DIALOG_CLOSE_BUTTON_BASE_CLASS
          )}
        >
          <X size={20} strokeWidth={2.5} />
        </DialogPrimitive.Close>

        <DialogHeader className="p-2 pb-0 shrink-0">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] border border-primary/15 bg-accent text-primary shadow-lg ring-1 ring-inset ring-primary/15 dark:border-primary/25 dark:bg-primary/10">
              <Shield size={32} strokeWidth={2.5} />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {item ? t('visibilityPolicies.form.editTitle') : t('visibilityPolicies.form.addTitle')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                {item ? t('visibilityPolicies.form.editDescription') : t('visibilityPolicies.form.addDescription')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-0 sm:pt-0 custom-scrollbar">
          <Form {...form}>
            <form id="visibility-policy-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="space-y-6 pt-6 border-t border-dashed border-slate-200 dark:border-white/10">
                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={LABEL_STYLE}>
                          <FormLabelIcon icon={Network} />
                          {t('visibilityPolicies.form.code')}
                          <FieldHelpTooltip text={t('help.visibilityPolicy.code')} />
                        </FormLabel>
                        <FormControl>
                          <Input {...field} className={INPUT_STYLE} placeholder={t('visibilityPolicies.form.codePlaceholder')} maxLength={120} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={LABEL_STYLE}>
                          <FormLabelIcon icon={FileText} />
                          {t('visibilityPolicies.form.name')}
                          <FieldHelpTooltip text={t('help.visibilityPolicy.name')} />
                        </FormLabel>
                        <FormControl>
                          <Input {...field} className={INPUT_STYLE} placeholder={t('visibilityPolicies.form.namePlaceholder')} maxLength={150} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="entityType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={LABEL_STYLE}>{t('visibilityPolicies.form.entityType')}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className={INPUT_STYLE}>
                              <SelectValue placeholder={t('visibilityPolicies.form.entityTypePlaceholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {VISIBILITY_ENTITY_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {t(option.labelKey, { defaultValue: option.fallback })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scopeType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={LABEL_STYLE}>{t('visibilityPolicies.form.scopeType')}</FormLabel>
                        <Select value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}>
                          <FormControl>
                            <SelectTrigger className={INPUT_STYLE}>
                              <SelectValue placeholder={t('visibilityPolicies.form.scopeTypePlaceholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {VISIBILITY_SCOPE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={String(option.value)}>
                                {t(option.labelKey, { defaultValue: option.fallback })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
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
                        <FormLabelIcon icon={Info} />
                        {t('visibilityPolicies.form.description')}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ''}
                          placeholder={t('visibilityPolicies.form.descriptionPlaceholder')}
                          maxLength={500}
                          className={cn(INPUT_STYLE, 'min-h-[96px] py-3')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="includeSelf"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-[0.65rem] border border-slate-200 bg-slate-50/50 p-2.5 px-4 dark:border-white/10 dark:bg-white/5 h-[45px]">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-bold flex items-center gap-2">
                            <FormLabelIcon icon={Sparkles} />
                            {t('visibilityPolicies.form.includeSelf')}
                            <FieldHelpTooltip text={t('help.visibilityPolicy.includeSelf')} />
                          </FormLabel>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-[0.65rem] border border-slate-200 bg-slate-50/50 p-2.5 px-4 dark:border-white/10 dark:bg-white/5 h-[45px]">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-bold flex items-center gap-2">
                            <FormLabelIcon icon={Sparkles} />
                            {t('visibilityPolicies.form.isActive')}
                            <FieldHelpTooltip text={t('help.visibilityPolicy.isActive')} />
                          </FormLabel>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  <div className="font-semibold text-slate-800 dark:text-white">{t('visibilityPolicies.form.summaryTitle')}</div>
                  <div className="mt-1">
                    {t('visibilityPolicies.form.summary', {
                      entity: t(getVisibilityEntityMeta(form.watch('entityType'))?.labelKey ?? 'visibilityPolicies.entity.activity', {
                        defaultValue: getVisibilityEntityMeta(form.watch('entityType'))?.fallback ?? 'Aktivite',
                      }),
                      scope: t(getVisibilityScopeMeta(form.watch('scopeType'))?.labelKey ?? 'visibilityPolicies.scope.self', {
                        defaultValue: getVisibilityScopeMeta(form.watch('scopeType'))?.fallback ?? 'Sadece kendisi',
                      }),
                    })}
                  </div>
                </div>
              </div>
            </form>
          </Form>
        </div>

        <DialogFooter className="px-8 py-4 shrink-0 border-t border-dashed border-slate-200 dark:border-white/10 mt-auto">
          <div className="flex flex-row items-center justify-end gap-3 w-full">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading} className="h-11 px-6 rounded-xl dark:bg-[#180F22] font-bold border border-slate-200 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10 text-xs sm:text-sm">
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              form="visibility-policy-form"
              disabled={isLoading || !form.formState.isValid}
              className={cn(
                DOCUMENT_LINE_FORM_SAVE_BUTTON_CLASS,
                'h-11 px-6 sm:px-10 text-xs sm:text-sm focus-visible:outline-none'
              )}
            >
              {isLoading ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
