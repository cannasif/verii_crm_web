import { type ReactElement, useEffect, useMemo, useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  RefreshCw,
  Search,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { ManagementListPageHeader } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import { useUIStore } from '@/stores/ui-store';
import {
  useSalesPlanAttainmentQuery,
  useSalesPlansQuery,
} from '../hooks/useSalesPlanning';
import {
  SalesTargetProgressStatus,
  type SalesPlanTargetAttainmentDto,
  type SalesTargetMetric,
} from '../types/sales-planning.types';
import {
  COUNT_METRICS,
  getMetricKey,
  getMonthLabel,
  getProgressStatusKey,
  SALES_TARGET_METRICS,
} from '../utils/sales-planning-options';
import { SalesPlanStatusBadge } from './SalesPlanStatusBadge';

const PROGRESS_STYLES: Record<SalesTargetProgressStatus, string> = {
  [SalesTargetProgressStatus.NoTarget]: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
  [SalesTargetProgressStatus.NotStarted]: 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200',
  [SalesTargetProgressStatus.AtRisk]: 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200',
  [SalesTargetProgressStatus.OnTrack]: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
  [SalesTargetProgressStatus.Achieved]: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
};

const PROGRESS_BAR_STYLES: Record<SalesTargetProgressStatus, string> = {
  [SalesTargetProgressStatus.NoTarget]: 'bg-slate-400',
  [SalesTargetProgressStatus.NotStarted]: 'bg-slate-400',
  [SalesTargetProgressStatus.AtRisk]: 'bg-rose-500',
  [SalesTargetProgressStatus.OnTrack]: 'bg-amber-500',
  [SalesTargetProgressStatus.Achieved]: 'bg-emerald-500',
};

export function SalesPlanningPerformancePage(): ReactElement {
  const { t, i18n } = useTranslation('sales-planning');
  const setPageTitle = useUIStore((state) => state.setPageTitle);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [planId, setPlanId] = useState<number | null>(null);
  const [metric, setMetric] = useState<SalesTargetMetric | 'all'>('all');
  const [search, setSearch] = useState('');

  const plansQuery = useSalesPlansQuery(year);
  const attainmentQuery = useSalesPlanAttainmentQuery(planId, month);
  const { currencyOptions } = useCurrencyOptions();
  const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);

  useEffect(() => {
    setPageTitle(t('performance.title'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  useEffect(() => {
    if (plansQuery.isLoading) return;
    if (plans.length === 0) {
      setPlanId(null);
      return;
    }
    if (planId == null || !plans.some((plan) => plan.id === planId)) {
      setPlanId(plans[0].id);
    }
  }, [planId, plans, plansQuery.isLoading]);

  const currencyLabels = useMemo(
    () => new Map(currencyOptions.map((option) => [String(option.dovizTipi), option.code])),
    [currencyOptions],
  );
  const data = attainmentQuery.data;
  const currencyLabel = data ? (currencyLabels.get(data.currency) ?? data.currency) : '';
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const amountFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [locale],
  );
  const countFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
    [locale],
  );
  const dateTimeFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }),
    [locale],
  );

  const filteredTargets = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase(locale);
    return (data?.targets ?? []).filter((target) => {
      if (metric !== 'all' && target.metric !== metric) return false;
      if (!normalizedSearch) return true;
      return [target.userName, target.notes ?? '', t(`metric.${getMetricKey(target.metric)}`)]
        .join(' ')
        .toLocaleLowerCase(locale)
        .includes(normalizedSearch);
    });
  }, [data?.targets, locale, metric, search, t]);

  const formatValue = (value: number, targetMetric: SalesTargetMetric): string =>
    COUNT_METRICS.has(targetMetric)
      ? countFormatter.format(value)
      : `${amountFormatter.format(value)} ${currencyLabel}`.trim();

  const years = Array.from({ length: 7 }, (_, index) => now.getFullYear() - 2 + index);

  return (
    <div className="space-y-5">
      <ManagementListPageHeader
        title={t('performance.title')}
        description={t('performance.description')}
        backLabel={t('actions.back')}
      />

      <section className="space-y-3">
        <div className="grid gap-3 rounded-lg border bg-background p-3 md:grid-cols-2 xl:grid-cols-[140px_minmax(260px,1fr)_180px_minmax(220px,1fr)_40px]">
          <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
            <SelectTrigger aria-label={t('performance.filters.year')}><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((item) => <SelectItem key={item} value={String(item)}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={planId == null ? '' : String(planId)} onValueChange={(value) => setPlanId(Number(value))} disabled={plansQuery.isLoading || plans.length === 0}>
            <SelectTrigger aria-label={t('performance.filters.plan')}><SelectValue placeholder={plansQuery.isLoading ? t('performance.filters.loadingPlans') : t('performance.filters.selectPlan')} /></SelectTrigger>
            <SelectContent>
              {plans.map((plan) => <SelectItem key={plan.id} value={String(plan.id)}>{plan.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(month)} onValueChange={(value) => setMonth(Number(value))}>
            <SelectTrigger aria-label={t('performance.filters.month')}><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((item) => (
                <SelectItem key={item} value={String(item)}>{getMonthLabel(item, locale)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('performance.filters.search')} className="pl-9" />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="size-10" onClick={() => void attainmentQuery.refetch()} disabled={!planId || attainmentQuery.isFetching} aria-label={t('actions.refresh')}>
                <RefreshCw className={cn('size-4', attainmentQuery.isFetching && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('actions.refresh')}</TooltipContent>
          </Tooltip>
        </div>

        {plansQuery.isLoading || (planId != null && attainmentQuery.isLoading) ? (
          <PerformanceSkeleton />
        ) : plansQuery.isError ? (
          <ErrorState message={t('errors.list')} onRetry={() => void plansQuery.refetch()} />
        ) : plans.length === 0 ? (
          <EmptyState title={t('performance.empty.noPlansTitle')} description={t('performance.empty.noPlansDescription')} />
        ) : attainmentQuery.isError ? (
          <ErrorState message={attainmentQuery.error.message || t('performance.errors.attainment')} onRetry={() => void attainmentQuery.refetch()} />
        ) : !data ? (
          <EmptyState title={t('performance.empty.selectPlanTitle')} description={t('performance.empty.selectPlanDescription')} />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border bg-background px-4 py-3 text-sm">
              <span className="font-semibold">{data.planName}</span>
              <SalesPlanStatusBadge status={data.planStatus} />
              <span className="text-muted-foreground">{getMonthLabel(data.month, locale)} {data.planYear}</span>
              <span className="text-muted-foreground">{t('performance.labels.currency')}: <strong className="text-foreground">{currencyLabel}</strong></span>
              <span className="ml-auto text-xs text-muted-foreground">{t('performance.labels.generatedAt')}: {dateTimeFormatter.format(new Date(data.generatedAt))}</span>
            </div>

            <div className="grid overflow-hidden rounded-lg border bg-background sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: t('performance.stats.targetRows'), value: data.targetCount, icon: Target },
                { label: t('performance.stats.salespeople'), value: data.salespersonCount, icon: Users },
                { label: t('performance.stats.achieved'), value: data.achievedCount, icon: CheckCircle2 },
                { label: t('performance.stats.needsAttention'), value: data.atRiskCount + data.notStartedCount, icon: AlertTriangle },
              ].map((item) => (
                <div key={item.label} className="flex min-h-20 items-center gap-3 border-b p-4 last:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-last-child(-n+2)]:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><item.icon className="size-4" /></div>
                  <div className="min-w-0"><p className="text-xl font-bold tabular-nums">{item.value}</p><p className="truncate text-xs text-muted-foreground">{item.label}</p></div>
                </div>
              ))}
            </div>

            {data.metrics.length > 0 ? (
              <section className="space-y-2">
                <div>
                  <h2 className="text-sm font-semibold">{t('performance.metricSummary.title')}</h2>
                  <p className="text-xs text-muted-foreground">{t('performance.metricSummary.description')}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {data.metrics.map((item) => (
                    <button key={item.metric} type="button" className={cn('min-h-28 rounded-lg border bg-background p-3 text-left transition-colors hover:border-primary/50', metric === item.metric && 'border-primary ring-1 ring-primary/20')} onClick={() => setMetric(metric === item.metric ? 'all' : item.metric)}>
                      <div className="flex items-start justify-between gap-2"><span className="text-sm font-semibold">{t(`metric.${getMetricKey(item.metric)}`)}</span><TrendingUp className="size-4 shrink-0 text-muted-foreground" /></div>
                      <div className="mt-3 flex items-end justify-between gap-3"><div><p className="text-xs text-muted-foreground">{t('performance.table.actual')}</p><p className="font-bold tabular-nums">{formatValue(item.actualValue, item.metric)}</p></div><span className="text-sm font-semibold tabular-nums">%{amountFormatter.format(item.achievementRate)}</span></div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-[width]" style={{ width: `${Math.min(100, Math.max(0, item.achievementRate))}%` }} /></div>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="flex flex-col gap-3 rounded-lg border bg-background p-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 text-sm font-semibold"><Gauge className="size-4 text-primary" />{t('performance.table.title')}</div>
              <Select value={metric === 'all' ? 'all' : String(metric)} onValueChange={(value) => setMetric(value === 'all' ? 'all' : Number(value) as SalesTargetMetric)}>
                <SelectTrigger className="w-full sm:ml-auto sm:w-64" aria-label={t('performance.filters.metric')}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('performance.filters.allMetrics')}</SelectItem>
                  {SALES_TARGET_METRICS.map((item) => <SelectItem key={item} value={String(item)}>{t(`metric.${getMetricKey(item)}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-hidden rounded-lg border bg-background">
              {filteredTargets.length === 0 ? (
                <EmptyState title={t('performance.empty.noTargetsTitle')} description={t('performance.empty.noTargetsDescription')} compact />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('performance.table.salesperson')}</TableHead>
                        <TableHead>{t('performance.table.kpi')}</TableHead>
                        <TableHead className="text-right">{t('performance.table.target')}</TableHead>
                        <TableHead className="text-right">{t('performance.table.actual')}</TableHead>
                        <TableHead className="text-right">{t('performance.table.remaining')}</TableHead>
                        <TableHead className="min-w-52">{t('performance.table.progress')}</TableHead>
                        <TableHead>{t('performance.table.status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTargets.map((target) => (
                        <TargetRow key={target.targetId} target={target} formatValue={formatValue} t={t} amountFormatter={amountFormatter} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function TargetRow({ target, formatValue, t, amountFormatter }: {
  target: SalesPlanTargetAttainmentDto;
  formatValue: (value: number, metric: SalesTargetMetric) => string;
  t: TFunction<'sales-planning'>;
  amountFormatter: Intl.NumberFormat;
}): ReactElement {
  const statusKey = getProgressStatusKey(target.progressStatus);
  return (
    <TableRow>
      <TableCell><div className="max-w-56"><p className="truncate font-semibold">{target.userName}</p><p className="truncate text-xs text-muted-foreground">{target.notes || t('performance.table.noNotes')}</p></div></TableCell>
      <TableCell className="whitespace-nowrap text-sm">{t(`metric.${getMetricKey(target.metric)}`)}</TableCell>
      <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">{formatValue(target.targetValue, target.metric)}</TableCell>
      <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">{formatValue(target.actualValue, target.metric)}</TableCell>
      <TableCell className="whitespace-nowrap text-right text-muted-foreground tabular-nums">{formatValue(target.remainingValue, target.metric)}</TableCell>
      <TableCell>
        <div className="flex items-center justify-between gap-3 text-xs"><span className="font-semibold tabular-nums">%{amountFormatter.format(target.achievementRate)}</span><span className="text-muted-foreground">{t('performance.labels.expectedProgress')} %{amountFormatter.format(target.expectedProgressRate)}</span></div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn('h-full transition-[width]', PROGRESS_BAR_STYLES[target.progressStatus])} style={{ width: `${Math.min(100, Math.max(0, target.achievementRate))}%` }} /></div>
      </TableCell>
      <TableCell><Badge variant="outline" className={cn('whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold', PROGRESS_STYLES[target.progressStatus])}>{t(`performance.progressStatus.${statusKey}`)}</Badge></TableCell>
    </TableRow>
  );
}

function PerformanceSkeleton(): ReactElement {
  return <div className="space-y-3"><Skeleton className="h-14 w-full" /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-20 w-full" />)}</div><Skeleton className="h-72 w-full" /></div>;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }): ReactElement {
  const { t } = useTranslation('sales-planning');
  return <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border bg-background p-6 text-center"><AlertTriangle className="size-8 text-destructive" /><p className="max-w-xl text-sm text-destructive">{message}</p><Button variant="outline" onClick={onRetry}>{t('actions.retry')}</Button></div>;
}

function EmptyState({ title, description, compact = false }: { title: string; description: string; compact?: boolean }): ReactElement {
  return <div className={cn('flex flex-col items-center justify-center gap-2 p-6 text-center', compact ? 'min-h-44' : 'min-h-56 rounded-lg border bg-background')}><Target className="size-8 text-muted-foreground" /><p className="font-medium">{title}</p><p className="max-w-lg text-sm text-muted-foreground">{description}</p></div>;
}
