import { type ReactElement, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CircleHelp, RefreshCw, LineChart, Target, Info, Loader2, BarChart3, TrendingUp, Zap, ChevronRight, Users, Coins } from 'lucide-react';
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
import { cn } from '@/lib/utils';

function recommendedActionCodeToKey(code: string): string {
  return code
    .replace(/\s+/g, '_')
    .replace(/([A-Z])/g, '_$1')
    .replace(/^_/, '')
    .toUpperCase();
}

function KpiCardSkeleton(): ReactElement {
  return (
    <Card className="rounded-2xl border border-slate-200 bg-white/50 p-1 dark:border-white/10 dark:bg-white/[0.02]">
      <CardContent className="pt-4 pb-3 px-4">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  );
}

const CHART_COLORS = ['#ec4899', '#f59e0b', '#8b5cf6'];

function CardTitleWithInfo({
  titleKey,
  explainKey,
  icon: Icon,
  iconClassName
}: {
  titleKey: string;
  explainKey: string;
  icon?: any;
  iconClassName?: string;
}): ReactElement {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2.5">
      {Icon && (
        <div className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm transition-transform group-hover:scale-105",
          iconClassName || "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
        )}>
          <Icon className="size-4" />
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <span className="text-base font-bold text-slate-800 dark:text-white">{t(titleKey)}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex text-slate-400 hover:text-pink-500 cursor-help transition-colors">
              <Info className="size-4 shrink-0" aria-hidden />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[280px] rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E1627] shadow-xl">
            <p className="text-sm font-medium">{t(explainKey)}</p>
          </TooltipContent>
        </Tooltip>
      </div>
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

  const getScoreStyles = (val: number) => {
    if (val >= 70) return 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20';
    if (val >= 40) return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20';
    return 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20';
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5 last:border-0 group transition-all hover:px-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</span>
        {explainKey && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help text-slate-300 hover:text-slate-500 transition-colors">
                <CircleHelp className="size-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px] rounded-lg">{t(explainKey)}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold border transition-transform group-hover:scale-110", getScoreStyles(safeValue))}>
        {safeValue.toFixed(1)}
      </div>
    </div>
  );
}

