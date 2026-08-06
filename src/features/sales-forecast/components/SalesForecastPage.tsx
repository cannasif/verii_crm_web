import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CalendarClock,
  ChartNoAxesCombined,
  CircleDollarSign,
  ExternalLink,
  Gauge,
  Pencil,
  RefreshCw,
  Search,
  Target,
  Users,
} from 'lucide-react';
import { ManagementListPageHeader } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useMyPermissionsQuery } from '@/features/access-control/hooks/useMyPermissionsQuery';
import { hasPermission } from '@/features/access-control/utils/hasPermission';
import { SalesPlanningWorkspaceNav, SalesTargetMetric } from '@/features/sales-planning';
import { useSalesPlansQuery } from '@/features/sales-planning/hooks/useSalesPlanning';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';
import { useSalesForecastQuery } from '../hooks/useSalesForecast';
import {
  SalesForecastHealthStatus,
  SalesForecastProbabilitySource,
  type SalesForecastPipelineItemDto,
} from '../types/sales-forecast.types';
import { SalesForecastOverrideDialog } from './SalesForecastOverrideDialog';

const HEALTH_STYLES: Record<SalesForecastHealthStatus, string> = {
  [SalesForecastHealthStatus.NoTarget]: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
  [SalesForecastHealthStatus.Achieved]: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
  [SalesForecastHealthStatus.OnTrack]: 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200',
  [SalesForecastHealthStatus.AtRisk]: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
  [SalesForecastHealthStatus.Critical]: 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200',
};

const HEALTH_KEYS: Record<SalesForecastHealthStatus, string> = {
  [SalesForecastHealthStatus.NoTarget]: 'noTarget',
  [SalesForecastHealthStatus.Achieved]: 'achieved',
  [SalesForecastHealthStatus.OnTrack]: 'onTrack',
  [SalesForecastHealthStatus.AtRisk]: 'atRisk',
  [SalesForecastHealthStatus.Critical]: 'critical',
};

const QUOTATION_STATUS_KEYS: Record<number, string> = {
  0: 'notStarted',
  1: 'waiting',
  2: 'approved',
  3: 'rejected',
  4: 'closed',
  5: 'customerCancelled',
  6: 'revisionClosed',
  7: 'superseded',
};

function monthLabel(month: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2020, month - 1, 1));
}

