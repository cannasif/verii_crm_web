import { type ReactElement, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ContactRound,
  FileCheck2,
  FileText,
  ListChecks,
  ScanLine,
  ShoppingCart,
  Target,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRechartsModule } from '@/lib/useRechartsModule';
import { cn } from '@/lib/utils';
import type { Salesmen360PerformanceDto, Salesmen360PeriodParams } from '../../types/salesmen360.types';
import { PerformanceAttentionTable } from './PerformanceAttentionTable';
import { PerformanceChartFrame } from './PerformanceChartFrame';
import { formatPerformanceAmount } from './performanceFormatters';
import { SalesWorkFeedTab } from './tabs/SalesWorkFeedTab';

const STATUS_SERIES = [
  { key: 'draft', color: '#94a3b8' },
  { key: 'waiting', color: '#f59e0b' },
  { key: 'approved', color: '#10b981' },
  { key: 'rejected', color: '#ef4444' },
  { key: 'closed', color: '#64748b' },
  { key: 'customerCancelled', color: '#f97316' },
  { key: 'revision', color: '#8b5cf6' },
] as const;

function formatRate(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value ?? 0);
}

function InsightTile({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'slate',
}: {
  label: string;
  value: string | number;
  helper?: string;
  icon: typeof Target;
  tone?: 'slate' | 'amber' | 'emerald' | 'pink' | 'sky' | 'violet';
}): ReactElement {
  const tones = {
    slate: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/4 dark:text-slate-300',
    amber: 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300',
    pink: 'border-pink-200 bg-pink-50 text-pink-600 dark:border-pink-400/20 dark:bg-pink-500/10 dark:text-pink-300',
    sky: 'border-sky-200 bg-sky-50 text-sky-600 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-300',
    violet: 'border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300',
  };

  return (
    <div className={cn('rounded-2xl border p-4', tones[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.15em] opacity-75">{label}</p>
          <p className="mt-2 text-2xl font-black tabular-nums text-slate-950 dark:text-white">{value}</p>
        </div>
        <Icon className="size-5 shrink-0" aria-hidden />
      </div>
      {helper ? <p className="mt-2 text-[11px] font-semibold leading-4 opacity-75">{helper}</p> : null}
    </div>
  );
}

function RateRow({ label, value, countLabel, tone }: { label: string; value: number; countLabel: string; tone: string }): ReactElement {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-xs font-bold">
        <span className="text-slate-600 dark:text-slate-300">{label}</span>
        <span className="tabular-nums text-slate-900 dark:text-white">{countLabel}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/8">
        <div className={cn('h-full rounded-full transition-[width]', tone)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

export function SalesPerformanceDetailPanels({
  userId,
  userIds,
  data,
  locale,
  currency,
  periodParams,
}: {
  userId: number;
  userIds?: number[];
  data: Salesmen360PerformanceDto;
  locale: string;
  currency?: string;
  periodParams?: Salesmen360PeriodParams;
}): ReactElement {
  const { t } = useTranslation();
  const Recharts = useRechartsModule(true);
  const [activeDetailTab, setActiveDetailTab] = useState('flow');

  const statusChartData = data.documentStatuses.map((item) => ({
    ...item,
    documentLabel: t(`salesman360.performance.detail.document.${item.documentType}`),
  }));

  const funnelStages = [
    {
      key: 'demand',
      total: data.funnel.totalDemands,
      converted: data.funnel.convertedDemands,
      rate: data.funnel.demandToQuotationRate,
      icon: FileText,
      tone: 'bg-sky-500',
    },
    {
      key: 'quotation',
      total: data.funnel.totalQuotations,
      converted: data.funnel.convertedQuotations,
      rate: data.funnel.quotationToOrderRate,
      icon: FileCheck2,
      tone: 'bg-indigo-500',
    },
    {
      key: 'order',
      total: data.funnel.totalOrders,
      converted: data.funnel.erpIntegratedOrders,
      rate: data.funnel.orderToErpRate,
      icon: ShoppingCart,
      tone: 'bg-pink-500',
    },
    {
      key: 'erp',
      total: data.funnel.erpIntegratedOrders,
      converted: data.funnel.erpIntegratedOrders,
      rate: data.funnel.orderToErpRate,
      icon: BadgeCheck,
      tone: 'bg-emerald-500',
    },
  ];

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden rounded-2xl border-amber-200/80 bg-linear-to-r from-amber-50/80 via-white to-rose-50/60 shadow-sm dark:border-amber-400/15 dark:from-amber-500/8 dark:via-white/3 dark:to-rose-500/5">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/20">
                <AlertTriangle className="size-5" />
              </span>
              <div>
                <p className="font-black text-slate-950 dark:text-white">{t('salesman360.performance.detail.attention.title')}</p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t('salesman360.performance.detail.attention.description')}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-amber-500 px-3 py-1 text-sm font-black text-white">{data.attention.total}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InsightTile
              label={t('salesman360.performance.detail.attention.overdue')}
              value={data.attention.overdueActivities}
              icon={Clock3}
              tone="amber"
            />
            <InsightTile
              label={t('salesman360.performance.detail.attention.expired')}
              value={data.attention.expiredOpenQuotations}
              icon={FileText}
              tone="pink"
            />
            <InsightTile
              label={t('salesman360.performance.detail.attention.pending')}
              value={data.attention.stalePendingOrders}
              icon={CalendarClock}
              tone="violet"
            />
            <InsightTile
              label={t('salesman360.performance.detail.attention.unengaged')}
              value={data.attention.customersWithoutActivity}
              icon={ContactRound}
              tone="sky"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeDetailTab} onValueChange={setActiveDetailTab} className="space-y-5">
        <div className="overflow-x-auto pb-1">
          <TabsList className="h-auto min-w-max rounded-2xl border border-slate-200 bg-slate-100/80 p-1 dark:border-white/10 dark:bg-white/5">
            <TabsTrigger value="flow" className="rounded-xl px-4 py-2.5 font-bold">
              <TrendingUp className="mr-2 size-4" />
              {t('salesman360.performance.detail.tabs.flow')}
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-xl px-4 py-2.5 font-bold">
              <ListChecks className="mr-2 size-4" />
              {t('salesman360.performance.detail.tabs.activity')}
            </TabsTrigger>
            <TabsTrigger value="customer" className="rounded-xl px-4 py-2.5 font-bold">
              <ContactRound className="mr-2 size-4" />
              {t('salesman360.performance.detail.tabs.customer')}
            </TabsTrigger>
            <TabsTrigger value="work" className="rounded-xl px-4 py-2.5 font-bold">
              <Users className="mr-2 size-4" />
              {t('salesman360.performance.detail.tabs.work')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="flow" className="space-y-5 outline-none">
          <Card className="rounded-2xl border-slate-200/90 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/3">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('salesman360.performance.detail.flow.title')}</CardTitle>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t('salesman360.performance.detail.flow.description')}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 lg:grid-cols-4">
                {funnelStages.map((stage, index) => {
                  const Icon = stage.icon;
                  return (
                    <div
                      key={stage.key}
                      className="relative rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-white/8 dark:bg-white/3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className={cn('flex size-9 items-center justify-center rounded-xl text-white', stage.tone)}>
                          <Icon className="size-4" />
                        </span>
                        {index < funnelStages.length - 1 ? <ArrowRight className="size-4 text-slate-300" /> : null}
                      </div>
                      <p className="mt-3 text-2xl font-black tabular-nums">{stage.total}</p>
                      <p className="text-xs font-bold text-slate-500">{t(`salesman360.performance.detail.document.${stage.key}`)}</p>
                      {index < funnelStages.length - 1 ? (
                        <p className="mt-2 text-[11px] font-black text-primary">
                          %{formatRate(stage.rate, locale)} · {stage.converted} {t('salesman360.performance.detail.flow.converted')}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 xl:grid-cols-5">
            <Card className="rounded-2xl border-slate-200/90 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/3 xl:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('salesman360.performance.detail.statusMatrix.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                {!Recharts ? (
                  <Skeleton className="h-72 rounded-xl" />
                ) : (
                  <PerformanceChartFrame heightClassName="h-72">
                    {({ width, height }) => (
                      <Recharts.BarChart
                        width={width}
                        height={height}
                        data={statusChartData}
                        margin={{ top: 12, right: 10, left: -10, bottom: 0 }}
                      >
                        <Recharts.CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-white/5" />
                        <Recharts.XAxis dataKey="documentLabel" axisLine={false} tickLine={false} />
                        <Recharts.YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                        <Recharts.Tooltip cursor={{ fill: 'transparent' }} />
                        <Recharts.Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 600 }} />
                        {STATUS_SERIES.map((series) => (
                          <Recharts.Bar
                            key={series.key}
                            dataKey={series.key}
                            stackId="status"
                            name={t(`salesman360.performance.detail.status.${series.key}`)}
                            fill={series.color}
                          />
                        ))}
                      </Recharts.BarChart>
                    )}
                  </PerformanceChartFrame>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200/90 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/3 xl:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CircleDollarSign className="size-5 text-emerald-500" />
                  {t('salesman360.performance.detail.financial.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.financialsByCurrency.length === 0 ? (
                  <div className="flex h-64 items-center justify-center text-sm font-medium text-slate-400">{t('common.noData')}</div>
                ) : (
                  data.financialsByCurrency.map((row) => (
                    <div key={row.currency} className="rounded-2xl border border-slate-200/80 p-4 dark:border-white/8">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                          {row.currency}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {t('salesman360.performance.detail.financial.averageOrder')}
                        </span>
                      </div>
                      <p className="mb-4 text-lg font-black">{formatPerformanceAmount(row.averageOrderAmount, row.currency, locale)}</p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-slate-400">{t('salesman360.performance.detail.document.demand')}</p>
                          <p className="font-bold">{formatPerformanceAmount(row.demandAmount, row.currency, locale)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">{t('salesman360.performance.detail.document.quotation')}</p>
                          <p className="font-bold">{formatPerformanceAmount(row.quotationAmount, row.currency, locale)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">{t('salesman360.performance.detail.document.order')}</p>
                          <p className="font-bold">{formatPerformanceAmount(row.orderAmount, row.currency, locale)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">{t('salesman360.performance.detail.document.erp')}</p>
                          <p className="font-bold text-emerald-600">{formatPerformanceAmount(row.erpOrderAmount, row.currency, locale)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-5 outline-none">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <InsightTile
              label={t('salesman360.performance.detail.activity.completion')}
              value={`%${formatRate(data.activityInsights.completionRate, locale)}`}
              icon={CheckCircle2}
              tone="emerald"
            />
            <InsightTile
              label={t('salesman360.performance.detail.activity.overdue')}
              value={data.activityInsights.overdue}
              icon={Clock3}
              tone="amber"
            />
            <InsightTile
              label={t('salesman360.performance.detail.activity.nextSevenDays')}
              value={data.activityInsights.dueNextSevenDays}
              icon={CalendarClock}
              tone="sky"
            />
            <InsightTile
              label={t('salesman360.performance.detail.activity.highPriority')}
              value={data.activityInsights.highPriorityOpen}
              icon={AlertTriangle}
              tone="pink"
            />
            <InsightTile
              label={t('salesman360.performance.detail.activity.customerLinked')}
              value={`%${formatRate(data.activityInsights.customerLinkRate, locale)}`}
              icon={ContactRound}
              tone="violet"
            />
            <InsightTile
              label={t('salesman360.performance.detail.activity.averageDuration')}
              value={`${formatRate(data.activityInsights.averageCompletedDurationMinutes, locale)} dk`}
              icon={Clock3}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-5">
            <Card className="rounded-2xl border-slate-200/90 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/3 xl:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('salesman360.performance.detail.activity.quality')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <RateRow
                  label={t('salesman360.performance.detail.activity.completion')}
                  value={data.activityInsights.completionRate}
                  countLabel={`${data.activityInsights.completed}/${data.activityInsights.total}`}
                  tone="bg-emerald-500"
                />
                <RateRow
                  label={t('salesman360.performance.detail.activity.customerLinked')}
                  value={data.activityInsights.customerLinkRate}
                  countLabel={`${data.activityInsights.customerLinked}/${data.activityInsights.total}`}
                  tone="bg-violet-500"
                />
                {data.activityTypes.map((item) => (
                  <RateRow
                    key={item.activityTypeId}
                    label={item.activityTypeName}
                    value={item.count === 0 ? 0 : (item.completedCount * 100) / item.count}
                    countLabel={`${item.completedCount}/${item.count}`}
                    tone="bg-sky-500"
                  />
                ))}
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-200/90 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/3 xl:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('salesman360.performance.detail.attention.activityTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <PerformanceAttentionTable items={data.attentionItems.filter((item) => item.kind === 'overdueActivity')} locale={locale} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customer" className="space-y-5 outline-none">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InsightTile
              label={t('salesman360.performance.detail.customer.erpRate')}
              value={`%${formatRate(data.customerInsights.erpIntegrationRate, locale)}`}
              helper={`${data.customerInsights.erpIntegrated}/${data.customerInsights.total}`}
              icon={BadgeCheck}
              tone="emerald"
            />
            <InsightTile
              label={t('salesman360.performance.detail.customer.engagementRate')}
              value={`%${formatRate(data.customerInsights.engagementRate, locale)}`}
              helper={`${data.customerInsights.withActivity}/${data.customerInsights.total}`}
              icon={TrendingUp}
              tone="sky"
            />
            <InsightTile
              label={t('salesman360.performance.detail.customer.contactInfo')}
              value={data.customerInsights.withContactInfo}
              helper={`${data.customerInsights.total} ${t('salesman360.performance.detail.customer.total')}`}
              icon={UserRound}
              tone="violet"
            />
            <InsightTile
              label={t('salesman360.performance.detail.customer.businessCard')}
              value={data.customerInsights.businessCard}
              icon={ScanLine}
              tone="pink"
            />
          </div>

          <Card className="rounded-2xl border-slate-200/90 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/3">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('salesman360.performance.detail.customer.journey')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 lg:grid-cols-5">
                {[
                  ['total', data.customerInsights.total, ContactRound, 'bg-slate-500'],
                  ['activity', data.customerInsights.withActivity, ListChecks, 'bg-sky-500'],
                  ['quotation', data.customerInsights.withQuotation, FileCheck2, 'bg-indigo-500'],
                  ['order', data.customerInsights.withOrder, ShoppingCart, 'bg-pink-500'],
                  ['erp', data.customerInsights.erpIntegrated, BadgeCheck, 'bg-emerald-500'],
                ].map(([key, count, Icon, tone], index) => {
                  const JourneyIcon = Icon as typeof ContactRound;
                  return (
                    <div key={String(key)} className="relative rounded-2xl border border-slate-200/80 p-4 dark:border-white/8">
                      <div className="flex items-center justify-between">
                        <span className={cn('flex size-9 items-center justify-center rounded-xl text-white', String(tone))}>
                          <JourneyIcon className="size-4" />
                        </span>
                        {index < 4 ? <ArrowRight className="size-4 text-slate-300" /> : null}
                      </div>
                      <p className="mt-3 text-2xl font-black tabular-nums">{Number(count)}</p>
                      <p className="text-xs font-bold text-slate-500">
                        {t(`salesman360.performance.detail.customer.stage.${String(key)}`)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {data.isTeamView ? (
            <Card className="rounded-2xl border-slate-200/90 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/3">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('salesman360.performance.detail.customer.teamTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 dark:bg-white/3">
                        <TableHead>{t('salesman360.performance.salesman')}</TableHead>
                        <TableHead className="text-right">{t('salesman360.performance.detail.customer.total')}</TableHead>
                        <TableHead className="text-right">{t('salesman360.performance.erpCustomers')}</TableHead>
                        <TableHead className="text-right">{t('salesman360.performance.detail.customer.businessCard')}</TableHead>
                        <TableHead className="text-right">{t('salesman360.performance.detail.customer.engagementRate')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.salesmen.map((row) => (
                        <TableRow key={row.userId}>
                          <TableCell className="font-bold">{row.fullName || row.email || row.userId}</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">{row.totalCustomers}</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">{row.erpIntegratedCustomers}</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">{row.businessCardCustomers}</TableCell>
                          <TableCell className="text-right font-black tabular-nums text-sky-600">
                            %{formatRate(row.customerEngagementRate, locale)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <SalesWorkFeedTab
          userId={userId}
          userIds={userIds}
          locale={locale}
          currency={currency}
          periodParams={periodParams}
          attentionItems={data.attentionItems}
          enabled={activeDetailTab === 'work'}
        />
      </Tabs>
    </div>
  );
}
