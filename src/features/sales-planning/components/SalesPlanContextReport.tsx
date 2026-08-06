import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ChartNoAxesCombined,
  CheckCircle2,
  ExternalLink,
  Gauge,
  RefreshCw,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import { useSalesForecastQuery } from '@/features/sales-forecast/hooks/useSalesForecast';
import { SalesForecastHealthStatus } from '@/features/sales-forecast/types/sales-forecast.types';
import { useSalesPlanAttainmentQuery, useSalesPlansQuery } from '../hooks/useSalesPlanning';
import {
  SalesPlanPeriodType,
  SalesPlanStatus,
  SalesTargetMetric,
  SalesTargetProgressStatus,
  type SalesPlanTargetAttainmentDto,
} from '../types/sales-planning.types';
import {
  COUNT_METRICS,
  getMetricKey,
  getMonthlyPeriods,
  getMonthPeriodLabel,
  getProgressStatusKey,
} from '../utils/sales-planning-options';

interface SalesPlanContextReportProps {
  userIds: number[];
  enabled?: boolean;
  contextLabel?: string;
}

const PROGRESS_STYLES: Record<SalesTargetProgressStatus, string> = {
  [SalesTargetProgressStatus.NoTarget]: 'border-slate-300 bg-slate-100 text-slate-700',
  [SalesTargetProgressStatus.NotStarted]: 'border-slate-300 bg-slate-50 text-slate-700',
  [SalesTargetProgressStatus.AtRisk]: 'border-rose-300 bg-rose-50 text-rose-800',
  [SalesTargetProgressStatus.OnTrack]: 'border-amber-300 bg-amber-50 text-amber-800',
  [SalesTargetProgressStatus.Achieved]: 'border-emerald-300 bg-emerald-50 text-emerald-800',
};

const HEALTH_STYLES: Record<SalesForecastHealthStatus, string> = {
  [SalesForecastHealthStatus.NoTarget]: 'border-slate-300 bg-slate-50 text-slate-700',
  [SalesForecastHealthStatus.Achieved]: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  [SalesForecastHealthStatus.OnTrack]: 'border-sky-300 bg-sky-50 text-sky-800',
  [SalesForecastHealthStatus.AtRisk]: 'border-amber-300 bg-amber-50 text-amber-800',
  [SalesForecastHealthStatus.Critical]: 'border-rose-300 bg-rose-50 text-rose-800',
};

const HEALTH_KEYS: Record<SalesForecastHealthStatus, string> = {
  [SalesForecastHealthStatus.NoTarget]: 'noTarget',
  [SalesForecastHealthStatus.Achieved]: 'achieved',
  [SalesForecastHealthStatus.OnTrack]: 'onTrack',
  [SalesForecastHealthStatus.AtRisk]: 'atRisk',
  [SalesForecastHealthStatus.Critical]: 'critical',
};

function isCurrentPlan(startDate: string, endDate: string, now: Date): boolean {
  const current = now.toISOString().slice(0, 10);
  return startDate.slice(0, 10) <= current && endDate.slice(0, 10) >= current;
}