function RevenueQualityPanel({ quality }: { quality: RevenueQualityDto | null | undefined }): ReactElement {
  const { t } = useTranslation();
  return (
    <Card className="rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/[0.03] shadow-sm overflow-hidden relative group">
      <div className="pt-3 pb-2.5 px-5 border-b border-slate-100 dark:border-white/5">
        <CardTitleWithInfo
          titleKey="salesman360.revenueQuality.title"
          explainKey="salesman360.explain.revenueQualityTitle"
          icon={TrendingUp}
          iconClassName="bg-pink-50 dark:bg-pink-500/10 border-pink-100 dark:border-pink-500/20 text-pink-600 dark:text-pink-400"
        />
      </div>
      <CardContent className="px-5 pt-2 pb-5">
        <div className="space-y-1">
          <ScoreRow
            label={t('salesman360.revenueQuality.churnRisk')}
            value={quality?.churnRiskScore}
            explainKey="salesman360.explain.churnRisk"
          />
          <ScoreRow
            label={t('salesman360.revenueQuality.upsell')}
            value={quality?.upsellPropensityScore}
            explainKey="salesman360.explain.upsellPropensity"
          />
          <ScoreRow
            label={t('salesman360.revenueQuality.payment')}
            value={quality?.paymentBehaviorScore}
            explainKey="salesman360.explain.paymentBehavior"
          />
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5 last:border-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('salesman360.revenueQuality.segment')}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-help text-slate-300 hover:text-slate-500 transition-colors">
                    <CircleHelp className="size-3.5" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[260px] rounded-lg">{t('salesman360.explain.rfmSegment')}</TooltipContent>
              </Tooltip>
            </div>
            <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-xs font-bold text-slate-700 dark:text-white border border-slate-200 dark:border-white/10">
              {quality?.rfmSegment ?? '-'}
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 italic flex items-center gap-1.5">
          <Zap className="size-3.5 text-pink-500/50" />
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
    <Card className="rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/[0.03] shadow-sm overflow-hidden group">
      <div className="pt-3 pb-2.5 px-5 border-b border-slate-100 dark:border-white/5">
        <CardTitleWithInfo
          titleKey="salesman360.cohort.title"
          explainKey="salesman360.explain.cohortRetentionTitle"
          icon={Users}
          iconClassName="bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
        />
      </div>
      <CardContent className="px-5 pt-2 pb-5">
        {!first?.points?.length ? (
          <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
            <BarChart3 className="size-8 opacity-20" />
            <p className="text-sm font-medium">{t('salesman360.explain.noCohortData')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('salesman360.cohort.cohortKey')}</span>
              <span className="text-sm font-bold text-pink-600 dark:text-pink-400">{first.cohortKey}</span>
            </div>
            <div className="max-h-60 overflow-auto pr-1 custom-scrollbar space-y-1">
              {first.points.map((point) => (
                <div key={`${point.periodMonth}-${point.periodIndex}`} className="flex items-center justify-between text-sm py-2 px-1 border-b border-slate-50 dark:border-white/5 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/5 rounded-lg transition-colors group">
                  <span className="font-medium text-slate-600 dark:text-slate-400">{point.periodMonth}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden hidden sm:block">
                      <div className="h-full bg-pink-500 rounded-full" style={{ width: `${point.retentionRate}%` }} />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-white min-w-[50px] text-right">{point.retentionRate.toFixed(1)}%</span>
                  </div>
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
    <Card className="rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/[0.03] shadow-sm overflow-hidden group">
      <div className="pt-3 pb-2.5 px-5 border-b border-slate-100 dark:border-white/5">
        <CardTitleWithInfo
          titleKey="salesman360.actions.title"
          explainKey="salesman360.explain.recommendedActionsTitle"
          icon={Zap}
          iconClassName="bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20 text-orange-600 dark:text-orange-400"
        />
      </div>
      <CardContent className="px-5 pt-2 pb-5">
        {rows.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Target className="size-8 opacity-20" />
            <p className="text-sm font-medium">{t('salesman360.actions.empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((action) => {
              const actionKey = recommendedActionCodeToKey(action.actionCode);
              const title = t(`salesman360.actions.recommendedActions.${actionKey}.title`, { defaultValue: action.title });
              const reason = t(`salesman360.actions.recommendedActions.${actionKey}.reason`, { defaultValue: action.reason ?? '-' });
              return (
                <div key={`${action.actionCode}-${action.title}`} className="group relative rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 shadow-sm hover:shadow-md hover:border-pink-500/30 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <p className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-pink-500 shrink-0" />
                        {title}
                      </p>
                      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium pl-3.5">{reason}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onExecute(action)}
                      disabled={busy}
                      className="shrink-0 h-9 rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md font-bold px-4 gap-1.5 border-0
                      opacity-50 grayscale-[0] dark:opacity-100 dark:grayscale-0"
                    >
                      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
                      {t('salesman360.actions.execute')}
                    </Button>
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
  chartsEnabled = true,
}: {
  distribution: Salesmen360DistributionDto;
  monthlyTrend: { month: string; demandCount: number; quotationCount: number; orderCount: number }[];
  amountComparison: Salesmen360AmountComparisonDto;
  isSingleCurrency: boolean;
  currencyFormatter: Intl.NumberFormat;
  t: (key: string) => string;
  noDataKey: string;
  chartsEnabled?: boolean;
}): ReactElement {
  const recharts = useRechartsModule(chartsEnabled);
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
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
      <Card className="rounded-2xl border border-slate-200 bg-white/80 p-1 dark:border-white/10 dark:bg-white/[0.03] shadow-sm overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-base font-bold text-slate-800 dark:text-white">{t('salesman360.analyticsCharts.distributionTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {pieData.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-2 text-slate-400">
              <TrendingUp className="size-10 opacity-10" />
              <p className="text-sm font-medium">{t(noDataKey)}</p>
            </div>
          ) : !Recharts ? (
            <Skeleton className="h-64 w-full rounded-xl" />
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
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    stroke="none"
                  >
                    {pieData.map((_, i) => (
                      <Recharts.Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Recharts.Pie>
                  <Recharts.Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: '#1e293b', fontWeight: '600' }}
                    formatter={(v: number | undefined) => [v ?? 0, '']}
                  />
                </Recharts.PieChart>
              </Recharts.ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-slate-200 bg-white/80 p-1 dark:border-white/10 dark:bg-white/[0.03] shadow-sm overflow-hidden lg:col-span-2">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-base font-bold text-slate-800 dark:text-white">{t('salesman360.analyticsCharts.monthlyTrendTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {!monthlyTrend?.length ? (
            <div className="py-20 flex flex-col items-center gap-2 text-slate-400">
              <TrendingUp className="size-10 opacity-10" />
              <p className="text-sm font-medium">{t(noDataKey)}</p>
            </div>
          ) : !Recharts ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : (
            <div className="h-64">
              <Recharts.ResponsiveContainer width="100%" height="100%">
                <Recharts.LineChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <Recharts.CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-white/5" />
                  <Recharts.XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                  <Recharts.YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Recharts.Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                  <Recharts.Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: '600' }} />
                  <Recharts.Line type="monotone" dataKey="demandCount" name={t('salesman360.analyticsCharts.demand')} stroke={CHART_COLORS[0]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                  <Recharts.Line type="monotone" dataKey="quotationCount" name={t('salesman360.analyticsCharts.quotation')} stroke={CHART_COLORS[1]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                  <Recharts.Line type="monotone" dataKey="orderCount" name={t('salesman360.analyticsCharts.order')} stroke={CHART_COLORS[2]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                </Recharts.LineChart>
              </Recharts.ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {isSingleCurrency && (
        <Card className="rounded-2xl border border-slate-200 bg-white/80 p-1 dark:border-white/10 dark:bg-white/[0.03] shadow-sm overflow-hidden lg:col-span-3">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-base font-bold text-slate-800 dark:text-white">{t('salesman360.analyticsCharts.amountComparisonTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {!hasSingleBarData ? (
              <div className="py-20 flex flex-col items-center gap-2 text-slate-400">
                <Target className="size-10 opacity-10" />
                <p className="text-sm font-medium">{t(noDataKey)}</p>
              </div>
            ) : !Recharts ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : (
              <div className="h-64">
                <Recharts.ResponsiveContainer width="100%" height="100%">
                  <Recharts.BarChart data={singleBarData} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 5 }}>
                    <Recharts.CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-slate-100 dark:stroke-white/5" />
                    <Recharts.XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(v) => currencyFormatter.format(v)} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Recharts.YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: '600', fill: '#475569' }} />
                    <Recharts.Tooltip cursor={{ fill: 'transparent' }} formatter={(v: number | undefined) => [currencyFormatter.format(v ?? 0), '']} />
                    <Recharts.Bar dataKey="value" fill={CHART_COLORS[0]} radius={[0, 10, 10, 0]} barSize={32}>
                      {singleBarData.map((_, i) => (
                        <Recharts.Cell key={i} fill={i === 0 ? '#ec4899' : i === 1 ? '#f59e0b' : '#8b5cf6'} />
                      ))}
                    </Recharts.Bar>
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
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');
  const currencyParam = selectedCurrency === 'ALL' ? undefined : selectedCurrency;
  const { data: overview, isLoading, isError, error, refetch } = useSalesmenOverviewQuery(userId, currencyParam);
  const { data: summary, isLoading: isSummaryLoading, isError: isSummaryError } = useSalesmenAnalyticsSummaryQuery(userId, currencyParam, activeTab === 'analytics');
  const { data: charts, isLoading: isChartsLoading, isError: isChartsError } = useSalesmenAnalyticsChartsQuery(userId, 12, currencyParam, activeTab === 'analytics');
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
      <div className="w-full px-6 py-10">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 dark:border-white/10 dark:bg-white/[0.02] p-20 text-center flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <Target className="h-10 w-10 text-slate-300" />
          </div>
          <p className="text-slate-500 font-bold text-lg">{t('salesman360.notFound')}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full px-6 py-8 space-y-8">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-5 w-48 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
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
      <div className="w-full px-6 py-10">
        <Card className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] shadow-xl overflow-hidden">
          <CardContent className="p-20 text-center space-y-6">
            <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
              <RefreshCw className="h-10 w-10 text-red-400" />
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-bold text-xl">{is404 ? t('salesman360.notFound') : t('salesman360.error')}</p>
            {!is404 && (
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="rounded-2xl h-12 px-8 font-bold border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5 transition-all"
              >
                <RefreshCw className="h-5 w-5 mr-3" />
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
      <div className="w-full px-6 py-10 text-center">
        <p className="text-slate-500">{t('salesman360.notFound')}</p>
      </div>
    );
  }

  const kpis = overview.kpis;
  const subtitle = [overview.fullName ?? '', overview.email ?? ''].filter(Boolean).join(' · ') || '';
  const recommendedActions = overview.recommendedActions ?? [];

  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={0}>
      <div className="w-full px-1.5 pt-0 pb-8 space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col gap-5 pt-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-pink-100 dark:bg-white/5 shadow-inner border border-pink-200 dark:border-white/10 relative overflow-hidden group">
              <div className="absolute inset-0 bg-linear-to-br from-pink-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <LineChart className="h-8 w-8 text-pink-600 dark:text-pink-400 relative z-10" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
                {t('salesman360.title')}
              </h1>
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium">
                <span>{subtitle || t('salesman360.subtitle')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-0 w-fit rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-r border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
              <Target className="size-4 text-pink-500" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                {t('salesman360.currencyFilter.label')}
              </span>
            </div>
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger className="w-[140px] h-10 border-0 rounded-none bg-white dark:bg-transparent font-bold focus:ring-0 shadow-none hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 dark:bg-[#1E1627]">
                {currencyOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="rounded-lg focus:bg-pink-50 dark:focus:bg-pink-500/10">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overview' | 'analytics')} className="space-y-6">
          <div className="flex justify-center sm:justify-start">
            <TabsList className="h-11 p-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl shadow-inner">
              <TabsTrigger value="overview" className="rounded-xl px-6 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-[#130822] data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 data-[state=active]:shadow-md transition-all">
                {t('salesman360.tabs.overview')}
              </TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-xl px-6 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-[#130822] data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 data-[state=active]:shadow-md transition-all">
                {t('salesman360.tabs.analytics')}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6 outline-none">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <Card className="group rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/[0.03] shadow-sm hover:shadow-md transition-all overflow-hidden">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-100 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/20 shadow-sm transition-transform">
                      <ChevronRight className="size-4 text-pink-600 dark:text-pink-400" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{t('salesman360.kpi.totalDemands')}</p>
                  </div>
                  <p className="text-2xl font-black mt-2.5 text-slate-900 dark:text-white tabular-nums pl-10.5">{kpis.totalDemands ?? 0}</p>
                </CardContent>
              </Card>
              <Card className="group rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/[0.03] shadow-sm hover:shadow-md transition-all overflow-hidden">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 shadow-sm transition-transform">
                      <Zap className="size-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{t('salesman360.kpi.totalQuotations')}</p>
                  </div>
                  <p className="text-2xl font-black mt-2.5 text-slate-900 dark:text-white tabular-nums pl-10.5">{kpis.totalQuotations ?? 0}</p>
                </CardContent>
              </Card>
              <Card className="group rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/[0.03] shadow-sm hover:shadow-md transition-all overflow-hidden">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 shadow-sm transition-transform">
                      <Target className="size-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{t('salesman360.kpi.totalOrders')}</p>
                  </div>
                  <p className="text-2xl font-black mt-2.5 text-slate-900 dark:text-white tabular-nums pl-10.5">{kpis.totalOrders ?? 0}</p>
                </CardContent>
              </Card>
              <Card className="group rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/[0.03] shadow-sm hover:shadow-md transition-all overflow-hidden">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 shadow-sm transition-transform">
                      <Users className="size-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{t('salesman360.kpi.totalActivities')}</p>
                  </div>
                  <p className="text-2xl font-black mt-2.5 text-slate-900 dark:text-white tabular-nums pl-10.5">{kpis.totalActivities ?? 0}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
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

              {overviewTotalsByCurrency.length > 0 && (
                <Card className="rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/[0.03] shadow-sm overflow-hidden group">
                  <div className="pt-3 pb-2.5 px-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 shadow-sm transition-transform group-hover:scale-105">
                      <Coins className="size-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-base font-bold text-slate-800 dark:text-white">{t('salesman360.currencyTotals.title')}</span>
                  </div>
                  <CardContent className="p-0">
                    <div className="overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="dark:bg-[#231A2C] border-b-0">
                            <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white h-12 py-3 border-r border-slate-100 dark:border-white/5">{t('salesman360.currencyTotals.currency')}</TableHead>
                            <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white h-12 border-r border-slate-100 dark:border-white/5">{t('salesman360.currencyTotals.demandAmount')}</TableHead>
                            <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white h-12 border-r border-slate-100 dark:border-white/5">{t('salesman360.currencyTotals.quotationAmount')}</TableHead>
                            <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white h-12">{t('salesman360.currencyTotals.orderAmount')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {overviewTotalsByCurrency.map((row) => (
                            <TableRow key={row.currency} className="hover:bg-pink-50/30 dark:hover:bg-pink-500/5 transition-colors border-b border-slate-50 dark:border-white/5 last:border-0">
                              <TableCell className="font-bold text-slate-700 dark:text-white border-r border-slate-100 dark:border-white/5">{row.currency}</TableCell>
                              <TableCell className="text-right tabular-nums font-medium border-r border-slate-100 dark:border-white/5">{currencyFormatter.format(row.demandAmount ?? 0)}</TableCell>
                              <TableCell className="text-right tabular-nums font-medium border-r border-slate-100 dark:border-white/5">{currencyFormatter.format(row.quotationAmount ?? 0)}</TableCell>
                              <TableCell className="text-right tabular-nums font-medium">{currencyFormatter.format(row.orderAmount ?? 0)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {!isAllCurrencies && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Card className="rounded-2xl border border-slate-200 bg-white/80 p-1 dark:border-white/10 dark:bg-white/[0.03] shadow-sm overflow-hidden border-l-pink-500 border-l-4">
                  <CardContent className="pt-4 pb-3 px-6">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('salesman360.kpi.totalDemandAmount')}</p>
                    <p className="text-2xl font-black mt-2 text-slate-900 dark:text-white">{currencyFormatter.format(kpis.totalDemandAmount ?? 0)}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border border-slate-200 bg-white/80 p-1 dark:border-white/10 dark:bg-white/[0.03] shadow-sm overflow-hidden border-l-orange-500 border-l-4">
                  <CardContent className="pt-4 pb-3 px-6">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('salesman360.kpi.totalQuotationAmount')}</p>
                    <p className="text-2xl font-black mt-2 text-slate-900 dark:text-white">{currencyFormatter.format(kpis.totalQuotationAmount ?? 0)}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border border-slate-200 bg-white/80 p-1 dark:border-white/10 dark:bg-white/[0.03] shadow-sm overflow-hidden border-l-emerald-500 border-l-4">
                  <CardContent className="pt-4 pb-3 px-6">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('salesman360.kpi.totalOrderAmount')}</p>
                    <p className="text-2xl font-black mt-2 text-slate-900 dark:text-white">{currencyFormatter.format(kpis.totalOrderAmount ?? 0)}</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6 outline-none">
            {isSummaryError ? (
              <Card className="rounded-2xl border border-dashed border-red-200 bg-red-50/30 dark:border-red-500/20 dark:bg-red-500/5">
                <CardContent className="p-10 text-center text-sm font-medium text-red-500">{t('salesman360.analytics.error')}</CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                  <div className="lg:col-span-7">
                    <SalesmenCurrencySummaryCards
                      isAllCurrencies={isAllCurrencies}
                      summary={summary ?? null}
                      totalsByCurrency={isAllCurrencies ? (summary?.totalsByCurrency ?? overviewTotalsByCurrency) : []}
                      isLoading={isSummaryLoading}
                      lastActivityDateFormatted={lastActivityDateFormatted}
                    />
                  </div>
                  <div className="lg:col-span-5">
                    <SalesmenAmountComparisonByCurrencyTable
                      rows={chartsAmountComparisonByCurrency}
                      isLoading={isChartsLoading}
                    />
                  </div>
                </div>

                {isChartsError ? (
                  <Card className="rounded-2xl border border-dashed border-red-200 bg-red-50/30 dark:border-red-500/20 dark:bg-red-500/5">
                    <CardContent className="p-10 text-center text-sm font-medium text-red-500">{t('salesman360.analytics.error')}</CardContent>
                  </Card>
                ) : isChartsLoading ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="rounded-2xl border border-slate-200 bg-white/50 dark:border-white/10 dark:bg-white/[0.02]">
                        <CardHeader><Skeleton className="h-6 w-40 rounded-lg" /></CardHeader>
                        <CardContent><Skeleton className="h-64 w-full rounded-xl" /></CardContent>
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
                    chartsEnabled={activeTab === 'analytics'}
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
