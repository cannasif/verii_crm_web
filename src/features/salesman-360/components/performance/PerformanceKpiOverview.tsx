import { type ReactElement, useMemo } from 'react';
import {
  Activity,
  BadgeCheck,
  ChartNoAxesCombined,
  CircleDashed,
  ContactRound,
  FileCheck2,
  FileText,
  Minus,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type {
  Salesmen360PerformanceTotalsDto,
  Salesmen360PerformanceTrendItemDto,
} from '../../types/salesmen360.types';
import {
  KPI_TONE_GLOW_CLASSNAME,
  KPI_TONE_ICON_CLASSNAME,
  KPI_TONE_SOLID_CLASSNAME,
  KPI_TONE_VALUE_CLASSNAME,
  type KpiTone,
} from '../../utils/kpiTones';
import { computeTrendDelta, Sparkline } from './Sparkline';

interface PerformanceKpiOverviewProps {
  totals: Salesmen360PerformanceTotalsDto;
  locale: string;
  trend?: Salesmen360PerformanceTrendItemDto[];
}

const TONE_SPARKLINE_CLASSNAME: Record<KpiTone, string> = {
  primary: 'text-primary',
  secondary: 'text-violet-500',
  success: 'text-emerald-500',
  warning: 'text-amber-500',
  neutral: 'text-slate-400 dark:text-slate-500',
};

function formatRate(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value ?? 0);
}

function TrendDeltaBadge({ delta, locale }: { delta: number | null; locale: string }): ReactElement | null {
  if (delta == null || Number.isNaN(delta)) return null;
  const isFlat = Math.abs(delta) < 0.5;
  const Icon = isFlat ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  const toneClassName = isFlat
    ? 'bg-slate-100 text-slate-500 dark:bg-white/8 dark:text-slate-400'
    : delta > 0
      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
      : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400';

  return (
    <span className={cn('inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums', toneClassName)}>
      <Icon className="size-2.5" />
      {isFlat ? '0%' : `${delta > 0 ? '+' : ''}${formatRate(delta, locale)}%`}
    </span>
  );
}

