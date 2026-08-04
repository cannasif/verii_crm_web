import { type ReactElement } from 'react';
import {
  BarChart3,
  CircleHelp,
  Info,
  Loader2,
  Target,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useRechartsModule } from '@/lib/useRechartsModule';
import { cn } from '@/lib/utils';
import type {
  CohortRetentionDto,
  RecommendedActionDto,
  RevenueQualityDto,
  Salesmen360AmountComparisonDto,
  Salesmen360DistributionDto,
} from '../../types/salesmen360.types';
import {
  formatSalesmen360PeriodLabel,
  translateSalesmen360RfmSegment,
} from '../../utils/localizedDisplay';
import { translateRecommendedActionCopy } from '../../utils/recommendedActionsI18n';

const CHART_COLORS = ['#ec4899', '#f59e0b', '#8b5cf6'];

function CardTitleWithInfo({
  titleKey,
  explainKey,
  icon: Icon,
  iconClassName,
}: {
  titleKey: string;
  explainKey: string;
  icon?: LucideIcon;
  iconClassName?: string;
}): ReactElement {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2.5">
      {Icon ? (
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm transition-transform group-hover:scale-105',
            iconClassName ??
              'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
          )}
        >
          <Icon className="size-4" />
        </div>
      ) : null}
      <div className="flex items-center gap-1.5">
        <span className="text-base font-bold text-slate-800 dark:text-white">{t(titleKey)}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-help text-slate-400 transition-colors hover:text-red-500">
              <Info className="size-4 shrink-0" aria-hidden />
            </span>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="max-w-[280px] rounded-xl border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#1E1627]"
          >
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
  const scoreStyles =
    safeValue >= 70
      ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20'
      : safeValue >= 40
        ? 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20'
        : 'text-primary bg-accent dark:text-primary dark:bg-primary/10 border-primary/15 dark:border-primary/20';

  return (
    <div className="group flex items-center justify-between border-b border-slate-100 py-2 transition-all last:border-0 hover:px-1 dark:border-white/5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</span>
        {explainKey ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help text-slate-300 transition-colors hover:text-slate-500">
                <CircleHelp className="size-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px] rounded-lg">
              {t(explainKey)}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      <div
        className={cn(
          'rounded-full border px-2.5 py-0.5 text-xs font-bold transition-transform group-hover:scale-110',
          scoreStyles
        )}
      >
        {safeValue.toFixed(1)}
      </div>
    </div>
  );
}

export function RevenueQualityPanel({
  quality,
}: {
  quality: RevenueQualityDto | null | undefined;
}): ReactElement {
  const { t } = useTranslation();

  return (
    <Card className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/3">
      <div className="border-b border-slate-100 px-5 pb-2.5 pt-3 dark:border-white/5">
        <CardTitleWithInfo
          titleKey="salesman360.revenueQuality.title"
          explainKey="salesman360.explain.revenueQualityTitle"
          icon={TrendingUp}
          iconClassName="bg-accent dark:bg-primary/10 border-primary/15 dark:border-primary/20 text-red-600 dark:text-red-400"
        />
      </div>
      <CardContent className="px-5 pb-5 pt-2">
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
          <div className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0 dark:border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {t('salesman360.revenueQuality.segment')}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-help text-slate-300 transition-colors hover:text-slate-500">
                    <CircleHelp className="size-3.5" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[260px] rounded-lg">
                  {t('salesman360.explain.rfmSegment')}
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white">
              {translateSalesmen360RfmSegment(quality?.rfmSegment ?? null, t)}
            </span>
          </div>
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-xs italic text-slate-400 dark:text-slate-500">
          <Zap className="size-3.5 text-red-500/50" />
          {t('salesman360.explain.modelNote')}
        </p>
      </CardContent>
    </Card>
  );
}

