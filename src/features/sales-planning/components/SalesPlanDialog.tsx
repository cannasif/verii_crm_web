import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { CopyPlus, Loader2, Plus, Target, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
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
import { SalesPlanPeriodType, SalesPlanStatus, SalesTargetMetric } from '../types/sales-planning.types';
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
  periodStart: z.string().min(10),
  metric: z.number().int().min(1).max(7),
  targetValue: z.number().min(0).max(999_999_999_999),
  notes: z.string().max(500),
});

const formSchema = z.object({
  name: z.string().trim().min(3).max(150),
  planYear: z.number().int().min(2000).max(2100),
  startDate: z.string().min(10),
  endDate: z.string().min(10),
  periodType: z.number().int().min(1).max(2),
  currency: z.string().trim().regex(/^\d{1,3}$/),
  description: z.string().max(1000),
  targets: z.array(targetSchema).max(10_000),
});

type SalesPlanFormValues = z.infer<typeof formSchema>;

interface QuickTargetValues {
  userId: number;
  month: number;
  periodStart: string;
  metric: SalesTargetMetric;
  targetValue: string;
}

const currentYear = new Date().getFullYear();
const EMPTY_VALUES: SalesPlanFormValues = {
  name: '',
  planYear: currentYear,
  startDate: `${currentYear}-01-01`,
  endDate: `${currentYear}-12-31`,
  periodType: SalesPlanPeriodType.Monthly,
  currency: '0',
  description: '',
  targets: [],
};

function toDateInput(value: string): string {
  return value.slice(0, 10);
}

