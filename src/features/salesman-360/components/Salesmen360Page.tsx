import { type ReactElement, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CircleHelp, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/auth-store';
import {
  useSalesmenOverviewQuery,
  useSalesmenAnalyticsSummaryQuery,
  useSalesmenAnalyticsChartsQuery,
  useSalesmenCohortQuery,
  useExecuteSalesmenActionMutation,
} from '../hooks/useSalesmen360';
import { SalesmenCurrencySummaryCards } from './SalesmenCurrencySummaryCards';
import { SalesmenAmountComparisonByCurrencyTable } from './SalesmenAmountComparisonByCurrencyTable';
import { useRechartsModule } from '@/lib/useRechartsModule';
import type {
  CohortRetentionDto,
  RecommendedActionDto,
  RevenueQualityDto,
  Salesmen360DistributionDto,
  Salesmen360AmountComparisonDto,
} from '../types/salesmen360.types';

function recommendedActionCodeToKey(code: string): string {
  return code
    .replace(/\s+/g, '_')
    .replace(/([A-Z])/g, '_$1')
    .replace(/^_/, '')
    .toUpperCase();
}

function KpiCardSkeleton(): ReactElement {
  return (
    <Card className="rounded-xl border border-slate-200 dark:border-white/10">
      <CardContent className="pt-6">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  );
}

const CHART_COLORS = ['#8b5cf6', '#ec4899', '#f59e0b'];

function CardTitleWithInfo({ titleKey, explainKey }: { titleKey: string; explainKey: string }): ReactElement {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-base">{t(titleKey)}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex text-muted-foreground hover:text-foreground cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
            <CircleHelp className="size-4 shrink-0" aria-hidden />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px]">
          {t(explainKey)}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function ScoreRow({
  label,
  value,
  explainKey,
}: {
  label: string;
  value: number | null | undefined;
  explainKey?: string;
}): ReactElement {
  const { t } = useTranslation();
  const safeValue = value ?? 0;
  const toneClass = safeValue >= 70 ? 'text-emerald-600' : safeValue >= 40 ? 'text-amber-600' : 'text-rose-600';
  const labelEl = explainKey ? (
    <span className="flex items-center gap-1 text-muted-foreground">
      {label}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
            <CircleHelp className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px]">
          {t(explainKey)}
        </TooltipContent>
      </Tooltip>
    </span>
  ) : (
    <span className="text-muted-foreground">{label}</span>
  );
  return (
    <div className="flex items-center justify-between text-sm py-1.5">
      {labelEl}
      <span className={`font-semibold ${toneClass}`}>{safeValue.toFixed(2)}</span>
    </div>
  );
}

function RevenueQualityPanel({ quality }: { quality: RevenueQualityDto | null | undefined }): ReactElement {
  const { t } = useTranslation();
  return (
    <Card className="rounded-xl border border-slate-200 dark:border-white/10">
      <CardHeader>
        <CardTitle className="text-base">
          <CardTitleWithInfo
            titleKey="salesman360.revenueQuality.title"
            explainKey="salesman360.explain.revenueQualityTitle"
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <ScoreRow
          label={t('salesman360.revenueQuality.churnRisk', 'Churn Risk')}
          value={quality?.churnRiskScore}
          explainKey="salesman360.explain.churnRisk"
        />
        <ScoreRow
          label={t('salesman360.revenueQuality.upsell', 'Upsell Propensity')}
          value={quality?.upsellPropensityScore}
          explainKey="salesman360.explain.upsellPropensity"
        />
        <ScoreRow
          label={t('salesman360.revenueQuality.payment', 'Payment Behavior')}
          value={quality?.paymentBehaviorScore}
          explainKey="salesman360.explain.paymentBehavior"
        />
        <div className="flex items-center justify-between text-sm py-1.5 pt-1">
          <span className="flex items-center gap-1 text-muted-foreground">
            {t('salesman360.revenueQuality.segment', 'RFM Segment')}:{' '}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
                  <CircleHelp className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px]">
                {t('salesman360.explain.rfmSegment')}
              </TooltipContent>
            </Tooltip>
          </span>
          <span className="font-medium">{quality?.rfmSegment ?? '-'}</span>
        </div>
        <p className="text-xs text-muted-foreground border-t border-slate-100 dark:border-white/5 mt-2 pt-2">
          {t('salesman360.explain.modelNote')}
        </p>
      </CardContent>
    </Card>
  );
}

