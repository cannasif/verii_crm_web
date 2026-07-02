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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { powerbiRlsFormSchema, type PowerbiRlsFormSchema } from '../types/powerbiRls.types';
import type { PowerBIReportRoleMapping } from '../types/powerbiRls.types';
import { useUserAuthorityList } from '../hooks/usePowerbiRls';
import { usePowerbiReportDefinitionList } from '@/features/powerbi/hooks/usePowerbiReportDefinition';
import { Loader2, ShieldAlert, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { DOCUMENT_DIALOG_CLOSE_BUTTON_BASE_CLASS } from '@/lib/document-line-dialog-styles';

const REPORT_LIST_PARAMS = { pageNumber: 1, pageSize: 500, sortBy: 'Id', sortDirection: 'desc' as const };
const ROLE_LIST_PARAMS = { pageNumber: 1, pageSize: 500 };

interface PowerbiRlsFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: PowerBIReportRoleMapping | null;
  onSubmit: (data: PowerbiRlsFormSchema) => void | Promise<void>;
  isSubmitting: boolean;
}

export function PowerbiRlsForm({
  open,
  onOpenChange,
  initial,
  onSubmit,
  isSubmitting,
}: PowerbiRlsFormProps): ReactElement {
  const { t } = useTranslation();
  const { data: reportsData } = usePowerbiReportDefinitionList(REPORT_LIST_PARAMS);
  const { data: rolesData } = useUserAuthorityList(ROLE_LIST_PARAMS);
  const reports = reportsData?.data ?? [];
  const roles = rolesData?.data ?? [];

  const form = useForm<PowerbiRlsFormSchema>({
    resolver: zodResolver(powerbiRlsFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      powerBIReportDefinitionId: 0,
      roleId: 0,
      rlsRoles: '',
    },
  });
  const isFormValid = form.formState.isValid;

  useEffect(() => {
    if (initial) {
      form.reset({
        powerBIReportDefinitionId: initial.powerBIReportDefinitionId,
        roleId: initial.roleId,
        rlsRoles: initial.rlsRoles,
      });
    } else {
      form.reset({
        powerBIReportDefinitionId: 0,
        roleId: 0,
        rlsRoles: '',
      });
    }
  }, [initial, form, open]);

  const selectTriggerClass = "w-full h-10 rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-primary/40 dark:focus:ring-primary/25 transition-all font-medium";
  const selectItemClass = "rounded-lg focus:bg-accent focus:text-primary data-[highlighted]:bg-accent/80 data-[highlighted]:text-primary dark:focus:bg-primary/12 dark:focus:text-primary dark:data-[highlighted]:bg-primary/12 dark:data-[highlighted]:text-primary";
  const inputClass = "w-full h-10 rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 dark:focus-visible:border-primary/40 dark:focus-visible:ring-primary/25 transition-all font-medium";
  const labelClass = "text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] !max-w-[900px] p-0 border-0 shadow-2xl bg-white dark:bg-[#180F22] rounded-3xl ring-1 ring-slate-200 dark:ring-white/10 flex flex-col overflow-hidden">
        <DialogPrimitive.Close
          className={cn(
            'absolute right-6 top-6 z-50 size-10 rounded-2xl p-2.5 active:scale-90',
            DOCUMENT_DIALOG_CLOSE_BUTTON_BASE_CLASS
          )}
        >
          <X size={20} strokeWidth={2.5} />
        </DialogPrimitive.Close>

        <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-white/5 text-left">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-accent text-primary ring-1 ring-inset ring-primary/15 dark:border-primary/25 dark:bg-primary/10">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {initial ? t('powerbiRls.edit') : t('powerbiRls.new')}
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                {t('powerbiRls.description')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4 px-6 pt-2 pb-5">
              <FormField
                control={form.control}
                name="powerBIReportDefinitionId"
                render={({ field }) => (
                  <FormItem>
                    <label className={labelClass}>{t('powerbiRls.report')}</label>
                    <Select
                      onValueChange={(v) => field.onChange(Number(v))}
                      value={field.value ? String(field.value) : ''}
                    >
                      <FormControl>
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue placeholder={t('powerbiRls.report')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-[var(--radix-select-trigger-width)] rounded-xl border-slate-200 dark:border-white/10 dark:bg-[#1E1627]">
                        {reports.map((r) => (
                          <SelectItem key={r.id} value={String(r.id)} className={selectItemClass}>
                            {r.name}
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
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <label className={labelClass}>{t('powerbiRls.role')}</label>
                    <Select
                      onValueChange={(v) => field.onChange(Number(v))}
                      value={field.value ? String(field.value) : ''}
                    >
                      <FormControl>
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue placeholder={t('powerbiRls.role')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-[var(--radix-select-trigger-width)] rounded-xl border-slate-200 dark:border-white/10 dark:bg-[#1E1627]">
                        {roles.map((r) => (
                          <SelectItem key={r.id} value={String(r.id)} className={selectItemClass}>
                            {r.title}
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
                name="rlsRoles"
                render={({ field }) => (
                  <FormItem>
                    <label className={labelClass}>{t('powerbiRls.rlsRoles')}</label>
                    <FormControl>
                      <Input
                        placeholder={t('powerbiRls.rlsRolesPlaceholder')}
                        {...field}
                        className={inputClass}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="border-t border-slate-100 dark:border-white/5 px-6 py-4 flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 font-bold px-6 h-11"
              >
                {t('powerbiRls.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !isFormValid}
                className="rounded-xl bg-[image:var(--crm-brand-gradient)] text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_20px_-10px_var(--crm-brand-shadow)] disabled:opacity-30 px-8 h-11 gap-2 opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('powerbiRls.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