function getMonthlyPeriods(startDate: string, endDate: string): string[] {
  if (!startDate || !endDate || startDate > endDate) return [];
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const result: string[] = [];
  while (cursor <= end && result.length < 120) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return result;
}

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
  const [quickTarget, setQuickTarget] = useState<QuickTargetValues>({
    userId: 0,
    month: new Date().getMonth() + 1,
    periodStart: `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
    metric: SalesTargetMetric.NetOrderAmount,
    targetValue: '',
  });

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
      startDate: toDateInput(plan.startDate),
      endDate: toDateInput(plan.endDate),
      periodType: plan.periodType,
      currency: plan.currency,
      description: plan.description ?? '',
      targets: plan.targets.map((target) => ({
        userId: target.userId,
        month: target.month,
        periodStart: toDateInput(target.periodStart),
        metric: target.metric,
        targetValue: target.targetValue,
        notes: target.notes ?? '',
      })),
    });
  }, [form, isCreate, open, plan]);

  useEffect(() => {
    if (!open || !editable) return;
    const users = targetUsersQuery.data ?? [];
    if (users.length === 0 || users.some((user) => user.id === quickTarget.userId)) return;
    setQuickTarget((current) => ({ ...current, userId: users[0].id }));
  }, [editable, open, quickTarget.userId, targetUsersQuery.data]);

  const handleSubmit = async (values: SalesPlanFormValues): Promise<void> => {
    if (values.endDate < values.startDate) {
      toast.error(t('validation.dateRange'));
      return;
    }
    const duplicateKeys = new Set<string>();
    for (const target of values.targets) {
      const key = `${target.userId}:${values.periodType === SalesPlanPeriodType.Yearly ? values.startDate : target.periodStart}:${target.metric}`;
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
          startDate: values.startDate,
          endDate: values.endDate,
          periodType: values.periodType as SalesPlanPeriodType,
          currency: values.currency.trim().toUpperCase(),
          description: values.description.trim() || null,
          targets: normalizedTargets,
        });
      } else if (plan) {
        await updateMutation.mutateAsync({
          id: plan.id,
          payload: {
            name: values.name.trim(),
            startDate: values.startDate,
            endDate: values.endDate,
            periodType: values.periodType as SalesPlanPeriodType,
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
    const targetValue = Number(quickTarget.targetValue);
    if (quickTarget.userId <= 0 || quickTarget.targetValue.trim() === '' || !Number.isFinite(targetValue) || targetValue < 0) {
      toast.error(t('validation.targetValue'));
      return;
    }
    if (COUNT_METRICS.has(quickTarget.metric) && !Number.isInteger(targetValue)) {
      toast.error(t('validation.wholeNumber'));
      return;
    }

    const duplicate = form.getValues('targets').some((target) =>
      target.userId === quickTarget.userId &&
      target.periodStart === quickTarget.periodStart &&
      target.metric === quickTarget.metric,
    );
    if (duplicate) {
      toast.error(t('validation.duplicateTarget'));
      return;
    }

    const periodType = form.getValues('periodType');
    const periodStart = periodType === SalesPlanPeriodType.Yearly ? form.getValues('startDate') : quickTarget.periodStart;
    targets.append({ ...quickTarget, periodStart, month: Number(periodStart.slice(5, 7)), targetValue, notes: '' });
    setQuickTarget((current) => ({ ...current, targetValue: '' }));
  };

  const copyTargetToRemainingMonths = (index: number): void => {
    const source = form.getValues(`targets.${index}`);
    if (!source) return;
    const monthlyPeriods = getMonthlyPeriods(form.getValues('startDate'), form.getValues('endDate'));
    const existingMonths = new Set(
      form.getValues('targets')
        .filter((target) => target.userId === source.userId && target.metric === source.metric)
        .map((target) => target.periodStart),
    );
    const additions = monthlyPeriods
      .filter((periodStart) => !existingMonths.has(periodStart))
      .map((periodStart) => ({ ...source, periodStart, month: Number(periodStart.slice(5, 7)) }));

    if (additions.length === 0) {
      toast.info(t('messages.noMonthsToCopy'));
      return;
    }
    targets.append(additions, { shouldFocus: false });
    toast.success(t('messages.monthsCopied', { count: additions.length }));
  };

  const periodType = form.watch('periodType') as SalesPlanPeriodType;
  const startDate = form.watch('startDate');
  const endDate = form.watch('endDate');
  const monthlyPeriods = useMemo(() => getMonthlyPeriods(startDate, endDate), [endDate, startDate]);
  const salespersonOptions = useMemo(() => (targetUsersQuery.data ?? []).map((user) => ({
    value: String(user.id),
    label: user.fullName || user.username,
  })), [targetUsersQuery.data]);

  useEffect(() => {
    if (!open || periodType !== SalesPlanPeriodType.Monthly || monthlyPeriods.length === 0) return;
    if (!monthlyPeriods.includes(quickTarget.periodStart)) {
      const nextPeriod = monthlyPeriods[0];
      setQuickTarget((current) => ({ ...current, periodStart: nextPeriod, month: Number(nextPeriod.slice(5, 7)) }));
    }
  }, [monthlyPeriods, open, periodType, quickTarget.periodStart]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSaving && onOpenChange(nextOpen)}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1rem)] !max-w-[1180px] flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)]">
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
          <form id="sales-plan-form" onSubmit={form.handleSubmit(handleSubmit)} className="min-h-0 w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="grid gap-4 border-b p-5 sm:grid-cols-2 lg:grid-cols-6 sm:p-6">
              <div className="space-y-1.5 lg:col-span-2">
                <Label htmlFor="sales-plan-name">{t('form.name')}</Label>
                <Input id="sales-plan-name" maxLength={150} disabled={!editable} {...form.register('name')} />
                {form.formState.errors.name ? <p className="text-xs text-destructive">{t('validation.name')}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sales-plan-start-date">{t('form.startDate')}</Label>
                <Input id="sales-plan-start-date" type="date" min="2000-01-01" max="2100-12-31" disabled={!editable} {...form.register('startDate', { onChange: (event) => form.setValue('planYear', Number(String(event.target.value).slice(0, 4))) })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sales-plan-end-date">{t('form.endDate')}</Label>
                <Input id="sales-plan-end-date" type="date" min={startDate || '2000-01-01'} max="2100-12-31" disabled={!editable} {...form.register('endDate')} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('form.periodType')}</Label>
                <div className="grid h-9 grid-cols-2 rounded-md border bg-muted/40 p-0.5">
                  {[SalesPlanPeriodType.Monthly, SalesPlanPeriodType.Yearly].map((value) => (
                    <button key={value} type="button" disabled={!editable} className={`rounded-sm px-2 text-sm transition-colors ${periodType === value ? 'bg-background font-medium text-foreground shadow-sm' : 'text-muted-foreground'}`} onClick={() => form.setValue('periodType', value, { shouldDirty: true })}>
                      {t(value === SalesPlanPeriodType.Monthly ? 'form.monthly' : 'form.yearly')}
                    </button>
                  ))}
                </div>
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
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-6">
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
                <span className="rounded-md border bg-background px-2.5 py-1 text-xs font-semibold tabular-nums">
                  {targets.fields.length} {t('stats.targets').toLocaleLowerCase(i18n.language)}
                </span>
              </div>

              {editable ? (
                <div className="mb-4 grid items-end gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(200px,1.2fr)_150px_minmax(210px,1fr)_150px_auto]">
                  <div className="space-y-1.5">
                    <Label>{t('targets.salesperson')}</Label>
                    <Combobox
                      modal
                      options={salespersonOptions}
                      value={quickTarget.userId > 0 ? String(quickTarget.userId) : ''}
                      onValueChange={(value) => setQuickTarget((current) => ({ ...current, userId: Number(value) }))}
                      disabled={targetUsersQuery.isLoading || (targetUsersQuery.data?.length ?? 0) === 0}
                      isLoading={targetUsersQuery.isLoading}
                      placeholder={t('targets.selectSalesperson')}
                      searchPlaceholder={t('targets.searchSalesperson')}
                      emptyText={t('targets.noSalespeople')}
                    />
                  </div>
                  {periodType === SalesPlanPeriodType.Monthly ? <div className="space-y-1.5">
                    <Label>{t('targets.month')}</Label>
                    <Select value={quickTarget.periodStart} onValueChange={(value) => setQuickTarget((current) => ({ ...current, periodStart: value, month: Number(value.slice(5, 7)) }))}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>{monthlyPeriods.map((value) => <SelectItem key={value} value={value}>{getMonthLabel(Number(value.slice(5, 7)), i18n.language)} {value.slice(0, 4)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div> : <div className="space-y-1.5"><Label>{t('targets.period')}</Label><div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm text-muted-foreground">{t('targets.fullPlanRange')}</div></div>}
                  <div className="space-y-1.5">
                    <Label>{t('targets.metric')}</Label>
                    <Select value={String(quickTarget.metric)} onValueChange={(value) => setQuickTarget((current) => ({ ...current, metric: Number(value) as SalesTargetMetric }))}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>{SALES_TARGET_METRICS.map((metric) => <SelectItem key={metric} value={String(metric)}>{t(`metric.${getMetricKey(metric)}`)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sales-plan-quick-target-value">{t('targets.value')}</Label>
                    <Input
                      id="sales-plan-quick-target-value"
                      type="number"
                      min={0}
                      step={COUNT_METRICS.has(quickTarget.metric) ? 1 : 0.01}
                      value={quickTarget.targetValue}
                      onChange={(event) => setQuickTarget((current) => ({ ...current, targetValue: event.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <Button type="button" onClick={addTarget} disabled={targetUsersQuery.isLoading || (targetUsersQuery.data?.length ?? 0) === 0}>
                    <Plus className="size-4" />
                    {t('actions.addTarget')}
                  </Button>
                </div>
              ) : null}

              {targets.fields.length === 0 ? (
                <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {editable && !targetUsersQuery.isLoading && (targetUsersQuery.data?.length ?? 0) === 0
                    ? t('targets.noSalespeople')
                    : t('targets.empty')}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <div className="min-w-[980px]">
                    <div className="grid grid-cols-[220px_140px_220px_150px_minmax(180px,1fr)_88px] gap-2 border-b bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">
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
                        <div key={target.id} className="grid grid-cols-[220px_140px_220px_150px_minmax(180px,1fr)_88px] items-start gap-2 border-b px-3 py-3 last:border-b-0">
                          {editable ? (
                            <Combobox
                              modal
                              options={salespersonOptions}
                              value={String(form.watch(`targets.${index}.userId`) || '')}
                              onValueChange={(value) => form.setValue(`targets.${index}.userId`, Number(value), { shouldDirty: true })}
                              disabled={targetUsersQuery.isLoading}
                              isLoading={targetUsersQuery.isLoading}
                              placeholder={t('targets.selectSalesperson')}
                              searchPlaceholder={t('targets.searchSalesperson')}
                              emptyText={t('targets.noSalespeople')}
                            />
                          ) : (
                            <div className="min-h-9 px-3 py-2 text-sm">{detailTarget?.userName || '-'}</div>
                          )}
                          {periodType === SalesPlanPeriodType.Monthly ? <Select
                            value={form.watch(`targets.${index}.periodStart`)}
                            onValueChange={(value) => {
                              form.setValue(`targets.${index}.periodStart`, value, { shouldDirty: true });
                              form.setValue(`targets.${index}.month`, Number(value.slice(5, 7)), { shouldDirty: true });
                            }}
                            disabled={!editable}
                          >
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>{monthlyPeriods.map((value) => <SelectItem key={value} value={value}>{getMonthLabel(Number(value.slice(5, 7)), i18n.language)} {value.slice(0, 4)}</SelectItem>)}</SelectContent>
                          </Select> : <div className="min-h-9 px-3 py-2 text-sm text-muted-foreground">{t('targets.fullPlanRange')}</div>}
                          <Select
                            value={String(form.watch(`targets.${index}.metric`))}
                            onValueChange={(value) => form.setValue(`targets.${index}.metric`, Number(value), { shouldDirty: true })}
                            disabled={!editable}
                          >
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>{SALES_TARGET_METRICS.map((metric) => <SelectItem key={metric} value={String(metric)}>{t(`metric.${getMetricKey(metric)}`)}</SelectItem>)}</SelectContent>
                          </Select>
                          <Input type="number" min={0} step={COUNT_METRICS.has(form.watch(`targets.${index}.metric`) as SalesTargetMetric) ? 1 : 0.01} disabled={!editable} {...form.register(`targets.${index}.targetValue`, { valueAsNumber: true })} />
                          <Input maxLength={500} disabled={!editable} {...form.register(`targets.${index}.notes`)} />
                          {editable ? (
                            <div className="flex items-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon" className="size-9" onClick={() => copyTargetToRemainingMonths(index)} aria-label={t('actions.copyToRemainingMonths')}>
                                    <CopyPlus className="size-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('actions.copyToRemainingMonths')}</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon" className="size-9 text-destructive" onClick={() => targets.remove(index)} aria-label={t('actions.removeTarget')}>
                                    <Trash2 className="size-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('actions.removeTarget')}</TooltipContent>
                              </Tooltip>
                            </div>
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
