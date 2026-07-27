import { type ReactElement } from 'react';
import { ChevronRight, Coins, Target, Users, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TabsContent } from '@/components/ui/tabs';
import type {
  CohortRetentionDto,
  RecommendedActionDto,
  Salesmen360OverviewDto,
  Salesmen360PerformanceDto,
  Salesmen360PeriodParams,
} from '../../types/salesmen360.types';
import {
  CohortRetentionPanel,
  RecommendedActionsPanel,
  RevenueQualityPanel,
} from '../analytics/SalesmenAnalyticsPanels';
import { SalesmenPerformanceDashboard } from '../SalesmenPerformanceDashboard';

interface SalesmenOverviewTabProps {
  userId: number;
  overview: Salesmen360OverviewDto;
  performance?: Salesmen360PerformanceDto;
  isPerformanceLoading: boolean;
  isPerformanceError: boolean;
  onRetryPerformance: () => void;
  locale: string;
  currency?: string;
  periodParams: Salesmen360PeriodParams;
  cohortData?: CohortRetentionDto[];
  isCohortLoading: boolean;
  isActionPending: boolean;
  onExecuteAction: (action: RecommendedActionDto) => void;
  currencyFormatter: Intl.NumberFormat;
  isAllCurrencies: boolean;
  onNavigateDemands: () => void;
  onNavigateQuotations: () => void;
  onNavigateOrders: () => void;
  onNavigateActivities: () => void;
}

function KpiSkeleton(): ReactElement {
  return (
    <Card className="rounded-2xl border border-slate-200 bg-white/50 p-1 dark:border-white/10 dark:bg-white/2">
      <CardContent className="px-4 pb-3 pt-4">
        <Skeleton className="mb-2 h-4 w-24" />
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  );
}

function NavigableKpiCard({
  label,
  value,
  icon: Icon,
  iconClassName,
  onNavigate,
}: {
  label: string;
  value: number;
  icon: typeof Target;
  iconClassName: string;
  onNavigate: () => void;
}): ReactElement {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onNavigate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onNavigate();
        }
      }}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm transition-all hover:shadow-md dark:border-white/10 dark:bg-white/3"
    >
      <CardContent className="px-4 pb-3 pt-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm ${iconClassName}`}
          >
            <Icon className="size-4" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            {label}
          </p>
        </div>
        <p className="mt-2.5 pl-10.5 text-2xl font-black tabular-nums text-slate-900 dark:text-white">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

export function SalesmenOverviewTab({
  userId,
  overview,
  performance,
  isPerformanceLoading,
  isPerformanceError,
  onRetryPerformance,
  locale,
  currency,
  periodParams,
  cohortData,
  isCohortLoading,
  isActionPending,
  onExecuteAction,
  currencyFormatter,
  isAllCurrencies,
  onNavigateDemands,
  onNavigateQuotations,
  onNavigateOrders,
  onNavigateActivities,
}: SalesmenOverviewTabProps): ReactElement {
  const { t } = useTranslation();
  const kpis = overview.kpis;
  const totalsByCurrency = kpis.totalsByCurrency ?? [];

  return (
    <TabsContent value="overview" className="space-y-6 outline-none">
      <SalesmenPerformanceDashboard
        userId={userId}
        data={performance}
        isLoading={isPerformanceLoading}
        isError={isPerformanceError}
        onRetry={onRetryPerformance}
        locale={locale}
        currency={currency}
        periodParams={periodParams}
      />

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <NavigableKpiCard
          label={t('salesman360.kpi.totalDemands')}
          value={kpis.totalDemands ?? 0}
          icon={ChevronRight}
          iconClassName="bg-accent dark:bg-primary/10 border-primary/20 dark:border-primary/20 text-red-600 dark:text-red-400"
          onNavigate={onNavigateDemands}
        />
        <NavigableKpiCard
          label={t('salesman360.kpi.totalQuotations')}
          value={kpis.totalQuotations ?? 0}
          icon={Zap}
          iconClassName="bg-orange-100 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-400"
          onNavigate={onNavigateQuotations}
        />
        <NavigableKpiCard
          label={t('salesman360.kpi.totalOrders')}
          value={kpis.totalOrders ?? 0}
          icon={Target}
          iconClassName="bg-emerald-100 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
          onNavigate={onNavigateOrders}
        />
        <NavigableKpiCard
          label={t('salesman360.kpi.totalActivities')}
          value={kpis.totalActivities ?? 0}
          icon={Users}
          iconClassName="bg-indigo-100 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
          onNavigate={onNavigateActivities}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <RevenueQualityPanel quality={overview.revenueQuality} />
        <RecommendedActionsPanel
          rows={overview.recommendedActions ?? []}
          busy={isActionPending}
          onExecute={onExecuteAction}
        />
        {isCohortLoading ? <KpiSkeleton /> : <CohortRetentionPanel rows={cohortData} />}

        {totalsByCurrency.length > 0 ? (
          <Card className="group overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/3">
            <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 pb-2.5 pt-3 dark:border-white/5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 shadow-sm transition-transform group-hover:scale-105 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <Coins className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-base font-bold text-slate-800 dark:text-white">
                {t('salesman360.currencyTotals.title')}
              </span>
            </div>
            <CardContent className="p-0">
              <div className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-0 dark:bg-[#231A2C]">
                      <TableHead>{t('salesman360.currencyTotals.currency')}</TableHead>
                      <TableHead className="text-right">
                        {t('salesman360.currencyTotals.demandAmount')}
                      </TableHead>
                      <TableHead className="text-right">
                        {t('salesman360.currencyTotals.quotationAmount')}
                      </TableHead>
                      <TableHead className="text-right">
                        {t('salesman360.currencyTotals.orderAmount')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {totalsByCurrency.map((row) => (
                      <TableRow key={row.currency}>
                        <TableCell className="font-bold">{row.currency}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {currencyFormatter.format(row.demandAmount ?? 0)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {currencyFormatter.format(row.quotationAmount ?? 0)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {currencyFormatter.format(row.orderAmount ?? 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {!isAllCurrencies ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            ['salesman360.kpi.totalDemandAmount', kpis.totalDemandAmount, 'border-l-primary'],
            [
              'salesman360.kpi.totalQuotationAmount',
              kpis.totalQuotationAmount,
              'border-l-orange-500',
            ],
            ['salesman360.kpi.totalOrderAmount', kpis.totalOrderAmount, 'border-l-emerald-500'],
          ].map(([labelKey, value, borderClass]) => (
            <Card
              key={String(labelKey)}
              className={`overflow-hidden rounded-2xl border border-l-4 border-slate-200 bg-white/80 p-1 shadow-sm dark:border-white/10 dark:bg-white/3 ${borderClass}`}
            >
              <CardContent className="px-6 pb-3 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {t(String(labelKey))}
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                  {currencyFormatter.format(Number(value ?? 0))}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </TabsContent>
  );
}
