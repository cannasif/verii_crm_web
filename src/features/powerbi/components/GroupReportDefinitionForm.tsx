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
import {
  powerbiGroupReportDefinitionFormSchema,
  type PowerBIGroupReportDefinitionFormSchema,
} from '../types/powerbiGroupReportDefinition.types';
import type { PowerBIGroupReportDefinitionGetDto } from '../types/powerbiGroupReportDefinition.types';
import { usePowerbiGroupList } from '../hooks/usePowerbiGroup';
import { usePowerbiReportDefinitionList } from '../hooks/usePowerbiReportDefinition';
import { Loader2, Layers, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

const GROUP_LIST_PARAMS = { pageNumber: 1, pageSize: 500 };
const REPORT_LIST_PARAMS = { pageNumber: 1, pageSize: 500, sortBy: 'Id', sortDirection: 'desc' as const };

interface GroupReportDefinitionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: PowerBIGroupReportDefinitionGetDto | null;
  onSubmit: (data: PowerBIGroupReportDefinitionFormSchema) => void | Promise<void>;
  isSubmitting: boolean;
}

export function GroupReportDefinitionForm({
  open,
  onOpenChange,
  initial,
  onSubmit,
  isSubmitting,
}: GroupReportDefinitionFormProps): ReactElement {
  const { t } = useTranslation();
  const { data: groupsData } = usePowerbiGroupList(GROUP_LIST_PARAMS);
  const { data: reportsData } = usePowerbiReportDefinitionList(REPORT_LIST_PARAMS);
  const groups = groupsData?.data ?? [];
  const reports = reportsData?.data ?? [];

  const form = useForm<PowerBIGroupReportDefinitionFormSchema>({
    resolver: zodResolver(powerbiGroupReportDefinitionFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      groupId: 0,
      reportDefinitionId: 0,
    },
  });
  const isFormValid = form.formState.isValid;

  useEffect(() => {
    if (initial) {
      form.reset({
        groupId: initial.groupId,
        reportDefinitionId: initial.reportDefinitionId,
      });
    } else {
      form.reset({
        groupId: 0,
        reportDefinitionId: 0,
      });
    }
  }, [initial, form, open]);

  const handleSubmit = async (data: PowerBIGroupReportDefinitionFormSchema): Promise<void> => {
    await onSubmit(data);
    if (!isSubmitting) {
      form.reset();
      onOpenChange(false);
    }
  };

  const selectTriggerClass = "w-full h-10 rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus:ring-pink-500/50 transition-all font-medium";
  const labelClass = "text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] !max-w-[900px] p-0 border-0 shadow-2xl bg-white dark:bg-[#180F22] rounded-3xl ring-1 ring-slate-200 dark:ring-white/10 flex flex-col overflow-hidden">
        <DialogPrimitive.Close className="absolute right-6 top-6 z-50 rounded-2xl bg-slate-100 p-2.5 text-slate-400 transition-all duration-200 hover:bg-red-600 hover:text-white active:scale-90 dark:bg-white/5 dark:text-white/40 dark:hover:bg-red-600 dark:hover:text-white">
          <X size={20} strokeWidth={2.5} />
        </DialogPrimitive.Close>

        <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-white/5 text-left">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-100 dark:bg-white/5 shadow-inner border border-pink-200 dark:border-white/10 relative overflow-hidden group">
              <div className="absolute inset-0 bg-linear-to-br from-pink-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Layers className="h-6 w-6 text-pink-600 dark:text-pink-400 relative z-10" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {initial ? t('powerbi.groupReportDefinition.edit') : t('powerbi.groupReportDefinition.add')}
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                {initial ? t('powerbi.groupReportDefinition.editDescription') : t('powerbi.groupReportDefinition.createDescription')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6 px-6 pt-2 pb-5">
              <FormField
                control={form.control}
                name="groupId"
                render={({ field }) => (
                  <FormItem>
                    <label className={labelClass}>{t('powerbi.groupReportDefinition.groupId')}</label>
                    <Select
                      onValueChange={(v) => field.onChange(Number(v))}
                      value={field.value ? String(field.value) : ''}
                    >
                      <FormControl>
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue placeholder={t('powerbi.groupReportDefinition.selectGroup')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-[var(--radix-select-trigger-width)] rounded-xl border-slate-200 dark:border-white/10 dark:bg-[#1E1627]">
                        {groups.map((g) => (
                          <SelectItem key={g.id} value={String(g.id)} className="rounded-lg focus:bg-pink-50 dark:focus:bg-pink-500/10">
                            {g.name}
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
                name="reportDefinitionId"
                render={({ field }) => (
                  <FormItem>
                    <label className={labelClass}>{t('powerbi.groupReportDefinition.reportDefinitionId')}</label>
                    <Select
                      onValueChange={(v) => field.onChange(Number(v))}
                      value={field.value ? String(field.value) : ''}
                    >
                      <FormControl>
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue placeholder={t('powerbi.groupReportDefinition.selectReport')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-[var(--radix-select-trigger-width)] rounded-xl border-slate-200 dark:border-white/10 dark:bg-[#1E1627]">
                        {reports.map((r) => (
                          <SelectItem key={r.id} value={String(r.id)} className="rounded-lg focus:bg-pink-50 dark:focus:bg-pink-500/10">
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
      </DialogContent>
    </Dialog>
  );
}
