import { type ReactElement } from 'react';
import {
  Activity,
  BadgeCheck,
  ChartNoAxesCombined,
  CheckCircle2,
  CircleDashed,
  ContactRound,
  FileCheck2,
  FileText,
  RefreshCw,
  ScanLine,
  ShoppingCart,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRechartsModule } from '@/lib/useRechartsModule';
import { cn } from '@/lib/utils';
import type {
  Salesmen360PerformanceDto,
  Salesmen360PerformanceTotalsDto,
  Salesmen360PeriodParams,
} from '../types/salesmen360.types';
import { formatSalesmen360PeriodLabel } from '../utils/localizedDisplay';
import { PerformanceChartFrame } from './performance/PerformanceChartFrame';
import { SalesPerformanceDetailPanels } from './performance/SalesPerformanceDetailPanels';

const STATUS_COLORS: Record<string, string> = {
  draft: '#94a3b8',
  pendingApproval: '#f59e0b',
  approved: '#10b981',
  rejectedOrClosed: '#ef4444',
};

function formatRate(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value ?? 0);
}

function KpiCard({
  title,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number;
  detail: string;
  icon: typeof ShoppingCart;
  tone: 'pink' | 'amber' | 'emerald' | 'indigo' | 'sky' | 'violet';
}): ReactElement {
  const tones = {
    pink: 'border-pink-200/80 bg-pink-50 text-pink-600 dark:border-pink-400/20 dark:bg-pink-500/10 dark:text-pink-300',
    amber: 'border-amber-200/80 bg-amber-50 text-amber-600 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300',
    emerald: 'border-emerald-200/80 bg-emerald-50 text-emerald-600 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300',
    indigo: 'border-indigo-200/80 bg-indigo-50 text-indigo-600 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-300',
    sky: 'border-sky-200/80 bg-sky-50 text-sky-600 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-300',
    violet: 'border-violet-200/80 bg-violet-50 text-violet-600 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300',
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-slate-200/90 bg-white/90 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.17em] text-slate-500 dark:text-slate-400">
              {title}
            </p>
            <p className="mt-2 text-3xl font-black tabular-nums text-slate-950 dark:text-white">{value}</p>
          </div>
          <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl border', tones[tone])}>
            <Icon className="size-5" aria-hidden />
          </div>
        </div>
        <p className="mt-3 min-h-8 text-xs font-semibold leading-4 text-slate-500 dark:text-slate-400">{detail}</p>
      </CardContent>
    </Card>
  );
}