export function SalesForecastPage(): ReactElement {
  const { t, i18n } = useTranslation('sales-forecast');
  const setPageTitle = useUIStore((state) => state.setPageTitle);
  const { data: permissions } = useMyPermissionsQuery();
  const canManage = hasPermission(permissions, 'sales-forecast.manage');
  const canOpenQuotation = hasPermission(permissions, 'sales.quotations.update');
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [planId, setPlanId] = useState<number | null>(null);
  const [targetMetric, setTargetMetric] = useState<SalesTargetMetric>(SalesTargetMetric.NetOrderAmount);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<SalesForecastPipelineItemDto | null>(null);

  const plansQuery = useSalesPlansQuery(year);
  const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);
  const selectedPlan = plans.find((plan) => plan.id === planId);
  const forecastQuery = useSalesForecastQuery(planId, month, targetMetric);
  const { currencyOptions } = useCurrencyOptions();
  const locale = i18n.resolvedLanguage ?? i18n.language;

  useEffect(() => {
    setPageTitle(t('title'));
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

  useEffect(() => {
    if (!selectedPlan) return;
    setMonth(new Date(selectedPlan.startDate).getUTCMonth() + 1);
  }, [selectedPlan]);

  const currencyLabels = useMemo(
    () => new Map(currencyOptions.map((option) => [String(option.dovizTipi), option.code])),
    [currencyOptions],
  );
  const data = forecastQuery.data;
  const currencyLabel = data ? (currencyLabels.get(data.currency) ?? data.currency) : '';
  const amountFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [locale],
  );
  const percentFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
    [locale],
  );
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }),
    [locale],
  );
  const dateTimeFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }),
    [locale],
  );
  const formatAmount = (value: number): string => `${amountFormatter.format(value)} ${currencyLabel}`.trim();

  const filteredPipeline = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase(locale);
    if (!normalized) return data?.pipeline ?? [];
    return (data?.pipeline ?? []).filter((item) =>
      [item.documentNumber, item.customerName, item.userName, item.overrideNotes ?? '']
        .join(' ')
        .toLocaleLowerCase(locale)
        .includes(normalized),
    );
  }, [data?.pipeline, locale, search]);

  const years = Array.from({ length: 7 }, (_, index) => now.getFullYear() - 2 + index);
  const isLoading = plansQuery.isLoading || (planId != null && forecastQuery.isLoading);

  return (
    <div className="space-y-5">
      <ManagementListPageHeader
        title={t('title')}
        description={t('description')}
        backLabel={t('actions.back')}
      />

      <SalesPlanningWorkspaceNav />

      <section className="space-y-3">
        <div className="grid items-end gap-3 rounded-lg border bg-background p-3 md:grid-cols-2 xl:grid-cols-[140px_minmax(260px,1fr)_180px_240px_40px]">
          <div className="space-y-1.5">
            <Label>{t('filters.year')}</Label>
            <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
              <SelectTrigger aria-label={t('filters.year')}><SelectValue /></SelectTrigger>
              <SelectContent>{years.map((item) => <SelectItem key={item} value={String(item)}>{item}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('filters.plan')}</Label>
            <Select value={planId == null ? '' : String(planId)} onValueChange={(value) => setPlanId(Number(value))} disabled={plansQuery.isLoading || plans.length === 0}>
              <SelectTrigger aria-label={t('filters.plan')}><SelectValue placeholder={plansQuery.isLoading ? t('filters.loadingPlans') : t('filters.selectPlan')} /></SelectTrigger>
              <SelectContent>{plans.map((plan) => <SelectItem key={plan.id} value={String(plan.id)}>{plan.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('filters.month')}</Label>
            {selectedPlan?.periodType === 2 ? <div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm text-muted-foreground">{t('sales-planning:targets.fullPlanRange')}</div> : <Select value={String(month)} onValueChange={(value) => setMonth(Number(value))}>
              <SelectTrigger aria-label={t('filters.month')}><SelectValue /></SelectTrigger>
              <SelectContent>{Array.from({ length: 12 }, (_, index) => index + 1).map((item) => <SelectItem key={item} value={String(item)}>{monthLabel(item, locale)}</SelectItem>)}</SelectContent>
            </Select>}
          </div>
          <div className="space-y-1.5">
            <Label>{t('filters.metric')}</Label>
            <Select value={String(targetMetric)} onValueChange={(value) => setTargetMetric(Number(value) as SalesTargetMetric)}>
              <SelectTrigger aria-label={t('filters.metric')}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={String(SalesTargetMetric.NetOrderAmount)}>{t('metric.netOrderAmount')}</SelectItem>
                <SelectItem value={String(SalesTargetMetric.ErpOrderAmount)}>{t('metric.erpOrderAmount')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="size-10" onClick={() => void forecastQuery.refetch()} disabled={!planId || forecastQuery.isFetching} aria-label={t('actions.refresh')}>
                <RefreshCw className={cn('size-4', forecastQuery.isFetching && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('actions.refresh')}</TooltipContent>
          </Tooltip>
        </div>

        {isLoading ? (
          <ForecastSkeleton />
        ) : plansQuery.isError ? (
          <ErrorState message={t('errors.plans')} onRetry={() => void plansQuery.refetch()} />
        ) : plans.length === 0 ? (
          <EmptyState title={t('empty.noPlansTitle')} description={t('empty.noPlansDescription')} />
        ) : forecastQuery.isError ? (
          <ErrorState message={forecastQuery.error.message || t('errors.forecast')} onRetry={() => void forecastQuery.refetch()} />
        ) : !data ? (
          <EmptyState title={t('empty.selectPlanTitle')} description={t('empty.selectPlanDescription')} />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border bg-background px-4 py-3 text-sm">
              <span className="font-semibold">{data.planName}</span>
              <Badge variant="outline" className={cn('rounded-md', HEALTH_STYLES[data.summary.healthStatus])}>{t(`health.${HEALTH_KEYS[data.summary.healthStatus]}`)}</Badge>
              <span className="text-muted-foreground">{monthLabel(data.month, locale)} {data.planYear}</span>
              <span className="text-muted-foreground">{t('labels.currency')}: <strong className="text-foreground">{currencyLabel}</strong></span>
              <span className="ml-auto text-xs text-muted-foreground">{t('labels.generatedAt')}: {dateTimeFormatter.format(new Date(data.generatedAt))}</span>
            </div>

            {data.notice ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{data.notice}</span>
              </div>
            ) : null}

            <div className="grid overflow-hidden rounded-lg border bg-background sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: t('summary.target'), value: formatAmount(data.summary.targetValue), icon: Target },
                { label: t('summary.actual'), value: formatAmount(data.summary.actualValue), icon: CircleDollarSign },
                { label: t('summary.weightedForecast'), value: formatAmount(data.summary.forecastValue), icon: ChartNoAxesCombined },
                { label: t('summary.gap'), value: formatAmount(data.summary.gap), icon: Gauge },
              ].map((item) => (
                <div key={item.label} className="flex min-h-24 items-center gap-3 border-b p-4 last:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-last-child(-n+2)]:border-b-0 xl:border-b-0 xl:border-r xl:last:border-r-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><item.icon className="size-4" /></div>
                  <div className="min-w-0"><p className="truncate text-lg font-bold tabular-nums">{item.value}</p><p className="text-xs text-muted-foreground">{item.label}</p></div>
                </div>
              ))}
            </div>

            <div className="grid overflow-hidden rounded-lg border bg-background sm:grid-cols-2 lg:grid-cols-4">
              <RatioStat label={t('summary.grossPipeline')} value={formatAmount(data.summary.grossPipeline)} detail={t('summary.openQuotes', { count: data.summary.openQuotationCount })} />
              <RatioStat label={t('summary.weightedPipeline')} value={formatAmount(data.summary.weightedPipeline)} detail={t('summary.manualOverrides', { count: data.summary.manualOverrideCount })} />
              <RatioStat label={t('summary.coverage')} value={`%${percentFormatter.format(data.summary.coverageRatio)}`} detail={t('summary.grossCoverage')} />
              <RatioStat label={t('summary.weightedCoverage')} value={`%${percentFormatter.format(data.summary.weightedCoverageRatio)}`} detail={t('summary.expectedCoverage')} />
            </div>

            <section className="space-y-2">
              <div className="flex items-center gap-2"><Users className="size-4 text-primary" /><div><h2 className="text-sm font-semibold">{t('salespeople.title')}</h2><p className="text-xs text-muted-foreground">{t('salespeople.description')}</p></div></div>
              <div className="overflow-hidden rounded-lg border bg-background">
                {data.salespeople.length === 0 ? <EmptyState title={t('empty.noTargetsTitle')} description={t('empty.noTargetsDescription')} compact /> : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead>{t('salespeople.salesperson')}</TableHead><TableHead className="text-right">{t('summary.target')}</TableHead><TableHead className="text-right">{t('summary.actual')}</TableHead><TableHead className="text-right">{t('summary.weightedPipeline')}</TableHead><TableHead className="text-right">{t('summary.weightedForecast')}</TableHead><TableHead className="text-right">{t('summary.gap')}</TableHead><TableHead>{t('salespeople.status')}</TableHead></TableRow></TableHeader>
                      <TableBody>{data.salespeople.map((person) => <TableRow key={person.userId}><TableCell><p className="font-semibold">{person.userName}</p><p className="text-xs text-muted-foreground">{t('salespeople.winRate')}: %{percentFormatter.format(person.historicalWinRate)}</p></TableCell><TableCell className="whitespace-nowrap text-right tabular-nums">{formatAmount(person.targetValue)}</TableCell><TableCell className="whitespace-nowrap text-right tabular-nums">{formatAmount(person.actualValue)}</TableCell><TableCell className="whitespace-nowrap text-right tabular-nums">{formatAmount(person.weightedPipeline)}</TableCell><TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">{formatAmount(person.forecastValue)}</TableCell><TableCell className="whitespace-nowrap text-right tabular-nums">{formatAmount(person.gap)}</TableCell><TableCell><Badge variant="outline" className={cn('whitespace-nowrap rounded-md', HEALTH_STYLES[person.healthStatus])}>{t(`health.${HEALTH_KEYS[person.healthStatus]}`)}</Badge></TableCell></TableRow>)}</TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2"><CalendarClock className="size-4 text-primary" /><div><h2 className="text-sm font-semibold">{t('pipeline.title')}</h2><p className="text-xs text-muted-foreground">{t('pipeline.description')}</p></div></div>
                <div className="relative sm:ml-auto sm:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('filters.search')} className="pl-9" /></div>
              </div>
              <div className="overflow-hidden rounded-lg border bg-background">
                {filteredPipeline.length === 0 ? <EmptyState title={t('empty.noPipelineTitle')} description={t('empty.noPipelineDescription')} compact /> : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead>{t('pipeline.quotation')}</TableHead><TableHead>{t('pipeline.customer')}</TableHead><TableHead>{t('pipeline.salesperson')}</TableHead><TableHead className="text-right">{t('pipeline.amount')}</TableHead><TableHead className="text-right">{t('pipeline.probability')}</TableHead><TableHead className="text-right">{t('pipeline.weighted')}</TableHead><TableHead>{t('pipeline.closeDate')}</TableHead><TableHead>{t('pipeline.risk')}</TableHead><TableHead className="w-24 text-right">{t('pipeline.actions')}</TableHead></TableRow></TableHeader>
                      <TableBody>{filteredPipeline.map((item) => (
                        <TableRow key={item.quotationId}>
                          <TableCell><p className="font-semibold">{item.documentNumber}</p><p className="text-xs text-muted-foreground">{t(`quotationStatus.${QUOTATION_STATUS_KEYS[item.quotationStatus ?? 0] ?? 'notStarted'}`)}</p></TableCell>
                          <TableCell className="max-w-56"><p className="truncate">{item.customerName}</p><p className="text-xs text-muted-foreground">{t('pipeline.offerDate')}: {dateFormatter.format(new Date(item.offerDate))}</p></TableCell>
                          <TableCell className="whitespace-nowrap">{item.userName}</TableCell>
                          <TableCell className="whitespace-nowrap text-right tabular-nums">{formatAmount(item.amount)}</TableCell>
                          <TableCell className="whitespace-nowrap text-right"><span className="font-semibold tabular-nums">%{percentFormatter.format(item.appliedProbability)}</span><p className="text-xs text-muted-foreground">{item.probabilitySource === SalesForecastProbabilitySource.Manual ? t('pipeline.manual') : t('pipeline.calculated')}</p></TableCell>
                          <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">{formatAmount(item.weightedAmount)}</TableCell>
                          <TableCell className="whitespace-nowrap"><p>{dateFormatter.format(new Date(item.expectedCloseDate))}</p>{item.isCloseDateInferred ? <p className="text-xs text-muted-foreground">{t('pipeline.inferred')}</p> : null}</TableCell>
                          <TableCell><div className="flex flex-wrap gap-1">{item.isExpired ? <Badge variant="outline" className="rounded-md border-rose-300 bg-rose-50 text-rose-800">{t('pipeline.expired')}</Badge> : null}{item.isStale ? <Badge variant="outline" className="rounded-md border-amber-300 bg-amber-50 text-amber-800">{t('pipeline.stale')}</Badge> : null}{!item.isExpired && !item.isStale ? <span className="text-xs text-muted-foreground">{t('pipeline.noRisk')}</span> : null}</div></TableCell>
                          <TableCell><div className="flex justify-end gap-1">{canOpenQuotation ? <Tooltip><TooltipTrigger asChild><Button asChild variant="ghost" size="icon" className="size-8"><Link to={`/quotations/${item.quotationId}`} aria-label={t('actions.openQuotation')}><ExternalLink className="size-4" /></Link></Button></TooltipTrigger><TooltipContent>{t('actions.openQuotation')}</TooltipContent></Tooltip> : null}{canManage && !data.isHistoricalPeriod ? <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="size-8" onClick={() => setSelectedItem(item)} aria-label={t('actions.adjust')}><Pencil className="size-4" /></Button></TooltipTrigger><TooltipContent>{t('actions.adjust')}</TooltipContent></Tooltip> : null}</div></TableCell>
                        </TableRow>
                      ))}</TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </section>

      {planId != null ? <SalesForecastOverrideDialog open={selectedItem != null} onOpenChange={(open) => !open && setSelectedItem(null)} planId={planId} item={selectedItem} /> : null}
    </div>
  );
}

function RatioStat({ label, value, detail }: { label: string; value: string; detail: string }): ReactElement {
  return <div className="min-h-20 border-b p-4 last:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-last-child(-n+2)]:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-bold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{detail}</p></div>;
}

function ForecastSkeleton(): ReactElement {
  return <div className="space-y-3"><Skeleton className="h-14 w-full" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-24 w-full" />)}</div><Skeleton className="h-56 w-full" /><Skeleton className="h-72 w-full" /></div>;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }): ReactElement {
  const { t } = useTranslation('sales-forecast');
  return <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border bg-background p-6 text-center"><AlertTriangle className="size-8 text-destructive" /><p className="max-w-xl text-sm text-destructive">{message}</p><Button variant="outline" onClick={onRetry}>{t('actions.retry')}</Button></div>;
}

function EmptyState({ title, description, compact = false }: { title: string; description: string; compact?: boolean }): ReactElement {
  return <div className={cn('flex flex-col items-center justify-center gap-2 p-6 text-center', compact ? 'min-h-44' : 'min-h-56 rounded-lg border bg-background')}><Target className="size-8 text-muted-foreground" /><p className="font-medium">{title}</p><p className="max-w-lg text-sm text-muted-foreground">{description}</p></div>;
}
