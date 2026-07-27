import { type ReactElement } from 'react';
import {
  Activity,
  BadgeCheck,
  ChartNoAxesCombined,
  CircleDashed,
  ContactRound,
  FileCheck2,
  FileText,
  ShoppingCart,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Salesmen360PerformanceTotalsDto } from '../../types/salesmen360.types';

interface PerformanceKpiOverviewProps {
  totals: Salesmen360PerformanceTotalsDto;
  locale: string;
}

function formatRate(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value ?? 0);
}

function PerformanceKpiCard({
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
    emerald:
      'border-emerald-200/80 bg-emerald-50 text-emerald-600 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300',
    indigo:
      'border-indigo-200/80 bg-indigo-50 text-indigo-600 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-300',
    sky: 'border-sky-200/80 bg-sky-50 text-sky-600 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-300',
    violet:
      'border-violet-200/80 bg-violet-50 text-violet-600 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300',
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-slate-200/90 bg-white/90 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.17em] text-slate-500 dark:text-slate-400">
              {title}
            </p>
            <p className="mt-2 text-3xl font-black tabular-nums text-slate-950 dark:text-white">
              {value}
            </p>
          </div>
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl border',
              tones[tone]
            )}
          >
            <Icon className="size-5" aria-hidden />
          </div>
        </div>
        <p className="mt-3 min-h-8 text-xs font-semibold leading-4 text-slate-500 dark:text-slate-400">
          {detail}
        </p>
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
}: PerformanceKpiOverviewProps): ReactElement {
  const { t } = useTranslation();

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
          tone="pink"
        />
        <PerformanceKpiCard
          title={t('salesman360.performance.kpi.pending')}
          value={totals.pendingApprovalOrders}
          detail={t('salesman360.performance.kpi.pendingDetail', {
            draft: totals.draftOrders,
          })}
          icon={CircleDashed}
          tone="amber"
        />
        <PerformanceKpiCard
          title={t('salesman360.performance.kpi.erpOrders')}
          value={totals.erpIntegratedOrders}
          detail={t('salesman360.performance.kpi.erpOrdersDetail', {
            rate: formatRate(totals.erpIntegrationRate, locale),
          })}
          icon={BadgeCheck}
          tone="emerald"
        />
        <PerformanceKpiCard
          title={t('salesman360.performance.kpi.quotations')}
          value={totals.totalQuotations}
          detail={t('salesman360.performance.kpi.quotationsDetail', {
            converted: totals.convertedQuotations,
            rate: formatRate(totals.quotationConversionRate, locale),
          })}
          icon={FileText}
          tone="indigo"
        />
        <PerformanceKpiCard
          title={t('salesman360.performance.kpi.activities')}
          value={totals.totalActivities}
          detail={t('salesman360.performance.kpi.activitiesDetail', {
            completed: totals.completedActivities,
            planned: totals.plannedActivities,
          })}
          icon={Activity}
          tone="sky"
        />
        <PerformanceKpiCard
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
    </>
  );
}
