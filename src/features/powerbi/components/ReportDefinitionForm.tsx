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
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import {
  powerbiReportDefinitionFormSchema,
  type PowerBIReportDefinitionFormSchema,
} from '../types/powerbiReportDefinition.types';
import type { PowerBIReportDefinitionGetDto } from '../types/powerbiReportDefinition.types';
import { Loader2, BarChart2, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

interface ReportDefinitionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: PowerBIReportDefinitionGetDto | null;
  onSubmit: (data: PowerBIReportDefinitionFormSchema) => void | Promise<void>;
  isSubmitting: boolean;
}

export function ReportDefinitionForm({
  open,
  onOpenChange,
  initial,
  onSubmit,
  isSubmitting,
}: ReportDefinitionFormProps): ReactElement {
  const { t } = useTranslation();
  const form = useForm<PowerBIReportDefinitionFormSchema>({
    resolver: zodResolver(powerbiReportDefinitionFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      workspaceId: '',
      reportId: '',
      datasetId: '',
      embedUrl: '',
      isActive: true,
      rlsRoles: '',
      allowedUserIds: '',
      allowedRoleIds: '',
    },
  });
  const isFormValid = form.formState.isValid;

  useEffect(() => {
    if (initial) {
      form.reset({
        name: initial.name,
        description: initial.description ?? '',
        workspaceId: initial.workspaceId,
        reportId: initial.reportId,
        datasetId: initial.datasetId ?? '',
        embedUrl: initial.embedUrl ?? '',
        isActive: initial.isActive,
        rlsRoles: initial.rlsRoles ?? '',
        allowedUserIds: initial.allowedUserIds ?? '',
        allowedRoleIds: initial.allowedRoleIds ?? '',
      });
    } else {
      form.reset({
        name: '',
        description: '',
        workspaceId: '',
        reportId: '',
        datasetId: '',
        embedUrl: '',
        isActive: true,
        rlsRoles: '',
        allowedUserIds: '',
        allowedRoleIds: '',
      });
    }
  }, [initial, form, open]);

  const handleSubmit = async (data: PowerBIReportDefinitionFormSchema): Promise<void> => {
    await onSubmit(data);
    if (!isSubmitting) {
      form.reset();
      onOpenChange(false);
    }
  };

  const inputClass = "h-10 rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50 transition-all font-medium";
  const monoInputClass = `${inputClass} font-mono text-sm`;
  const labelClass = "text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] !max-w-[800px] max-h-[calc(100dvh-1.5rem)] p-0 border-0 shadow-2xl bg-white dark:bg-[#180F22] rounded-3xl ring-1 ring-slate-200 dark:ring-white/10 flex flex-col overflow-hidden">
        <DialogPrimitive.Close className="absolute right-6 top-6 z-50 rounded-2xl bg-slate-100 p-2.5 text-slate-400 transition-all duration-200 hover:bg-red-600 hover:text-white active:scale-90 dark:bg-white/5 dark:text-white/40 dark:hover:bg-red-600 dark:hover:text-white">
          <X size={20} strokeWidth={2.5} />
        </DialogPrimitive.Close>

        <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-white/5 text-left shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-100 dark:bg-white/5 shadow-inner border border-pink-200 dark:border-white/10 relative overflow-hidden group">
              <div className="absolute inset-0 bg-linear-to-br from-pink-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <BarChart2 className="h-6 w-6 text-pink-600 dark:text-pink-400 relative z-10" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {initial ? t('powerbi.reportDefinition.edit') : t('powerbi.reportDefinition.add')}
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                {initial ? t('powerbi.reportDefinition.editDescription') : t('powerbi.reportDefinition.createDescription')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <div className="space-y-3 px-6 pt-2 pb-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <label className={labelClass}>{t('powerbi.reportDefinition.name')}</label>
                      <FormControl>
                        <Input {...field} placeholder={t('powerbi.reportDefinition.namePlaceholder')} className={inputClass} />
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
                      <label className={labelClass}>{t('powerbi.reportDefinition.description')}</label>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ''} rows={2} className="rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50 transition-all font-medium resize-none" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="workspaceId"
                  render={({ field }) => (
                    <FormItem>
                      <label className={labelClass}>{t('powerbi.reportDefinition.workspaceId')}</label>
                      <FormControl>
                        <Input {...field} placeholder="00000000-0000-0000-0000-000000000000" className={monoInputClass} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reportId"
                  render={({ field }) => (
                    <FormItem>
                      <label className={labelClass}>{t('powerbi.reportDefinition.reportId')}</label>
                      <FormControl>
                        <Input {...field} placeholder="00000000-0000-0000-0000-000000000000" className={monoInputClass} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="datasetId"
                  render={({ field }) => (
                    <FormItem>
                      <label className={labelClass}>{t('powerbi.reportDefinition.datasetId')}</label>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder="00000000-0000-0000-0000-000000000000" className={monoInputClass} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="embedUrl"
                  render={({ field }) => (
                    <FormItem>
                      <label className={labelClass}>{t('powerbi.reportDefinition.embedUrl')}</label>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} type="url" placeholder="https://..." className={inputClass} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1E1627] px-5 py-3">
                      <label className={labelClass}>{t('powerbi.reportDefinition.isActive')}</label>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rlsRoles"
                  render={({ field }) => (
                    <FormItem>
                      <label className={labelClass}>{t('powerbi.reportDefinition.rlsRoles')}</label>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} className={inputClass} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="allowedUserIds"
                  render={({ field }) => (
                    <FormItem>
                      <label className={labelClass}>{t('powerbi.reportDefinition.allowedUserIds')}</label>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} className={inputClass} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="allowedRoleIds"
                  render={({ field }) => (
                    <FormItem>
                      <label className={labelClass}>{t('powerbi.reportDefinition.allowedRoleIds')}</label>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} className={inputClass} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="border-t border-slate-100 dark:border-white/5 px-6 py-4 flex-col sm:flex-row gap-3 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                  className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 font-bold px-6 h-11"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !isFormValid}
                  className="rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_5px_15px_-5px_rgba(219,39,119,0.5)] disabled:opacity-30 disabled:hover:scale-100 px-8 h-11 gap-2"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('common.save')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