function PerformanceKpiCard({
  title,
  value,
  detail,
  icon: Icon,
  tone,
  trendValues,
  locale,
}: {
  title: string;
  value: number;
  detail: string;
  icon: typeof ShoppingCart;
  tone: KpiTone;
  trendValues?: number[];
  locale: string;
}): ReactElement {
  const delta = trendValues ? computeTrendDelta(trendValues) : null;
  const hasSparkline = (trendValues?.length ?? 0) >= 2;

  return (
    <Card className="group relative overflow-hidden rounded-2xl border-slate-200/90 bg-white/90 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/3">
      <div
        className={cn(
          'pointer-events-none absolute -right-6 -top-8 size-24 rounded-full bg-radial to-transparent opacity-60',
          KPI_TONE_GLOW_CLASSNAME[tone]
        )}
      />
      <CardContent className="relative p-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.17em] text-slate-500 dark:text-slate-400">
              {title}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <p className={cn('text-3xl font-black tabular-nums', KPI_TONE_VALUE_CLASSNAME[tone])}>{value}</p>
              <TrendDeltaBadge delta={delta} locale={locale} />
            </div>
          </div>
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-transform group-hover:scale-105',
              KPI_TONE_ICON_CLASSNAME[tone]
            )}
          >
            <Icon className="size-5" aria-hidden />
          </div>
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <p className="min-h-8 text-xs font-semibold leading-4 text-slate-500 dark:text-slate-400">
            {detail}
          </p>
          {hasSparkline ? (
            <Sparkline
              values={trendValues as number[]}
              className={cn('-mb-1 shrink-0', TONE_SPARKLINE_CLASSNAME[tone])}
              strokeClassName={TONE_SPARKLINE_CLASSNAME[tone]}
              fillClassName={TONE_SPARKLINE_CLASSNAME[tone]}
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ConversionRail({ totals, locale }: PerformanceKpiOverviewProps): ReactElement {
  const { t } = useTranslation();
  const items = [
    {
      label: t('salesman360.performance.pipeline.quotations'),
      value: totals.totalQuotations,
      icon: FileText,
      color: KPI_TONE_SOLID_CLASSNAME.neutral,
    },
    {
      label: t('salesman360.performance.pipeline.converted'),
      value: totals.convertedQuotations,
      icon: FileCheck2,
      color: KPI_TONE_SOLID_CLASSNAME.secondary,
    },
    {
      label: t('salesman360.performance.pipeline.orders'),
      value: totals.totalOrders,
      icon: ShoppingCart,
      color: KPI_TONE_SOLID_CLASSNAME.primary,
    },
    {
      label: t('salesman360.performance.pipeline.erp'),
      value: totals.erpIntegratedOrders,
      icon: BadgeCheck,
      color: KPI_TONE_SOLID_CLASSNAME.success,
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
              <div
                key={item.label}
                className="relative rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/8 dark:bg-white/3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div
                    className={cn(
                      'flex size-9 items-center justify-center rounded-xl text-white shadow-sm',
                      item.color
                    )}
                  >
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
                <p className="mt-3 text-2xl font-black tabular-nums text-slate-950 dark:text-white">
                  {item.value}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                  {item.label}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function PerformanceKpiOverview({
  totals,
  locale,
  trend = [],
}: PerformanceKpiOverviewProps): ReactElement {
  const { t } = useTranslation();

  const trendSeries = useMemo(
    () => ({
      orderCount: trend.map((item) => item.orderCount),
      erpOrderCount: trend.map((item) => item.erpOrderCount),
      quotationCount: trend.map((item) => item.quotationCount),
      activityCount: trend.map((item) => item.activityCount),
      customerCount: trend.map((item) => item.customerCount),
    }),
    [trend]
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <PerformanceKpiCard
          title={t('salesman360.performance.kpi.orders')}
          value={totals.totalOrders}
          detail={t('salesman360.performance.kpi.ordersDetail', {
            approved: totals.approvedOrders,
            rejected: totals.rejectedOrClosedOrders,
          })}
          icon={ShoppingCart}
          tone="primary"
          trendValues={trendSeries.orderCount}
          locale={locale}
        />
        <PerformanceKpiCard
          title={t('salesman360.performance.kpi.pending')}
          value={totals.pendingApprovalOrders}
          detail={t('salesman360.performance.kpi.pendingDetail', {
            draft: totals.draftOrders,
          })}
          icon={CircleDashed}
          tone="warning"
          locale={locale}
        />
        <PerformanceKpiCard
          title={t('salesman360.performance.kpi.erpOrders')}
          value={totals.erpIntegratedOrders}
          detail={t('salesman360.performance.kpi.erpOrdersDetail', {
            rate: formatRate(totals.erpIntegrationRate, locale),
          })}
          icon={BadgeCheck}
          tone="success"
          trendValues={trendSeries.erpOrderCount}
          locale={locale}
        />
        <PerformanceKpiCard
          title={t('salesman360.performance.kpi.quotations')}
          value={totals.totalQuotations}
          detail={t('salesman360.performance.kpi.quotationsDetail', {
            converted: totals.convertedQuotations,
            rate: formatRate(totals.quotationConversionRate, locale),
          })}
          icon={FileText}
          tone="secondary"
          trendValues={trendSeries.quotationCount}
          locale={locale}
        />
        <PerformanceKpiCard
          title={t('salesman360.performance.kpi.activities')}
          value={totals.totalActivities}
          detail={t('salesman360.performance.kpi.activitiesDetail', {
            completed: totals.completedActivities,
            planned: totals.plannedActivities,
          })}
          icon={Activity}
          tone="neutral"
          trendValues={trendSeries.activityCount}
          locale={locale}
        />
        <PerformanceKpiCard
          title={t('salesman360.performance.kpi.customers')}
          value={totals.totalCustomers}
          detail={t('salesman360.performance.kpi.customersDetail', {
            erp: totals.erpIntegratedCustomers,
            card: totals.businessCardCustomers,
          })}
          icon={ContactRound}
          tone="neutral"
          trendValues={trendSeries.customerCount}
          locale={locale}
        />
      </div>
      <ConversionRail totals={totals} locale={locale} />
    </>
  );
}