export function CohortRetentionPanel({
  rows,
}: {
  rows: CohortRetentionDto[] | undefined;
}): ReactElement {
  const { t, i18n } = useTranslation();
  const first = rows?.[0];
  const cohortLabel = first?.cohortKey
    ? formatSalesmen360PeriodLabel(first.cohortKey, i18n.language)
    : '';

  return (
    <Card className="group overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/3">
      <div className="border-b border-slate-100 px-5 pb-2.5 pt-3 dark:border-white/5">
        <CardTitleWithInfo
          titleKey="salesman360.cohort.title"
          explainKey="salesman360.explain.cohortRetentionTitle"
          icon={Users}
          iconClassName="bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
        />
      </div>
      <CardContent className="px-5 pb-5 pt-2">
        {!first?.points?.length ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
            <BarChart3 className="size-8 opacity-20" />
            <p className="text-sm font-medium">{t('salesman360.explain.noCohortData')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-white/5 dark:bg-white/5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t('salesman360.cohort.cohortKey')}
              </span>
              <span className="text-sm font-bold text-red-600 dark:text-red-400">
                {cohortLabel || first.cohortKey}
              </span>
            </div>
            <div className="custom-scrollbar max-h-60 space-y-1 overflow-auto pr-1">
              {first.points.map((point) => (
                <div
                  key={`${point.periodMonth}-${point.periodIndex}`}
                  className="group flex items-center justify-between rounded-lg border-b border-slate-50 px-1 py-2 text-sm transition-colors last:border-0 hover:bg-slate-50/50 dark:border-white/5 dark:hover:bg-white/5"
                >
                  <span className="font-medium text-slate-600 dark:text-slate-400">
                    {formatSalesmen360PeriodLabel(point.periodMonth, i18n.language)}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5 sm:block">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${point.retentionRate}%` }}
                      />
                    </div>
                    <span className="min-w-[50px] text-right font-bold text-slate-800 dark:text-white">
                      {point.retentionRate.toFixed(1)}%
                    </span>
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

export function RecommendedActionsPanel({
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
    <Card className="group overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/3">
      <div className="border-b border-slate-100 px-5 pb-2.5 pt-3 dark:border-white/5">
        <CardTitleWithInfo
          titleKey="salesman360.actions.title"
          explainKey="salesman360.explain.recommendedActionsTitle"
          icon={Zap}
          iconClassName="bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20 text-orange-600 dark:text-orange-400"
        />
      </div>
      <CardContent className="px-5 pb-5 pt-2">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
            <Target className="size-8 opacity-20" />
            <p className="text-sm font-medium">{t('salesman360.actions.empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((action) => {
              const { title, reason } = translateRecommendedActionCopy(action, t);
              return (
                <div
                  key={`${action.actionCode}-${action.title}`}
                  className="group relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <p className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        {title}
                      </p>
                      <p className="pl-3.5 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                        {reason}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onExecute(action)}
                      disabled={busy}
                      className="h-9 shrink-0 gap-1.5 rounded-xl border-0 bg-[image:var(--crm-brand-gradient)] px-4 font-bold text-white shadow-[0_4px_14px_-6px_var(--crm-brand-shadow)] transition-all hover:-translate-y-0.5 hover:text-white hover:shadow-[0_6px_20px_-6px_var(--crm-brand-shadow)] active:translate-y-0"
                    >
                      {busy ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Zap className="size-3.5" />
                      )}
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

export function DistributionAndTrendCharts({
  distribution,
  monthlyTrend,
  amountComparison,
  isSingleCurrency,
  currencyFormatter,
  t,
  locale,
  noDataKey,
  chartsEnabled = true,
}: {
  distribution: Salesmen360DistributionDto;
  monthlyTrend: {
    month: string;
    demandCount: number;
    quotationCount: number;
    orderCount: number;
  }[];
  amountComparison: Salesmen360AmountComparisonDto;
  isSingleCurrency: boolean;
  currencyFormatter: Intl.NumberFormat;
  t: (key: string) => string;
  locale: string;
  noDataKey: string;
  chartsEnabled?: boolean;
}): ReactElement {
  const Recharts = useRechartsModule(chartsEnabled);
  const pieData = [
    { name: t('salesman360.analyticsCharts.demand'), value: distribution.demandCount },
    { name: t('salesman360.analyticsCharts.quotation'), value: distribution.quotationCount },
    { name: t('salesman360.analyticsCharts.order'), value: distribution.orderCount },
  ].filter((item) => item.value > 0);
  const singleBarData = [
    {
      name: t('salesman360.analyticsCharts.last12MonthsOrderAmount'),
      value: amountComparison.last12MonthsOrderAmount,
    },
    {
      name: t('salesman360.analyticsCharts.openQuotationAmount'),
      value: amountComparison.openQuotationAmount,
    },
    {
      name: t('salesman360.analyticsCharts.openOrderAmount'),
      value: amountComparison.openOrderAmount,
    },
  ];
  const hasSingleBarData = singleBarData.some((item) => item.value > 0);

  return (
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
      <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 p-1 shadow-sm dark:border-white/10 dark:bg-white/3">
        <CardHeader className="px-5 pb-2 pt-4">
          <CardTitle className="text-base font-bold text-slate-800 dark:text-white">
            {t('salesman360.analyticsCharts.distributionTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {pieData.length === 0 ? (
            <EmptyChart icon={TrendingUp} label={t(noDataKey)} />
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
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    stroke="none"
                  >
                    {pieData.map((_, index) => (
                      <Recharts.Cell
                        key={index}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Recharts.Pie>
                  <Recharts.Tooltip formatter={(value) => [Number(Array.isArray(value) ? (value[0] ?? 0) : (value ?? 0)), '']} />
                </Recharts.PieChart>
              </Recharts.ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 p-1 shadow-sm dark:border-white/10 dark:bg-white/3 lg:col-span-2">
        <CardHeader className="px-5 pb-2 pt-4">
          <CardTitle className="text-base font-bold text-slate-800 dark:text-white">
            {t('salesman360.analyticsCharts.monthlyTrendTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {!monthlyTrend.length ? (
            <EmptyChart icon={TrendingUp} label={t(noDataKey)} />
          ) : !Recharts ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : (
            <div className="h-64">
              <Recharts.ResponsiveContainer width="100%" height="100%">
                <Recharts.LineChart
                  data={monthlyTrend}
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                >
                  <Recharts.CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    className="stroke-slate-100 dark:stroke-white/5"
                  />
                  <Recharts.XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    dy={10}
                    tickFormatter={(value) =>
                      formatSalesmen360PeriodLabel(String(value), locale)
                    }
                  />
                  <Recharts.YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <Recharts.Tooltip
                    labelFormatter={(label) =>
                      formatSalesmen360PeriodLabel(String(label), locale)
                    }
                  />
                  <Recharts.Legend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px', fontWeight: '600' }}
                  />
                  <Recharts.Line
                    type="monotone"
                    dataKey="demandCount"
                    name={t('salesman360.analyticsCharts.demand')}
                    stroke={CHART_COLORS[0]}
                    strokeWidth={3}
                  />
                  <Recharts.Line
                    type="monotone"
                    dataKey="quotationCount"
                    name={t('salesman360.analyticsCharts.quotation')}
                    stroke={CHART_COLORS[1]}
                    strokeWidth={3}
                  />
                  <Recharts.Line
                    type="monotone"
                    dataKey="orderCount"
                    name={t('salesman360.analyticsCharts.order')}
                    stroke={CHART_COLORS[2]}
                    strokeWidth={3}
                  />
                </Recharts.LineChart>
              </Recharts.ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {isSingleCurrency ? (
        <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 p-1 shadow-sm dark:border-white/10 dark:bg-white/3 lg:col-span-3">
          <CardHeader className="px-5 pb-2 pt-4">
            <CardTitle className="text-base font-bold text-slate-800 dark:text-white">
              {t('salesman360.analyticsCharts.amountComparisonTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {!hasSingleBarData ? (
              <EmptyChart icon={Target} label={t(noDataKey)} />
            ) : !Recharts ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : (
              <div className="h-64">
                <Recharts.ResponsiveContainer width="100%" height="100%">
                  <Recharts.BarChart
                    data={singleBarData}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 100, bottom: 5 }}
                  >
                    <Recharts.CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      className="stroke-slate-100 dark:stroke-white/5"
                    />
                    <Recharts.XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => currencyFormatter.format(value)}
                    />
                    <Recharts.YAxis type="category" dataKey="name" axisLine={false} tickLine={false} />
                    <Recharts.Tooltip
                      cursor={{ fill: 'transparent' }}
                      formatter={(value) => [
                        currencyFormatter.format(Number(Array.isArray(value) ? (value[0] ?? 0) : (value ?? 0))),
                        '',
                      ]}
                    />
                    <Recharts.Bar
                      dataKey="value"
                      fill={CHART_COLORS[0]}
                      radius={[0, 10, 10, 0]}
                      barSize={32}
                    >
                      {singleBarData.map((_, index) => (
                        <Recharts.Cell
                          key={index}
                          fill={
                            index === 0 ? '#ec4899' : index === 1 ? '#f59e0b' : '#8b5cf6'
                          }
                        />
                      ))}
                    </Recharts.Bar>
                  </Recharts.BarChart>
                </Recharts.ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function EmptyChart({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}): ReactElement {
  return (
    <div className="flex flex-col items-center gap-2 py-20 text-slate-400">
      <Icon className="size-10 opacity-10" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