function CohortRetentionPanel({
  rows,
}: {
  rows: CohortRetentionDto[] | undefined;
}): ReactElement {
  const { t } = useTranslation();
  const first = rows?.[0];
  return (
    <Card className="rounded-xl border border-slate-200 dark:border-white/10">
      <CardHeader>
        <CardTitle className="text-base">
          <CardTitleWithInfo
            titleKey="salesman360.cohort.title"
            explainKey="salesman360.explain.cohortRetentionTitle"
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!first?.points?.length ? (
          <p className="text-sm text-muted-foreground">
            {t('salesman360.explain.noCohortData')}
          </p>
        ) : (
          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">{t('salesman360.cohort.cohortKey', 'Cohort')}: </span>
              <span className="font-medium">{first.cohortKey}</span>
            </div>
            <div className="max-h-56 overflow-auto space-y-1">
              {first.points.map((point) => (
                <div key={`${point.periodMonth}-${point.periodIndex}`} className="flex items-center justify-between text-sm py-1 border-b border-slate-100 dark:border-white/5 last:border-0">
                  <span>{point.periodMonth}</span>
                  <span className="font-medium">{point.retentionRate.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecommendedActionsPanel({
  rows,
  busy,
  onExecute,
}: {
  rows: RecommendedActionDto[];
  busy: boolean;
  onExecute: (row: RecommendedActionDto) => void;
}): ReactElement {
  const { t } = useTranslation();
  return (
    <Card className="rounded-xl border border-slate-200 dark:border-white/10">
      <CardHeader>
        <CardTitle className="text-base">
          <CardTitleWithInfo
            titleKey="salesman360.actions.title"
            explainKey="salesman360.explain.recommendedActionsTitle"
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('salesman360.actions.empty', 'No recommended actions')}</p>
        ) : (
          <div className="space-y-3">
            {rows.map((action) => {
              const actionKey = recommendedActionCodeToKey(action.actionCode);
              const title = t(`salesman360.actions.recommendedActions.${actionKey}.title`, { defaultValue: action.title });
              const reason = t(`salesman360.actions.recommendedActions.${actionKey}.reason`, { defaultValue: action.reason ?? '-' });
              return (
              <div key={`${action.actionCode}-${action.title}`} className="rounded-lg border border-slate-200 dark:border-white/10 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{reason}</p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Button size="sm" onClick={() => onExecute(action)} disabled={busy}>
                          {t('salesman360.actions.execute', 'Execute')}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px]">
                      {t('salesman360.explain.executeAction')}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DistributionAndTrendCharts({
  distribution,
  monthlyTrend,
  amountComparison,
  isSingleCurrency,
  currencyFormatter,
  t,
  noDataKey,
}: {
  distribution: Salesmen360DistributionDto;
  monthlyTrend: { month: string; demandCount: number; quotationCount: number; orderCount: number }[];
  amountComparison: Salesmen360AmountComparisonDto;
  isSingleCurrency: boolean;
  currencyFormatter: Intl.NumberFormat;
  t: (key: string) => string;
  noDataKey: string;
}): ReactElement {
  const recharts = useRechartsModule();
  const Recharts = recharts;
  const pieData = [
    { name: t('salesman360.analyticsCharts.demand'), value: distribution.demandCount },
    { name: t('salesman360.analyticsCharts.quotation'), value: distribution.quotationCount },
    { name: t('salesman360.analyticsCharts.order'), value: distribution.orderCount },
  ].filter((d) => d.value > 0);

  const singleBarData = [
    { name: t('salesman360.analyticsCharts.last12MonthsOrderAmount'), value: amountComparison.last12MonthsOrderAmount },
    { name: t('salesman360.analyticsCharts.openQuotationAmount'), value: amountComparison.openQuotationAmount },
    { name: t('salesman360.analyticsCharts.openOrderAmount'), value: amountComparison.openOrderAmount },
  ];
  const hasSingleBarData = singleBarData.some((d) => d.value > 0);

  return (
    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
      <Card className="rounded-xl border border-slate-200 dark:border-white/10">
        <CardHeader>
          <CardTitle className="text-base">{t('salesman360.analyticsCharts.distributionTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t(noDataKey)}</p>
          ) : !Recharts ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="h-64">
              <Recharts.ResponsiveContainer width="100%" height="100%">
                <Recharts.PieChart>
                  <Recharts.Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, i) => (
                      <Recharts.Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Recharts.Pie>
                  <Recharts.Tooltip formatter={(v: number | undefined) => [v ?? 0, '']} />
                </Recharts.PieChart>
              </Recharts.ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-slate-200 dark:border-white/10 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">{t('salesman360.analyticsCharts.monthlyTrendTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!monthlyTrend?.length ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t(noDataKey)}</p>
          ) : !Recharts ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="h-64">
              <Recharts.ResponsiveContainer width="100%" height="100%">
                <Recharts.LineChart data={monthlyTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <Recharts.CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <Recharts.XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <Recharts.YAxis tick={{ fontSize: 11 }} />
                  <Recharts.Tooltip />
                  <Recharts.Legend />
                  <Recharts.Line type="monotone" dataKey="demandCount" name={t('salesman360.analyticsCharts.demand')} stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
                  <Recharts.Line type="monotone" dataKey="quotationCount" name={t('salesman360.analyticsCharts.quotation')} stroke={CHART_COLORS[1]} strokeWidth={2} dot={{ r: 3 }} />
                  <Recharts.Line type="monotone" dataKey="orderCount" name={t('salesman360.analyticsCharts.order')} stroke={CHART_COLORS[2]} strokeWidth={2} dot={{ r: 3 }} />
                </Recharts.LineChart>
              </Recharts.ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {isSingleCurrency && (
        <Card className="rounded-xl border border-slate-200 dark:border-white/10 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">{t('salesman360.analyticsCharts.amountComparisonTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {!hasSingleBarData ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{t(noDataKey)}</p>
            ) : !Recharts ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="h-64">
                <Recharts.ResponsiveContainer width="100%" height="100%">
                  <Recharts.BarChart data={singleBarData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                    <Recharts.CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <Recharts.XAxis type="number" tickFormatter={(v) => currencyFormatter.format(v)} tick={{ fontSize: 11 }} />
                    <Recharts.YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 11 }} />
                    <Recharts.Tooltip formatter={(v: number | undefined) => [currencyFormatter.format(v ?? 0), '']} />
                    <Recharts.Bar dataKey="value" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
                  </Recharts.BarChart>
                </Recharts.ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function Salesmen360Page(): ReactElement {
  const params = useParams<{ userId: string }>();
  const { t, i18n } = useTranslation();
  const authUser = useAuthStore((s) => s.user);
  const rawUserId = params.userId ?? '';
  const userId = rawUserId === 'me' ? (authUser?.id ?? 0) : Number(rawUserId || 0);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('ALL');
  const currencyParam = selectedCurrency === 'ALL' ? undefined : selectedCurrency;
  const { data: overview, isLoading, isError, error, refetch } = useSalesmenOverviewQuery(userId, currencyParam);
  const { data: summary, isLoading: isSummaryLoading, isError: isSummaryError } = useSalesmenAnalyticsSummaryQuery(userId, currencyParam);
  const { data: charts, isLoading: isChartsLoading, isError: isChartsError } = useSalesmenAnalyticsChartsQuery(userId, 12, currencyParam);
  const { data: cohortData, isLoading: isCohortLoading } = useSalesmenCohortQuery(userId, 12);
  const executeActionMutation = useExecuteSalesmenActionMutation(userId);

  const currencyFormatter = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const currenciesFromOverview = overview?.kpis?.totalsByCurrency ?? [];
  const currenciesFromSummary = summary?.totalsByCurrency ?? [];
  const currenciesFromCharts = charts?.amountComparisonByCurrency ?? [];
  const currencySet = new Set<string>();
  for (const r of currenciesFromOverview) {
    if (r.currency) currencySet.add(r.currency);
  }
  for (const r of currenciesFromSummary) {
    if (r.currency) currencySet.add(r.currency);
  }
  for (const r of currenciesFromCharts) {
    const c = (r as Salesmen360AmountComparisonDto).currency;
    if (c) currencySet.add(c);
  }
  const allCurrencies = Array.from(currencySet);
  const currencyOptions = [
    { value: 'ALL', label: t('salesman360.currencyFilter.all') },
    ...allCurrencies.map((c) => ({ value: c, label: c })),
  ];

  const isAllCurrencies = selectedCurrency === 'ALL';
  const overviewTotalsByCurrency = overview?.kpis?.totalsByCurrency ?? [];
  const chartsAmountComparisonByCurrency = charts?.amountComparisonByCurrency ?? [];

  const lastActivityDateFormatted = summary?.lastActivityDate
    ? new Date(summary.lastActivityDate).toLocaleDateString(i18n.language)
    : '-';

  if (userId <= 0) {
    return (
      <div className="container py-8">
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 p-8 text-center">
          <p className="text-muted-foreground">{t('salesman360.notFound')}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    const is404 =
      (error as { response?: { status?: number } })?.response?.status === 404 ||
      /not found|bulunamadı/i.test((error as Error)?.message ?? '');
    return (
      <div className="container py-8">
        <Card className="rounded-xl border border-dashed border-slate-200 dark:border-white/10">
          <CardContent className="pt-6 p-8 text-center space-y-4">
            <p className="text-muted-foreground">{is404 ? t('salesman360.notFound') : t('salesman360.error')}</p>
            {!is404 && (
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('salesman360.retry')}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="container py-8">
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 p-8 text-center">
          <p className="text-muted-foreground">{t('salesman360.notFound')}</p>
        </div>
      </div>
    );
  }

  const kpis = overview.kpis;
  const subtitle = [overview.fullName ?? '', overview.email ?? ''].filter(Boolean).join(' · ') || '';
  const recommendedActions = overview.recommendedActions ?? [];

  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={0}>
      <div className="container py-6 space-y-6">
        <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('salesman360.title')}</h1>
          <p className="text-muted-foreground text-sm">{subtitle || t('salesman360.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-medium text-muted-foreground">
            {t('salesman360.currencyFilter.label')}
          </label>
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencyOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t('salesman360.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('salesman360.tabs.analytics')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="rounded-xl border border-slate-200 dark:border-white/10">
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('salesman360.kpi.totalDemands')}</p>
                <p className="text-2xl font-bold mt-1">{kpis.totalDemands ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border border-slate-200 dark:border-white/10">
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('salesman360.kpi.totalQuotations')}</p>
                <p className="text-2xl font-bold mt-1">{kpis.totalQuotations ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border border-slate-200 dark:border-white/10">
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('salesman360.kpi.totalOrders')}</p>
                <p className="text-2xl font-bold mt-1">{kpis.totalOrders ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border border-slate-200 dark:border-white/10">
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('salesman360.kpi.totalActivities')}</p>
                <p className="text-2xl font-bold mt-1">{kpis.totalActivities ?? 0}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <RevenueQualityPanel quality={overview.revenueQuality} />
            <RecommendedActionsPanel
              rows={recommendedActions}
              busy={executeActionMutation.isPending}
              onExecute={(action) =>
                executeActionMutation.mutate({
                  actionCode: action.actionCode,
                  title: action.title,
                  reason: action.reason ?? undefined,
                  dueInDays: 1,
                  priority: 'High',
                })
              }
            />
            {isCohortLoading ? <KpiCardSkeleton /> : <CohortRetentionPanel rows={cohortData} />}
          </div>

          {!isAllCurrencies && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Card className="rounded-xl border border-slate-200 dark:border-white/10">
                <CardContent className="pt-6">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('salesman360.kpi.totalDemandAmount')}</p>
                  <p className="text-2xl font-bold mt-1">{currencyFormatter.format(kpis.totalDemandAmount ?? 0)}</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl border border-slate-200 dark:border-white/10">
                <CardContent className="pt-6">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('salesman360.kpi.totalQuotationAmount')}</p>
                  <p className="text-2xl font-bold mt-1">{currencyFormatter.format(kpis.totalQuotationAmount ?? 0)}</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl border border-slate-200 dark:border-white/10">
                <CardContent className="pt-6">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('salesman360.kpi.totalOrderAmount')}</p>
                  <p className="text-2xl font-bold mt-1">{currencyFormatter.format(kpis.totalOrderAmount ?? 0)}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {overviewTotalsByCurrency.length > 0 && (
            <Card className="rounded-xl border border-slate-200 dark:border-white/10">
              <CardHeader>
                <CardTitle className="text-base">{t('salesman360.currencyTotals.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('salesman360.currencyTotals.currency')}</TableHead>
                      <TableHead className="text-right">{t('salesman360.currencyTotals.demandAmount')}</TableHead>
                      <TableHead className="text-right">{t('salesman360.currencyTotals.quotationAmount')}</TableHead>
                      <TableHead className="text-right">{t('salesman360.currencyTotals.orderAmount')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overviewTotalsByCurrency.map((row) => (
                      <TableRow key={row.currency}>
                        <TableCell className="font-medium">{row.currency}</TableCell>
                        <TableCell className="text-right">{currencyFormatter.format(row.demandAmount ?? 0)}</TableCell>
                        <TableCell className="text-right">{currencyFormatter.format(row.quotationAmount ?? 0)}</TableCell>
                        <TableCell className="text-right">{currencyFormatter.format(row.orderAmount ?? 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {isSummaryError ? (
            <Card className="rounded-xl border border-dashed border-slate-200 dark:border-white/10">
              <CardContent className="pt-6 text-sm text-muted-foreground">{t('salesman360.analytics.error')}</CardContent>
            </Card>
          ) : (
            <>
              <SalesmenCurrencySummaryCards
                isAllCurrencies={isAllCurrencies}
                summary={summary ?? null}
                totalsByCurrency={isAllCurrencies ? (summary?.totalsByCurrency ?? overviewTotalsByCurrency) : []}
                isLoading={isSummaryLoading}
                lastActivityDateFormatted={lastActivityDateFormatted}
              />

              <SalesmenAmountComparisonByCurrencyTable
                rows={chartsAmountComparisonByCurrency}
                isLoading={isChartsLoading}
              />

              {isChartsError ? (
                <Card className="rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                  <CardContent className="pt-6 text-sm text-muted-foreground">{t('salesman360.analytics.error')}</CardContent>
                </Card>
              ) : isChartsLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="rounded-xl border border-slate-200 dark:border-white/10">
                      <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
                      <CardContent><Skeleton className="h-64 w-full" /></CardContent>
                    </Card>
                  ))}
                </div>
              ) : charts ? (
                <DistributionAndTrendCharts
                  distribution={charts.distribution}
                  monthlyTrend={charts.monthlyTrend}
                  amountComparison={charts.amountComparison}
                  isSingleCurrency={!isAllCurrencies}
                  currencyFormatter={currencyFormatter}
                  t={t}
                  noDataKey="common.noData"
                />
              ) : null}
            </>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </TooltipProvider>
  );
}
