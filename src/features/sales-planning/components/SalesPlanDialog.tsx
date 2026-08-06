import { useEffect, type ReactElement } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, Target, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import {
  useCreateSalesPlanMutation,
  useSalesPlanDetailQuery,
  useSalesPlanTargetUsersQuery,
  useUpdateSalesPlanMutation,
} from '../hooks/useSalesPlanning';
import { SalesPlanStatus, SalesTargetMetric } from '../types/sales-planning.types';
import {
  COUNT_METRICS,
  getMetricKey,
  getMonthLabel,
  SALES_TARGET_METRICS,
} from '../utils/sales-planning-options';
import { SalesPlanStatusBadge } from './SalesPlanStatusBadge';

const targetSchema = z.object({
  userId: z.number().int().positive(),
  month: z.number().int().min(1).max(12),
  metric: z.number().int().min(0).max(6),
  targetValue: z.number().min(0).max(999_999_999_999),
  notes: z.string().max(500),
});

const formSchema = z.object({
  name: z.string().trim().min(3).max(150),
  planYear: z.number().int().min(2000).max(2100),
  currency: z.string().trim().regex(/^\d{1,3}$/),
  description: z.string().max(1000),
  targets: z.array(targetSchema).max(10_000),
});

type SalesPlanFormValues = z.infer<typeof formSchema>;

const EMPTY_VALUES: SalesPlanFormValues = {
  name: '',
  planYear: new Date().getFullYear(),
  currency: '0',
  description: '',
  targets: [],
};

interface SalesPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: number | null;
  canManagePermission: boolean;
}

