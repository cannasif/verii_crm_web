import { type ReactElement } from 'react';
import { Activity, BadgeCheck, ChartNoAxesCombined, CheckCircle2, RefreshCw, ScanLine, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRechartsModule } from '@/lib/useRechartsModule';
import { cn } from '@/lib/utils';
import type { Salesmen360PerformanceDto, Salesmen360PeriodParams } from '../types/salesmen360.types';
import { formatSalesmen360PeriodLabel } from '../utils/localizedDisplay';
import { PerformanceChartFrame } from './performance/PerformanceChartFrame';
import { PerformanceKpiOverview } from './performance/PerformanceKpiOverview';
import { SalesPerformanceDetailPanels } from './performance/SalesPerformanceDetailPanels';
import { TeamSalesValuePanel } from './performance/TeamSalesValuePanel';
import { SalesmenPerformancePivotReport } from './performance/SalesmenPerformancePivotReport';
import type { Salesmen360TabKey } from './navigation/SalesmenReportTabs';

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

export function SalesmenPerformanceDashboard({
  userId,
  userIds,
  data,
  isLoading,
  isError,
  onRetry,
  locale,
  currency,
  periodParams,
  section,
}: {
  userId: number;
  userIds?: number[];
  data?: Salesmen360PerformanceDto;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  locale: string;
  currency?: string;
  periodParams?: Salesmen360PeriodParams;
  section: Salesmen360TabKey;
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
    (item) => item.quotationCount > 0 || item.orderCount > 0 || item.erpOrderCount > 0 || item.activityCount > 0 || item.customerCount > 0,
  );
  const activityHasData = activityTypeData.some((item) => item.count > 0);
  const orderHasData = orderStatusData.some((item) => item.count > 0);
  const sectionTitle = t(`salesman360.reportSections.${section}.title`, {
    defaultValue: {
      overview: 'Genel performans özeti',
      sales: 'Satış performansı',
      demand: 'Talep performansı',
      quotation: 'Teklif performansı',
      order: 'Sipariş performansı',
      activity: 'Aktivite performansı',
      customer: 'Cari analizi',
      stock: 'Stok analizi',
      movement: 'Dönem içi satış hareketleri',
    }[section],
  });
  const sectionDescription = t(`salesman360.reportSections.${section}.description`, {
    defaultValue: {
      overview: 'Seçili dönemin temel sonuçları ve gelişim eğilimi.',
      sales: 'Satışçı, dönüşüm ve ERP değerlerinin karşılaştırmalı görünümü.',
      demand: 'Taleplerin durumu, dönüşümü ve işlem detayları.',
      quotation: 'Teklif durumları, siparişe ve ERP kaydına dönüşüm detayları.',
      order: 'Sipariş durumları, onay süreci ve ERP aktarım sonuçları.',
      activity: 'Aktivite türleri, tamamlanma ve gecikme performansı.',
      customer: 'Cari bazında talep, teklif, sipariş ve ERP değerleri.',
      stock: 'Stok bazında belge, miktar ve tutar kırılımları.',
      movement: 'Cari ve stok alanları sürüklenerek düzenlenebilen hareket pivotu.',
    }[section],
  });

  return (
    <section className="space-y-5" aria-labelledby="sales-performance-title">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ChartNoAxesCombined className="size-5" />
            </span>
            <h2 id="sales-performance-title" className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
              {sectionTitle}
            </h2>
          </div>
          <p className="mt-1 pl-11 text-sm font-medium text-slate-500 dark:text-slate-400">
            {sectionDescription}
          </p>
        </div>
        {data.currency ? (
          <span className="w-fit rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-xs font-bold text-primary">
            {data.currency}
          </span>
        ) : null}
      </div>

      {section === 'overview' ? <PerformanceKpiOverview totals={totals} locale={locale} trend={data.trend} /> : null}

      {section === 'overview' || section === 'sales' || section === 'order' ? (
      <div className="grid gap-5 xl:grid-cols-5">
        {section === 'order' ? (
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
                  <Recharts.BarChart
                    width={width}
                    height={height}
                    data={orderStatusData}
                    layout="vertical"
                    margin={{ top: 6, right: 16, left: 34, bottom: 0 }}
                  >
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
        ) : null}

        {section === 'overview' || section === 'sales' ? (
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
                    <Recharts.Line
                      type="monotone"
                      dataKey="quotationCount"
                      name={t('salesman360.performance.pipeline.quotations')}
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Recharts.Line
                      type="monotone"
                      dataKey="orderCount"
                      name={t('salesman360.performance.pipeline.orders')}
                      stroke="#ec4899"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Recharts.Line
                      type="monotone"
                      dataKey="erpOrderCount"
                      name={t('salesman360.performance.pipeline.erp')}
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Recharts.Line
                      type="monotone"
                      dataKey="activityCount"
                      name={t('salesman360.performance.kpi.activities')}
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Recharts.Line
                      type="monotone"
                      dataKey="customerCount"
                      name={t('salesman360.performance.kpi.customers')}
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </Recharts.LineChart>
                )}
              </PerformanceChartFrame>
            )}
          </CardContent>
        </Card>
        ) : null}
      </div>
      ) : null}

      {section === 'activity' || section === 'sales' ? (
      <div className={cn('grid gap-5', data.isTeamView ? 'xl:grid-cols-5' : 'xl:grid-cols-1')}>
        {section === 'activity' ? (
        <Card
          className={cn(
            'rounded-2xl border-slate-200/90 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/3',
            data.isTeamView ? 'xl:col-span-2' : '',
          )}
        >
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
                  <Recharts.BarChart
                    width={width}
                    height={height}
                    data={activityTypeData}
                    layout="vertical"
                    margin={{ top: 6, right: 16, left: 44, bottom: 0 }}
                  >
                    <Recharts.CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-slate-100 dark:stroke-white/5" />
                    <Recharts.XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
                    <Recharts.YAxis
                      type="category"
                      dataKey="activityTypeName"
                      width={115}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <Recharts.Tooltip cursor={{ fill: 'transparent' }} />
                    <Recharts.Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                    <Recharts.Bar
                      dataKey="count"
                      name={t('salesman360.performance.activityTotal')}
                      fill="#0ea5e9"
                      radius={[0, 7, 7, 0]}
                      barSize={22}
                    />
                    <Recharts.Bar
                      dataKey="completedCount"
                      name={t('salesman360.performance.activityCompleted')}
                      fill="#10b981"
                      radius={[0, 7, 7, 0]}
                      barSize={22}
                    />
                  </Recharts.BarChart>
                )}
              </PerformanceChartFrame>
            )}
          </CardContent>
        </Card>
        ) : null}

        {section === 'sales' && data.isTeamView ? (
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
                    <Recharts.BarChart
                      width={width}
                      height={height}
                      data={teamChartData}
                      margin={{ top: 6, right: 8, left: -20, bottom: 38 }}
                    >
                      <Recharts.CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-white/5" />
                      <Recharts.XAxis
                        dataKey="fullName"
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        angle={-28}
                        textAnchor="end"
                        height={58}
                        tick={{ fontSize: 10 }}
                      />
                      <Recharts.YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                      <Recharts.Tooltip />
                      <Recharts.Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                      <Recharts.Bar
                        dataKey="totalQuotations"
                        name={t('salesman360.performance.kpi.quotations')}
                        fill="#6366f1"
                        radius={[6, 6, 0, 0]}
                      />
                      <Recharts.Bar
                        dataKey="totalOrders"
                        name={t('salesman360.performance.kpi.orders')}
                        fill="#ec4899"
                        radius={[6, 6, 0, 0]}
                      />
                      <Recharts.Bar
                        dataKey="erpIntegratedOrders"
                        name={t('salesman360.performance.kpi.erpOrders')}
                        fill="#10b981"
                        radius={[6, 6, 0, 0]}
                      />
                      <Recharts.Bar
                        dataKey="totalActivities"
                        name={t('salesman360.performance.kpi.activities')}
                        fill="#0ea5e9"
                        radius={[6, 6, 0, 0]}
                      />
                    </Recharts.BarChart>
                  )}
                </PerformanceChartFrame>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
      ) : null}

      {section === 'sales' && data.isTeamView ? <TeamSalesValuePanel salesmen={data.salesmen} locale={locale} /> : null}

      {(['sales', 'demand', 'quotation', 'order', 'activity', 'customer', 'stock', 'movement'] as const).includes(
        section as 'sales' | 'demand' | 'quotation' | 'order' | 'activity' | 'customer' | 'stock' | 'movement',
      ) ? (
        <SalesmenPerformancePivotReport
          data={data}
          locale={locale}
          report={section as 'sales' | 'demand' | 'quotation' | 'order' | 'activity' | 'customer' | 'stock' | 'movement'}
        />
      ) : null}

      {section === 'sales' || section === 'activity' || section === 'customer' ? (
        <SalesPerformanceDetailPanels
          userId={userId}
          userIds={userIds}
          data={data}
          locale={locale}
          currency={currency}
          periodParams={periodParams}
          section={section === 'sales' ? 'flow' : section}
        />
      ) : null}

      {section === 'sales' && data.isTeamView ? (
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
                      <TableCell className="text-right font-semibold tabular-nums">
                        %{formatRate(row.quotationConversionRate, locale)}
                      </TableCell>
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
      ) : section === 'overview' && !data.isTeamView ? (
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
      ) : null}

    </section>
  );
}