export function SalesPlanContextReport({
  userIds,
  enabled = true,
  contextLabel,
}: SalesPlanContextReportProps): ReactElement {
  const { t, i18n } = useTranslation(['sales-planning', 'sales-forecast']);
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [planId, setPlanId] = useState<number | null>(null);
  const [periodStart, setPeriodStart] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
  const [view, setView] = useState<'attainment' | 'forecast'>('attainment');
  const [forecastMetric, setForecastMetric] = useState<SalesTargetMetric>(SalesTargetMetric.NetOrderAmount);
  const plansQuery = useSalesPlansQuery(year, undefined, enabled);
  const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);
  const selectedPlan = plans.find((plan) => plan.id === planId);
  const availablePeriods = useMemo(
    () => selectedPlan ? getMonthlyPeriods(selectedPlan.startDate, selectedPlan.endDate) : [],
    [selectedPlan],
  );
  const attainmentQuery = useSalesPlanAttainmentQuery(planId, periodStart, enabled && view === 'attainment');
  const forecastQuery = useSalesForecastQuery(planId, periodStart, forecastMetric, enabled && view === 'forecast');
  const { currencyOptions } = useCurrencyOptions();
  const scopedUserIds = useMemo(() => new Set(userIds.filter((id) => id > 0)), [userIds]);
  const locale = i18n.resolvedLanguage ?? i18n.language;

  useEffect(() => {
    if (!enabled || plansQuery.isLoading) return;
    if (plans.length === 0) {
      setPlanId(null);
      return;
    }
    if (planId != null && plans.some((plan) => plan.id === planId)) return;
    const preferred = plans.find((plan) =>
      isCurrentPlan(plan.startDate, plan.endDate, now) &&
      (plan.status === SalesPlanStatus.Locked || plan.status === SalesPlanStatus.Approved),
    ) ?? plans.find((plan) => isCurrentPlan(plan.startDate, plan.endDate, now)) ?? plans[0];
    setPlanId(preferred.id);
  }, [enabled, now, planId, plans, plansQuery.isLoading]);

  useEffect(() => {
    if (!selectedPlan) return;
    if (selectedPlan.periodType === SalesPlanPeriodType.Yearly) {
      setPeriodStart(selectedPlan.startDate.slice(0, 10));
      return;
    }
    const currentPeriod = availablePeriods.find((period) => period.slice(0, 7) === now.toISOString().slice(0, 7));
    setPeriodStart(currentPeriod ?? availablePeriods[0] ?? selectedPlan.startDate.slice(0, 10));
  }, [availablePeriods, now, selectedPlan]);

  const currencyLabels = useMemo(
    () => new Map(currencyOptions.map((option) => [String(option.dovizTipi), option.code])),
    [currencyOptions],
  );
  const currency = attainmentQuery.data?.currency ?? forecastQuery.data?.currency ?? selectedPlan?.currency ?? '';
  const currencyLabel = currencyLabels.get(currency) ?? currency;
  const amountFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [locale],
  );
  const countFormatter = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }), [locale]);
  const percentFormatter = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }), [locale]);
  const formatValue = (value: number, metric: SalesTargetMetric): string =>
    COUNT_METRICS.has(metric) ? countFormatter.format(value) : `${amountFormatter.format(value)} ${currencyLabel}`.trim();

  const targetRows = useMemo(
    () => (attainmentQuery.data?.targets ?? []).filter((row) => scopedUserIds.size === 0 || scopedUserIds.has(row.userId)),
    [attainmentQuery.data?.targets, scopedUserIds],
  );
  const forecastPeople = useMemo(
    () => (forecastQuery.data?.salespeople ?? []).filter((row) => scopedUserIds.size === 0 || scopedUserIds.has(row.userId)),
    [forecastQuery.data?.salespeople, scopedUserIds],
  );
  const pipelineRows = useMemo(
    () => (forecastQuery.data?.pipeline ?? []).filter((row) => scopedUserIds.size === 0 || scopedUserIds.has(row.userId)),
    [forecastQuery.data?.pipeline, scopedUserIds],
  );
  const forecastTotals = useMemo(
    () => forecastPeople.reduce(
      (total, row) => ({
        target: total.target + row.targetValue,
        actual: total.actual + row.actualValue,
        forecast: total.forecast + row.forecastValue,
        gap: total.gap + row.gap,
        weighted: total.weighted + row.weightedPipeline,
      }),
      { target: 0, actual: 0, forecast: 0, gap: 0, weighted: 0 },
    ),
    [forecastPeople],
  );

  const years = Array.from({ length: 7 }, (_, index) => now.getFullYear() - 2 + index);
  const loading = plansQuery.isLoading || (view === 'attainment' ? attainmentQuery.isLoading : forecastQuery.isLoading);
  const error = plansQuery.error ?? (view === 'attainment' ? attainmentQuery.error : forecastQuery.error);
  const refetch = (): void => {
    if (plansQuery.isError) void plansQuery.refetch();
    else if (view === 'attainment') void attainmentQuery.refetch();
    else void forecastQuery.refetch();
  };

  return (
    <section className="space-y-4" data-testid="sales-plan-context-report">
      <div className="border-b pb-4">
        <div className="flex flex-wrap items-center gap-2">
            <Target className="size-5 text-primary" />
            <h2 className="text-base font-semibold">{t('sales-planning:context.title')}</h2>
            <Button asChild variant="outline" size="sm" className="ml-auto sm:ml-2">
              <Link to={view === 'attainment' ? '/sales-planning/performance' : '/sales-planning/forecast'}>
                {t('sales-planning:context.openFullReport')}<ExternalLink className="size-4" />
              </Link>
            </Button>
        </div>
        <p className="mt-1 max-w-5xl text-sm text-muted-foreground">
          {contextLabel || t('sales-planning:context.description')}
        </p>
      </div>

      <div className="grid items-end justify-start gap-3 md:grid-cols-2 xl:grid-cols-[120px_minmax(220px,320px)_180px_220px_auto]">
        <div className="space-y-1.5">
          <Label>{t('sales-planning:performance.filters.year')}</Label>
          <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{years.map((item) => <SelectItem key={item} value={String(item)}>{item}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t('sales-planning:performance.filters.plan')}</Label>
          <Select value={planId == null ? '' : String(planId)} onValueChange={(value) => setPlanId(Number(value))} disabled={plans.length === 0}>
            <SelectTrigger><SelectValue placeholder={t('sales-planning:performance.filters.selectPlan')} /></SelectTrigger>
            <SelectContent>{plans.map((plan) => <SelectItem key={plan.id} value={String(plan.id)}>{plan.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t('sales-planning:performance.filters.month')}</Label>
          {selectedPlan?.periodType === SalesPlanPeriodType.Yearly ? (
            <div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm text-muted-foreground">{t('sales-planning:targets.fullPlanRange')}</div>
          ) : (
            <Select value={periodStart} onValueChange={setPeriodStart} disabled={availablePeriods.length === 0}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{availablePeriods.map((item) => <SelectItem key={item} value={item}>{getMonthPeriodLabel(item, locale)}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>{t('sales-planning:context.reportType')}</Label>
          <Tabs value={view} onValueChange={(value) => setView(value as 'attainment' | 'forecast')}>
            <TabsList className="grid h-9 w-full grid-cols-2 rounded-md">
              <TabsTrigger value="attainment" className="rounded-sm">{t('sales-planning:context.attainment')}</TabsTrigger>
              <TabsTrigger value="forecast" className="rounded-sm">{t('sales-planning:context.forecast')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Button variant="outline" size="icon" className="size-9" onClick={refetch} disabled={!planId || loading} aria-label={t('sales-planning:actions.refresh')}>
          <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
        </Button>
      </div>

      {view === 'forecast' ? (
        <div className="flex max-w-xs items-center gap-2">
          <Label className="shrink-0">{t('sales-forecast:filters.metric')}</Label>
          <Select value={String(forecastMetric)} onValueChange={(value) => setForecastMetric(Number(value) as SalesTargetMetric)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={String(SalesTargetMetric.NetOrderAmount)}>{t('sales-forecast:metric.netOrderAmount')}</SelectItem>
              <SelectItem value={String(SalesTargetMetric.ErpOrderAmount)}>{t('sales-forecast:metric.erpOrderAmount')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-24" />)}</div><Skeleton className="h-64" /></div>
      ) : error ? (
        <ReportState icon={AlertTriangle} title={t('sales-planning:context.error')} actionLabel={t('sales-planning:actions.retry')} onAction={refetch} destructive />
      ) : plans.length === 0 ? (
        <ReportState icon={Target} title={t('sales-planning:performance.empty.noPlansTitle')} description={t('sales-planning:performance.empty.noPlansDescription')} />
      ) : view === 'attainment' ? (
        <AttainmentReport rows={targetRows} formatValue={formatValue} percentFormatter={percentFormatter} />
      ) : (
        <ForecastReport
          people={forecastPeople}
          pipelineCount={pipelineRows.length}
          totals={forecastTotals}
          formatAmount={(value) => `${amountFormatter.format(value)} ${currencyLabel}`.trim()}
          percentFormatter={percentFormatter}
        />
      )}
    </section>
  );
}

function AttainmentReport({ rows, formatValue, percentFormatter }: {
  rows: SalesPlanTargetAttainmentDto[];
  formatValue: (value: number, metric: SalesTargetMetric) => string;
  percentFormatter: Intl.NumberFormat;
}): ReactElement {
  const { t } = useTranslation('sales-planning');
  if (rows.length === 0) return <ReportState icon={Target} title={t('context.noScopedTargetsTitle')} description={t('context.noScopedTargetsDescription')} />;
  const achieved = rows.filter((row) => row.progressStatus === SalesTargetProgressStatus.Achieved).length;
  const onTrack = rows.filter((row) => row.progressStatus === SalesTargetProgressStatus.OnTrack).length;
  const attention = rows.filter((row) => row.progressStatus === SalesTargetProgressStatus.AtRisk || row.progressStatus === SalesTargetProgressStatus.NotStarted).length;
  const stats = [
    { label: t('performance.stats.targetRows'), value: rows.length, icon: Target },
    { label: t('performance.stats.achieved'), value: achieved, icon: CheckCircle2 },
    { label: t('context.onTrack'), value: onTrack, icon: TrendingUp },
    { label: t('performance.stats.needsAttention'), value: attention, icon: AlertTriangle },
  ];
  return <div className="space-y-3">
    <div className="grid overflow-hidden rounded-lg border bg-background sm:grid-cols-2 xl:grid-cols-4">{stats.map((item) => <div key={item.label} className="flex min-h-20 items-center gap-3 border-b p-4 sm:[&:nth-child(odd)]:border-r sm:[&:nth-last-child(-n+2)]:border-b-0 xl:border-b-0 xl:border-r xl:last:border-r-0"><div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary"><item.icon className="size-4" /></div><div><p className="text-xl font-bold tabular-nums">{item.value}</p><p className="text-xs text-muted-foreground">{item.label}</p></div></div>)}</div>
    <div className="overflow-hidden rounded-lg border bg-background"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>{t('performance.table.salesperson')}</TableHead><TableHead>{t('performance.table.kpi')}</TableHead><TableHead className="text-right">{t('performance.table.target')}</TableHead><TableHead className="text-right">{t('performance.table.actual')}</TableHead><TableHead className="text-right">{t('performance.table.remaining')}</TableHead><TableHead>{t('performance.table.progress')}</TableHead><TableHead>{t('performance.table.status')}</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.targetId}><TableCell className="font-medium">{row.userName}</TableCell><TableCell>{t(`metric.${getMetricKey(row.metric)}`)}</TableCell><TableCell className="text-right tabular-nums">{formatValue(row.targetValue, row.metric)}</TableCell><TableCell className="text-right font-semibold tabular-nums">{formatValue(row.actualValue, row.metric)}</TableCell><TableCell className="text-right tabular-nums text-muted-foreground">{formatValue(row.remainingValue, row.metric)}</TableCell><TableCell><div className="min-w-36"><div className="flex justify-between text-xs"><span>%{percentFormatter.format(row.achievementRate)}</span><span className="text-muted-foreground">%{percentFormatter.format(row.expectedProgressRate)}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, row.achievementRate))}%` }} /></div></div></TableCell><TableCell><Badge variant="outline" className={cn('rounded-md', PROGRESS_STYLES[row.progressStatus])}>{t(`performance.progressStatus.${getProgressStatusKey(row.progressStatus)}`)}</Badge></TableCell></TableRow>)}</TableBody></Table></div></div>
  </div>;
}

function ForecastReport({ people, pipelineCount, totals, formatAmount, percentFormatter }: {
  people: NonNullable<ReturnType<typeof useSalesForecastQuery>['data']>['salespeople'];
  pipelineCount: number;
  totals: { target: number; actual: number; forecast: number; gap: number; weighted: number };
  formatAmount: (value: number) => string;
  percentFormatter: Intl.NumberFormat;
}): ReactElement {
  const { t } = useTranslation(['sales-planning', 'sales-forecast']);
  if (people.length === 0) return <ReportState icon={Gauge} title={t('sales-planning:context.noScopedForecastTitle')} description={t('sales-planning:context.noScopedForecastDescription')} />;
  const stats = [
    { label: t('sales-forecast:summary.target'), value: totals.target, icon: Target },
    { label: t('sales-forecast:summary.actual'), value: totals.actual, icon: CheckCircle2 },
    { label: t('sales-forecast:summary.weightedForecast'), value: totals.forecast, icon: ChartNoAxesCombined },
    { label: t('sales-forecast:summary.gap'), value: totals.gap, icon: Gauge },
  ];
  return <div className="space-y-3">
    <div className="grid overflow-hidden rounded-lg border bg-background sm:grid-cols-2 xl:grid-cols-4">{stats.map((item) => <div key={item.label} className="flex min-h-20 items-center gap-3 border-b p-4 sm:[&:nth-child(odd)]:border-r sm:[&:nth-last-child(-n+2)]:border-b-0 xl:border-b-0 xl:border-r xl:last:border-r-0"><div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary"><item.icon className="size-4" /></div><div className="min-w-0"><p className="truncate text-lg font-bold tabular-nums">{formatAmount(item.value)}</p><p className="text-xs text-muted-foreground">{item.label}</p></div></div>)}</div>
    <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-lg border bg-muted/20 px-4 py-3 text-sm"><span>{t('sales-forecast:summary.weightedPipeline')}: <strong>{formatAmount(totals.weighted)}</strong></span><span>{t('sales-planning:context.scopedPipelineCount', { count: pipelineCount })}</span></div>
    <div className="overflow-hidden rounded-lg border bg-background"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>{t('sales-forecast:salespeople.salesperson')}</TableHead><TableHead className="text-right">{t('sales-forecast:summary.target')}</TableHead><TableHead className="text-right">{t('sales-forecast:summary.actual')}</TableHead><TableHead className="text-right">{t('sales-forecast:summary.weightedPipeline')}</TableHead><TableHead className="text-right">{t('sales-forecast:summary.weightedForecast')}</TableHead><TableHead className="text-right">{t('sales-forecast:summary.gap')}</TableHead><TableHead>{t('sales-forecast:salespeople.status')}</TableHead></TableRow></TableHeader><TableBody>{people.map((person) => <TableRow key={person.userId}><TableCell><p className="font-medium">{person.userName}</p><p className="text-xs text-muted-foreground">{t('sales-forecast:salespeople.winRate')}: %{percentFormatter.format(person.historicalWinRate)}</p></TableCell><TableCell className="text-right tabular-nums">{formatAmount(person.targetValue)}</TableCell><TableCell className="text-right tabular-nums">{formatAmount(person.actualValue)}</TableCell><TableCell className="text-right tabular-nums">{formatAmount(person.weightedPipeline)}</TableCell><TableCell className="text-right font-semibold tabular-nums">{formatAmount(person.forecastValue)}</TableCell><TableCell className="text-right tabular-nums">{formatAmount(person.gap)}</TableCell><TableCell><Badge variant="outline" className={cn('rounded-md', HEALTH_STYLES[person.healthStatus])}>{t(`sales-forecast:health.${HEALTH_KEYS[person.healthStatus]}`)}</Badge></TableCell></TableRow>)}</TableBody></Table></div></div>
  </div>;
}

function ReportState({ icon: Icon, title, description, actionLabel, onAction, destructive = false }: {
  icon: typeof Target;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  destructive?: boolean;
}): ReactElement {
  return <div className="flex min-h-56 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-background p-6 text-center"><Icon className={cn('size-8', destructive ? 'text-destructive' : 'text-muted-foreground')} /><p className={cn('font-medium', destructive && 'text-destructive')}>{title}</p>{description ? <p className="max-w-lg text-sm text-muted-foreground">{description}</p> : null}{actionLabel && onAction ? <Button variant="outline" className="mt-2" onClick={onAction}>{actionLabel}</Button> : null}</div>;
}