export function SalesPlanDialog({
  open,
  onOpenChange,
  planId,
  canManagePermission,
}: SalesPlanDialogProps): ReactElement {
  const { t, i18n } = useTranslation('sales-planning');
  const isCreate = planId == null;
  const detailQuery = useSalesPlanDetailQuery(planId, open && !isCreate);
  const plan = detailQuery.data;
  const editable = canManagePermission && (isCreate || (plan?.canEdit === true && plan.status === SalesPlanStatus.Draft));
  const targetUsersQuery = useSalesPlanTargetUsersQuery(open && editable);
  const createMutation = useCreateSalesPlanMutation();
  const updateMutation = useUpdateSalesPlanMutation();
  const { currencyOptions, isLoading: isCurrencyLoading } = useCurrencyOptions();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const form = useForm<SalesPlanFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY_VALUES,
    mode: 'onBlur',
  });
  const targets = useFieldArray({ control: form.control, name: 'targets' });

  useEffect(() => {
    if (!open) return;
    if (isCreate) {
      form.reset(EMPTY_VALUES);
      return;
    }
    if (!plan) return;
    form.reset({
      name: plan.name,
      planYear: plan.planYear,
      currency: plan.currency,
      description: plan.description ?? '',
      targets: plan.targets.map((target) => ({
        userId: target.userId,
        month: target.month,
        metric: target.metric,
        targetValue: target.targetValue,
        notes: target.notes ?? '',
      })),
    });
  }, [form, isCreate, open, plan]);

  const handleSubmit = async (values: SalesPlanFormValues): Promise<void> => {
    const duplicateKeys = new Set<string>();
    for (const target of values.targets) {
      const key = `${target.userId}:${target.month}:${target.metric}`;
      if (duplicateKeys.has(key)) {
        toast.error(t('validation.duplicateTarget'));
        return;
      }
      duplicateKeys.add(key);
      if (COUNT_METRICS.has(target.metric as SalesTargetMetric) && !Number.isInteger(target.targetValue)) {
        toast.error(t('validation.wholeNumber'));
        return;
      }
    }

    const normalizedTargets = values.targets.map((target) => ({
      ...target,
      metric: target.metric as SalesTargetMetric,
      notes: target.notes.trim() || null,
    }));

    try {
      if (isCreate) {
        await createMutation.mutateAsync({
          name: values.name.trim(),
          planYear: values.planYear,
          currency: values.currency.trim().toUpperCase(),
          description: values.description.trim() || null,
          targets: normalizedTargets,
        });
      } else if (plan) {
        await updateMutation.mutateAsync({
          id: plan.id,
          payload: {
            name: values.name.trim(),
            currency: values.currency.trim().toUpperCase(),
            description: values.description.trim() || null,
            rowVersion: plan.rowVersion,
            targets: normalizedTargets,
          },
        });
      }
      onOpenChange(false);
    } catch {
      // Mutation hooks keep the form open and show the localized API error.
    }
  };

  const addTarget = (): void => {
    targets.append({
      userId: targetUsersQuery.data?.[0]?.id ?? 0,
      month: new Date().getMonth() + 1,
      metric: SalesTargetMetric.NetOrderAmount,
      targetValue: 0,
      notes: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSaving && onOpenChange(nextOpen)}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1rem)] !max-w-[1180px] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)]">
        <DialogHeader className="border-b px-5 py-4 pr-14 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Target className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle>{isCreate ? t('form.createTitle') : t('form.detailTitle')}</DialogTitle>
              <DialogDescription>{isCreate ? t('form.createDescription') : t('form.detailDescription')}</DialogDescription>
            </div>
            {plan ? <SalesPlanStatusBadge status={plan.status} /> : null}
          </div>
        </DialogHeader>

        {detailQuery.isLoading && !isCreate ? (
          <div className="space-y-4 overflow-y-auto p-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : detailQuery.isError && !isCreate ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-destructive">{t('errors.detail')}</p>
            <Button type="button" variant="outline" onClick={() => void detailQuery.refetch()}>{t('actions.retry')}</Button>
          </div>
        ) : (
          <form id="sales-plan-form" onSubmit={form.handleSubmit(handleSubmit)} className="min-h-0 overflow-y-auto">
            <div className="grid gap-4 border-b p-5 sm:grid-cols-2 lg:grid-cols-4 sm:p-6">
              <div className="space-y-1.5 lg:col-span-2">
                <Label htmlFor="sales-plan-name">{t('form.name')}</Label>
                <Input id="sales-plan-name" maxLength={150} disabled={!editable} {...form.register('name')} />
                {form.formState.errors.name ? <p className="text-xs text-destructive">{t('validation.name')}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sales-plan-year">{t('form.year')}</Label>
                <Input
                  id="sales-plan-year"
                  type="number"
                  min={2000}
                  max={2100}
                  disabled={!isCreate || !editable}
                  {...form.register('planYear', { valueAsNumber: true })}
                />
                {form.formState.errors.planYear ? <p className="text-xs text-destructive">{t('validation.year')}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sales-plan-currency">{t('form.currency')}</Label>
                <Select
                  value={form.watch('currency')}
                  onValueChange={(value) => form.setValue('currency', value, { shouldDirty: true, shouldValidate: true })}
                  disabled={!editable || isCurrencyLoading}
                >
                  <SelectTrigger id="sales-plan-currency" className="w-full" isLoading={isCurrencyLoading}>
                    <SelectValue placeholder={t('form.selectCurrency')} />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((option) => (
                      <SelectItem key={option.dovizTipi} value={String(option.dovizTipi)}>
                        {option.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.currency ? <p className="text-xs text-destructive">{t('validation.currency')}</p> : null}
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
                <Label htmlFor="sales-plan-description">{t('form.description')}</Label>
                <Textarea id="sales-plan-description" maxLength={1000} rows={2} disabled={!editable} {...form.register('description')} />
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{t('targets.title')}</h3>
                  <p className="text-xs text-muted-foreground">{t('targets.description')}</p>
                </div>
                {editable ? (
                  <Button type="button" variant="outline" size="sm" onClick={addTarget} disabled={targetUsersQuery.isLoading || (targetUsersQuery.data?.length ?? 0) === 0}>
                    {targetUsersQuery.isLoading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    {t('actions.addTarget')}
                  </Button>
                ) : null}
              </div>

              {targets.fields.length === 0 ? (
                <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {editable && !targetUsersQuery.isLoading && (targetUsersQuery.data?.length ?? 0) === 0
                    ? t('targets.noSalespeople')
                    : t('targets.empty')}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <div className="min-w-[980px]">
                    <div className="grid grid-cols-[220px_140px_220px_150px_minmax(180px,1fr)_48px] gap-2 border-b bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">
                      <span>{t('targets.salesperson')}</span>
                      <span>{t('targets.month')}</span>
                      <span>{t('targets.metric')}</span>
                      <span>{t('targets.value')}</span>
                      <span>{t('targets.notes')}</span>
                      <span className="sr-only">{t('targets.actions')}</span>
                    </div>
                    {targets.fields.map((target, index) => {
                      const detailTarget = plan?.targets[index];
                      return (
                        <div key={target.id} className="grid grid-cols-[220px_140px_220px_150px_minmax(180px,1fr)_48px] items-start gap-2 border-b px-3 py-3 last:border-b-0">
                          {editable ? (
                            <Select
                              value={String(form.watch(`targets.${index}.userId`) || '')}
                              onValueChange={(value) => form.setValue(`targets.${index}.userId`, Number(value), { shouldDirty: true })}
                              disabled={targetUsersQuery.isLoading}
                            >
                              <SelectTrigger className="w-full" isLoading={targetUsersQuery.isLoading}><SelectValue placeholder={t('targets.selectSalesperson')} /></SelectTrigger>
                              <SelectContent>
                                {(targetUsersQuery.data ?? []).map((user) => (
                                  <SelectItem key={user.id} value={String(user.id)}>{user.fullName || user.username}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="min-h-9 px-3 py-2 text-sm">{detailTarget?.userName || '-'}</div>
                          )}
                          <Select
                            value={String(form.watch(`targets.${index}.month`))}
                            onValueChange={(value) => form.setValue(`targets.${index}.month`, Number(value), { shouldDirty: true })}
                            disabled={!editable}
                          >
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>{Array.from({ length: 12 }, (_, month) => month + 1).map((month) => <SelectItem key={month} value={String(month)}>{getMonthLabel(month, i18n.language)}</SelectItem>)}</SelectContent>
                          </Select>
                          <Select
                            value={String(form.watch(`targets.${index}.metric`))}
                            onValueChange={(value) => form.setValue(`targets.${index}.metric`, Number(value), { shouldDirty: true })}
                            disabled={!editable}
                          >
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>{SALES_TARGET_METRICS.map((metric) => <SelectItem key={metric} value={String(metric)}>{t(`metric.${getMetricKey(metric)}`)}</SelectItem>)}</SelectContent>
                          </Select>
                          <Input type="number" min={0} step="0.000001" disabled={!editable} {...form.register(`targets.${index}.targetValue`, { valueAsNumber: true })} />
                          <Input maxLength={500} disabled={!editable} {...form.register(`targets.${index}.notes`)} />
                          {editable ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="size-9 text-destructive" onClick={() => targets.remove(index)} aria-label={t('actions.removeTarget')}>
                                  <Trash2 className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('actions.removeTarget')}</TooltipContent>
                            </Tooltip>
                          ) : <span />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </form>
        )}

        <DialogFooter className="border-t px-5 py-4 sm:px-6">
          <Button type="button" variant="outline" disabled={isSaving} onClick={() => onOpenChange(false)}>{t('actions.close')}</Button>
          {editable ? (
            <Button type="submit" form="sales-plan-form" disabled={isSaving || detailQuery.isLoading}>
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              {isCreate ? t('actions.create') : t('actions.save')}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