function ConversionRail({
  totals,
  locale,
}: {
  totals: Salesmen360PerformanceTotalsDto;
  locale: string;
}): ReactElement {
  const { t } = useTranslation();
  const items = [
    {
      label: t('salesman360.performance.pipeline.quotations'),
      value: totals.totalQuotations,
      icon: FileText,
      color: 'bg-sky-500',
    },
    {
      label: t('salesman360.performance.pipeline.converted'),
      value: totals.convertedQuotations,
      icon: FileCheck2,
      color: 'bg-indigo-500',
    },
    {
      label: t('salesman360.performance.pipeline.orders'),
      value: totals.totalOrders,
      icon: ShoppingCart,
      color: 'bg-violet-500',
    },
    {
      label: t('salesman360.performance.pipeline.erp'),
      value: totals.erpIntegratedOrders,
      icon: BadgeCheck,
      color: 'bg-emerald-500',
    },
  ];

  return (
    <Card className="rounded-2xl border-slate-200/90 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/3">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ChartNoAxesCombined className="size-5 text-primary" />
          {t('salesman360.performance.pipeline.title')}
        </CardTitle>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {t('salesman360.performance.pipeline.description')}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="relative rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/8 dark:bg-white/3">
                <div className="flex items-center justify-between gap-3">
                  <div className={cn('flex size-9 items-center justify-center rounded-xl text-white shadow-sm', item.color)}>
                    <Icon className="size-4" />
                  </div>
                  {index > 0 ? (
                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500 shadow-sm dark:bg-white/8 dark:text-slate-300">
                      {index === 1
                        ? `%${formatRate(totals.quotationConversionRate, locale)}`
                        : index === 3
                          ? `%${formatRate(totals.erpIntegrationRate, locale)}`
                          : ''}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-2xl font-black tabular-nums text-slate-950 dark:text-white">{item.value}</p>
                <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{item.label}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function SalesmenPerformanceDashboard({
  userId,
  data,
  isLoading,
  isError,
  onRetry,
  locale,
  currency,
  periodParams,
}: {
  userId: number;
  data?: Salesmen360PerformanceDto;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  locale: string;
  currency?: string;
  periodParams?: Salesmen360PeriodParams;
}): ReactElement {
  const { t } = useTranslation();
  const Recharts = useRechartsModule(Boolean(data) && !isLoading && !isError);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-36 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="rounded-2xl border-dashed border-red-200 bg-red-50/40 dark:border-red-500/20 dark:bg-red-500/5">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <RefreshCw className="size-8 text-red-400" />
          <p className="font-semibold text-red-600 dark:text-red-300">{t('salesman360.performance.error')}</p>
          <Button variant="outline" onClick={onRetry} className="rounded-xl">
            {t('salesman360.retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const totals = data.totals;
  const orderStatusData = data.orderStatuses.map((item) => ({
    ...item,
    label: t(`salesman360.performance.status.${item.status}`),
  }));
  const activityTypeData = data.activityTypes.slice(0, 8);
  const teamChartData = data.salesmen.slice(0, 12);
  const trendHasData = data.trend.some(
    (item) =>
      item.quotationCount > 0 ||
      item.orderCount > 0 ||
      item.erpOrderCount > 0 ||
      item.activityCount > 0 ||
      item.customerCount > 0
  );
  const activityHasData = activityTypeData.some((item) => item.count > 0);
  const orderHasData = orderStatusData.some((item) => item.count > 0);

  return (
    <section className="space-y-5" aria-labelledby="sales-performance-title">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ChartNoAxesCombined className="size-5" />
            </span>
            <h2 id="sales-performance-title" className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
              {t('salesman360.performance.title')}
            </h2>
          </div>
          <p className="mt-1 pl-11 text-sm font-medium text-slate-500 dark:text-slate-400">
            {data.isTeamView
              ? t('salesman360.performance.teamDescription', { count: data.salesmanCount })
              : t('salesman360.performance.personalDescription')}
          </p>
        </div>
        {data.currency ? (
          <span className="w-fit rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-xs font-bold text-primary">
            {data.currency}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          title={t('salesman360.performance.kpi.orders')}
          value={totals.totalOrders}
          detail={t('salesman360.performance.kpi.ordersDetail', {
            approved: totals.approvedOrders,
            rejected: totals.rejectedOrClosedOrders,
          })}
          icon={ShoppingCart}
          tone="pink"
        />
        <KpiCard
          title={t('salesman360.performance.kpi.pending')}
          value={totals.pendingApprovalOrders}
          detail={t('salesman360.performance.kpi.pendingDetail', { draft: totals.draftOrders })}
          icon={CircleDashed}
          tone="amber"
        />
        <KpiCard
          title={t('salesman360.performance.kpi.erpOrders')}
          value={totals.erpIntegratedOrders}
          detail={t('salesman360.performance.kpi.erpOrdersDetail', {
            rate: formatRate(totals.erpIntegrationRate, locale),
          })}
          icon={BadgeCheck}
          tone="emerald"
        />
        <KpiCard
          title={t('salesman360.performance.kpi.quotations')}
          value={totals.totalQuotations}
          detail={t('salesman360.performance.kpi.quotationsDetail', {
            converted: totals.convertedQuotations,
            rate: formatRate(totals.quotationConversionRate, locale),
          })}
          icon={FileText}
          tone="indigo"
        />
        <KpiCard
          title={t('salesman360.performance.kpi.activities')}
          value={totals.totalActivities}
          detail={t('salesman360.performance.kpi.activitiesDetail', {
            completed: totals.completedActivities,
            planned: totals.plannedActivities,
          })}
          icon={Activity}
          tone="sky"
        />
        <KpiCard
          title={t('salesman360.performance.kpi.customers')}
          value={totals.totalCustomers}
          detail={t('salesman360.performance.kpi.customersDetail', {
            erp: totals.erpIntegratedCustomers,
            card: totals.businessCardCustomers,
          })}
          icon={ContactRound}
          tone="violet"
        />
      </div>

      <ConversionRail totals={totals} locale={locale} />

      <div className="grid gap-5 xl:grid-cols-5">
        <Card className="rounded-2xl border-slate-200/90 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/3 xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('salesman360.performance.orderStatusTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {!orderHasData ? (
              <div className="flex h-64 items-center justify-center text-sm font-medium text-slate-400">{t('common.noData')}</div>
            ) : !Recharts ? (
              <Skeleton className="h-64 rounded-xl" />
            ) : (
              <PerformanceChartFrame>
                {({ width, height }) => (
                  <Recharts.BarChart width={width} height={height} data={orderStatusData} layout="vertical" margin={{ top: 6, right: 16, left: 34, bottom: 0 }}>
                    <Recharts.CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-slate-100 dark:stroke-white/5" />
                    <Recharts.XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
                    <Recharts.YAxis type="category" dataKey="label" width={105} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <Recharts.Tooltip cursor={{ fill: 'transparent' }} />
                    <Recharts.Bar dataKey="count" name={t('salesman360.performance.count')} radius={[0, 8, 8, 0]} barSize={24}>
                      {orderStatusData.map((item) => (
                        <Recharts.Cell key={item.status} fill={STATUS_COLORS[item.status] ?? '#64748b'} />
                      ))}
                    </Recharts.Bar>
                  </Recharts.BarChart>
                )}
              </PerformanceChartFrame>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/90 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/3 xl:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('salesman360.performance.trendTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {!trendHasData ? (
              <div className="flex h-64 items-center justify-center text-sm font-medium text-slate-400">{t('common.noData')}</div>
            ) : !Recharts ? (
              <Skeleton className="h-64 rounded-xl" />
            ) : (
              <PerformanceChartFrame>
                {({ width, height }) => (
                  <Recharts.LineChart width={width} height={height} data={data.trend} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
                    <Recharts.CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-white/5" />
                    <Recharts.XAxis
                      dataKey="periodKey"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => formatSalesmen360PeriodLabel(String(value), locale)}
                    />
                    <Recharts.YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                    <Recharts.Tooltip labelFormatter={(value) => formatSalesmen360PeriodLabel(String(value), locale)} />
                    <Recharts.Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                    <Recharts.Line type="monotone" dataKey="quotationCount" name={t('salesman360.performance.pipeline.quotations')} stroke="#6366f1" strokeWidth={2.5} dot={false} />
                    <Recharts.Line type="monotone" dataKey="orderCount" name={t('salesman360.performance.pipeline.orders')} stroke="#ec4899" strokeWidth={2.5} dot={false} />
                    <Recharts.Line type="monotone" dataKey="erpOrderCount" name={t('salesman360.performance.pipeline.erp')} stroke="#10b981" strokeWidth={2.5} dot={false} />
                    <Recharts.Line type="monotone" dataKey="activityCount" name={t('salesman360.performance.kpi.activities')} stroke="#0ea5e9" strokeWidth={2} dot={false} />
                    <Recharts.Line type="monotone" dataKey="customerCount" name={t('salesman360.performance.kpi.customers')} stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  </Recharts.LineChart>
                )}
              </PerformanceChartFrame>
            )}
          </CardContent>
        </Card>
      </div>

      <div className={cn('grid gap-5', data.isTeamView ? 'xl:grid-cols-5' : 'xl:grid-cols-1')}>
        <Card className={cn('rounded-2xl border-slate-200/90 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/3', data.isTeamView ? 'xl:col-span-2' : '')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-5 text-sky-500" />
              {t('salesman360.performance.activityTypesTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!activityHasData ? (
              <div className="flex h-64 items-center justify-center text-sm font-medium text-slate-400">{t('common.noData')}</div>
            ) : !Recharts ? (
              <Skeleton className="h-64 rounded-xl" />
            ) : (
              <PerformanceChartFrame>
                {({ width, height }) => (
                  <Recharts.BarChart width={width} height={height} data={activityTypeData} layout="vertical" margin={{ top: 6, right: 16, left: 44, bottom: 0 }}>
                    <Recharts.CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-slate-100 dark:stroke-white/5" />
                    <Recharts.XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
                    <Recharts.YAxis type="category" dataKey="activityTypeName" width={115} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <Recharts.Tooltip cursor={{ fill: 'transparent' }} />
                    <Recharts.Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                    <Recharts.Bar dataKey="count" name={t('salesman360.performance.activityTotal')} fill="#0ea5e9" radius={[0, 7, 7, 0]} barSize={22} />
                    <Recharts.Bar dataKey="completedCount" name={t('salesman360.performance.activityCompleted')} fill="#10b981" radius={[0, 7, 7, 0]} barSize={22} />
                  </Recharts.BarChart>
                )}
              </PerformanceChartFrame>
            )}
          </CardContent>
        </Card>

        {data.isTeamView ? (
          <Card className="rounded-2xl border-slate-200/90 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/3 xl:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-5 text-violet-500" />
                {t('salesman360.performance.teamComparisonTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!Recharts ? (
                <Skeleton className="h-64 rounded-xl" />
              ) : (
                <PerformanceChartFrame>
                  {({ width, height }) => (
                    <Recharts.BarChart width={width} height={height} data={teamChartData} margin={{ top: 6, right: 8, left: -20, bottom: 38 }}>
                      <Recharts.CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-white/5" />
                      <Recharts.XAxis dataKey="fullName" axisLine={false} tickLine={false} interval={0} angle={-28} textAnchor="end" height={58} tick={{ fontSize: 10 }} />
                      <Recharts.YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                      <Recharts.Tooltip />
                      <Recharts.Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                      <Recharts.Bar dataKey="totalOrders" name={t('salesman360.performance.kpi.orders')} fill="#ec4899" radius={[6, 6, 0, 0]} />
                      <Recharts.Bar dataKey="erpIntegratedOrders" name={t('salesman360.performance.kpi.erpOrders')} fill="#10b981" radius={[6, 6, 0, 0]} />
                      <Recharts.Bar dataKey="totalActivities" name={t('salesman360.performance.kpi.activities')} fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                    </Recharts.BarChart>
                  )}
                </PerformanceChartFrame>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      {data.isTeamView ? (
        <Card className="overflow-hidden rounded-2xl border-slate-200/90 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('salesman360.performance.leaderboardTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 dark:bg-white/3">
                    <TableHead>{t('salesman360.performance.salesman')}</TableHead>
                    <TableHead className="text-right">{t('salesman360.performance.detail.document.demand')}</TableHead>
                    <TableHead className="text-right">{t('salesman360.performance.kpi.quotations')}</TableHead>
                    <TableHead className="text-right">{t('salesman360.performance.conversion')}</TableHead>
                    <TableHead className="text-right">{t('salesman360.performance.kpi.orders')}</TableHead>
                    <TableHead className="text-right">{t('salesman360.performance.kpi.erpOrders')}</TableHead>
                    <TableHead className="text-right">{t('salesman360.performance.kpi.activities')}</TableHead>
                    <TableHead className="text-right">{t('salesman360.performance.detail.activity.overdue')}</TableHead>
                    <TableHead className="text-right">{t('salesman360.performance.kpi.customers')}</TableHead>
                    <TableHead className="text-right">{t('salesman360.performance.businessCard')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.salesmen.map((row, index) => (
                    <TableRow key={row.userId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-black text-primary">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{row.fullName || row.email || row.userId}</p>
                            {row.email ? <p className="text-[11px] text-slate-400">{row.email}</p> : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{row.totalDemands}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{row.totalQuotations}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">%{formatRate(row.quotationConversionRate, locale)}</TableCell>
                      <TableCell className="text-right font-bold tabular-nums">{row.totalOrders}</TableCell>
                      <TableCell className="text-right font-bold tabular-nums text-emerald-600">{row.erpIntegratedOrders}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{row.totalActivities}</TableCell>
                      <TableCell className="text-right font-bold tabular-nums text-amber-600">{row.overdueActivities}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{row.totalCustomers}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        <span className="inline-flex items-center justify-end gap-1">
                          <ScanLine className="size-3.5 text-violet-500" />
                          {row.businessCardCustomers}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4 dark:border-emerald-400/15 dark:bg-emerald-500/8">
            <CheckCircle2 className="size-6 text-emerald-500" />
            <div>
              <p className="text-2xl font-black">{totals.completedActivities}</p>
              <p className="text-xs font-bold text-slate-500">{t('salesman360.performance.completedActivities')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-indigo-200/70 bg-indigo-50/70 p-4 dark:border-indigo-400/15 dark:bg-indigo-500/8">
            <BadgeCheck className="size-6 text-indigo-500" />
            <div>
              <p className="text-2xl font-black">{totals.erpIntegratedCustomers}</p>
              <p className="text-xs font-bold text-slate-500">{t('salesman360.performance.erpCustomers')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-violet-200/70 bg-violet-50/70 p-4 dark:border-violet-400/15 dark:bg-violet-500/8">
            <ScanLine className="size-6 text-violet-500" />
            <div>
              <p className="text-2xl font-black">{totals.businessCardCustomers}</p>
              <p className="text-xs font-bold text-slate-500">{t('salesman360.performance.businessCardCustomers')}</p>
            </div>
          </div>
        </div>
      )}

      <SalesPerformanceDetailPanels
        userId={userId}
        data={data}
        locale={locale}
        currency={currency}
        periodParams={periodParams}
      />
    </section>
  );
}
