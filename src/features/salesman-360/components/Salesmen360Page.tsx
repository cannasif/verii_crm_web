import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  RefreshCw,
  Target,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/auth-store';
import {
  useSalesmenOverviewQuery,
  useSalesmenAnalyticsSummaryQuery,
  useSalesmenAnalyticsChartsQuery,
  useSalesmenPerformanceQuery,
  useSalesmenCohortQuery,
  useSalesmenErpMovementsQuery,
  useExecuteSalesmenActionMutation,
  useVisibleSalesmenQuery,
} from '../hooks/useSalesmen360';
import { SalesmenCurrencySummaryCards } from './SalesmenCurrencySummaryCards';
import { SalesmenAmountComparisonByCurrencyTable } from './SalesmenAmountComparisonByCurrencyTable';
import { SalesmenErpMovementsTabContent } from './SalesmenErpMovementsTabContent';
import {
  Salesmen360Filters,
  type Salesmen360CurrencyFilterOption,
} from './filters/Salesmen360Filters';
import {
  DistributionAndTrendCharts,
} from './analytics/SalesmenAnalyticsPanels';
import { SalesmenOverviewTab } from './tabs/SalesmenOverviewTab';
import { SalesmenPerformanceTab } from './tabs/SalesmenPerformanceTab';
import {
  SalesmenReportTabs,
  type Salesmen360TabKey,
} from './navigation/SalesmenReportTabs';
import type {
  Salesmen360PeriodKey,
  Salesmen360VisibleUserDto,
} from '../types/salesmen360.types';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';

function getInitials(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
  return initials || '?';
}

function KpiCardSkeleton(): ReactElement {
  return (
    <Card className="rounded-2xl border border-slate-200 bg-white/50 p-1 dark:border-white/10 dark:bg-white/2">
      <CardContent className="pt-4 pb-3 px-4">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  );
}

const ALL_SALESMEN_ROUTE_VALUE = 'all';
const ALL_SALESMEN_ID = 0;

export function Salesmen360Page(): ReactElement {
  const params = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const authUser = useAuthStore((s) => s.user);
  const rawUserId = params.userId ?? '';
  const isAllSalesmen = rawUserId === ALL_SALESMEN_ROUTE_VALUE;
  const userId = isAllSalesmen ? ALL_SALESMEN_ID : rawUserId === 'me' ? (authUser?.id ?? 0) : Number(rawUserId || 0);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState<Salesmen360PeriodKey>('month');
  const [activeTab, setActiveTab] = useState<Salesmen360TabKey>('overview');
  const visibleSalesmenQuery = useVisibleSalesmenQuery();
  const { currencyOptions: erpCurrencyOptions, isLoading: isCurrencyOptionsLoading } = useCurrencyOptions();
  const currencyParam = selectedCurrency === 'ALL' ? undefined : selectedCurrency;
  const periodParams = useMemo(() => ({ period: selectedPeriod }), [selectedPeriod]);
  const { data: overview, isLoading, isError, error, refetch } = useSalesmenOverviewQuery(userId, currencyParam, periodParams, isAllSalesmen || userId > 0);
  const {
    data: performance,
    isLoading: isPerformanceLoading,
    isError: isPerformanceError,
    refetch: refetchPerformance,
  } = useSalesmenPerformanceQuery(
    userId,
    currencyParam,
    periodParams,
    activeTab === 'performance' && (isAllSalesmen || userId > 0)
  );
  const showErpMovementsTab = !isAllSalesmen && userId > 0;
  const { data: summary, isLoading: isSummaryLoading, isError: isSummaryError } = useSalesmenAnalyticsSummaryQuery(userId, currencyParam, periodParams, activeTab === 'analytics');
  const { data: charts, isLoading: isChartsLoading, isError: isChartsError } = useSalesmenAnalyticsChartsQuery(userId, 12, currencyParam, periodParams, activeTab === 'analytics');
  const {
    data: erpMovements = [],
    isLoading: isErpMovementsLoading,
    isError: isErpMovementsError,
  } = useSalesmenErpMovementsQuery(userId, activeTab === 'erpMovements' && showErpMovementsTab);
  const { data: cohortData, isLoading: isCohortLoading } = useSalesmenCohortQuery(
    userId,
    12,
    activeTab === 'overview'
  );
  const executeActionMutation = useExecuteSalesmenActionMutation(userId);
  const visibleSalesmen = useMemo(
    () => visibleSalesmenQuery.data ?? [],
    [visibleSalesmenQuery.data]
  );
  const allSalesmenOption = useMemo<Salesmen360VisibleUserDto>(
    () => ({
      userId: ALL_SALESMEN_ID,
      fullName: t('salesman360.salesmanFilter.all'),
      email: null,
      isSelf: false,
    }),
    [t]
  );
  const salespersonOptions = useMemo(
    () => (visibleSalesmen.length > 1 ? [allSalesmenOption, ...visibleSalesmen] : visibleSalesmen),
    [allSalesmenOption, visibleSalesmen]
  );
  const selectedSalesmanValue = isAllSalesmen || userId > 0 ? String(userId) : undefined;

  useEffect(() => {
    if (visibleSalesmen.length === 0) {
      return;
    }

    if (isAllSalesmen) {
      return;
    }

    if (userId <= 0) {
      navigate(`/salesmen-360/${visibleSalesmen[0].userId}`, { replace: true });
      return;
    }

    if (!visibleSalesmen.some((item) => item.userId === userId)) {
      navigate(`/salesmen-360/${visibleSalesmen[0].userId}`, { replace: true });
    }
  }, [isAllSalesmen, navigate, userId, visibleSalesmen]);

  useEffect(() => {
    if (isAllSalesmen && activeTab !== 'overview' && activeTab !== 'performance') {
      setActiveTab('overview');
    }
  }, [activeTab, isAllSalesmen]);

  const currencyOptions = useMemo<Salesmen360CurrencyFilterOption[]>(() => {
    const seen = new Set<string>();
    const options: Salesmen360CurrencyFilterOption[] = [
      { value: 'ALL', label: t('salesman360.currencyFilter.all') },
    ];

    for (const rate of erpCurrencyOptions) {
      const value = String(rate.dovizTipi);
      if (seen.has(value)) {
        continue;
      }

      seen.add(value);
      const name = rate.dovizIsmi?.trim() || `Döviz ${rate.dovizTipi}`;

      options.push({
        value,
        label: name,
        helper: `ERP Kod ${rate.dovizTipi}`,
      });
    }

    return options;
  }, [erpCurrencyOptions, t]);
  const selectedCurrencyOption = useMemo(
    () => currencyOptions.find((option) => option.value === selectedCurrency),
    [currencyOptions, selectedCurrency]
  );

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(i18n.resolvedLanguage ?? i18n.language, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [i18n.resolvedLanguage, i18n.language]
  );
  const currencyOptionValueSignature = useMemo(
    () => currencyOptions.map((option) => option.value).join('|'),
    [currencyOptions]
  );
  const hasSelectedCurrencyOption = useMemo(() => {
    if (selectedCurrency === 'ALL') {
      return true;
    }

    return currencyOptionValueSignature.split('|').includes(selectedCurrency);
  }, [currencyOptionValueSignature, selectedCurrency]);

  useEffect(() => {
    if (selectedCurrency === 'ALL' || isCurrencyOptionsLoading) {
      return;
    }

    if (!hasSelectedCurrencyOption) {
      setSelectedCurrency('ALL');
    }
  }, [hasSelectedCurrencyOption, isCurrencyOptionsLoading, selectedCurrency]);

  const selectedSalesmanLabel = useMemo(() => {
    if (isAllSalesmen) {
      return t('salesman360.salesmanFilter.all');
    }

    const selected = visibleSalesmen.find((item) => item.userId === userId);
    if (!selected) {
      return undefined;
    }

    const fullName = selected.fullName?.trim();
    if (fullName && selected.email) {
      return `${fullName} (${selected.email})`;
    }

    return fullName || selected.email || String(selected.userId);
  }, [isAllSalesmen, t, userId, visibleSalesmen]);

  const isAllCurrencies = selectedCurrency === 'ALL';
  const overviewTotalsByCurrency = overview?.kpis?.totalsByCurrency ?? [];
  const chartsAmountComparisonByCurrency = charts?.amountComparisonByCurrency ?? [];

  const lastActivityDateFormatted = summary?.lastActivityDate
    ? new Date(summary.lastActivityDate).toLocaleDateString(i18n.language)
    : '-';

  if (userId <= 0 && !isAllSalesmen) {
    return (
      <div className="w-full px-6 py-10">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 dark:border-white/10 dark:bg-white/2 p-20 text-center flex flex-col items-center gap-4">
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
        <Card className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/2 shadow-xl overflow-hidden">
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

  const navigateWithRepresentativeNameQuery = (basePath: string): void => {
    if (isAllSalesmen) {
      navigate(basePath);
      return;
    }

    const selected = visibleSalesmen.find((item) => item.userId === userId);
    const representativeName = selected?.fullName?.trim() || selected?.email?.trim();
    if (!representativeName) {
      navigate(basePath);
      return;
    }

    const search = new URLSearchParams({ representativeName });
    navigate(`${basePath}?${search.toString()}`);
  };

  const navigateToDemands = (): void => {
    navigateWithRepresentativeNameQuery('/demands');
  };

  const navigateToQuotations = (): void => {
    navigateWithRepresentativeNameQuery('/quotations');
  };

  const navigateToOrders = (): void => {
    navigateWithRepresentativeNameQuery('/orders');
  };

  const navigateToActivities = (): void => {
    navigateWithRepresentativeNameQuery('/activity-management');
  };

  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={0}>
      <div className="w-full px-1.5 pt-0 pb-8 space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col gap-5 pt-4">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/60">
            <div className="pointer-events-none absolute inset-0 bg-[image:var(--crm-brand-gradient-soft)] opacity-70 dark:opacity-40" />
            <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex min-w-0 items-center gap-4">
                {isAllSalesmen ? (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-accent shadow-inner dark:border-primary/30 dark:bg-primary/10">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                ) : (
                  <div className="shrink-0 rounded-full bg-[image:var(--crm-brand-gradient)] p-[2px] shadow-lg shadow-primary/20">
                    <div className="flex h-[62px] w-[62px] items-center justify-center rounded-full bg-white font-serif text-xl font-semibold text-primary dark:bg-slate-950">
                      {getInitials(overview.fullName)}
                    </div>
                  </div>
                )}
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    <h1 className="truncate font-serif text-[1.7rem] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[1.9rem]">
                      {isAllSalesmen ? t('salesman360.title') : overview.fullName || t('salesman360.title')}
                    </h1>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/60 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-primary">
                      <LineChart className="size-3" />
                      360°
                    </span>
                  </div>
                  <p className="truncate text-[13px] font-medium italic text-slate-500 dark:text-slate-400">
                    {isAllSalesmen ? t('salesman360.subtitle') : overview.email || t('salesman360.subtitle')}
                  </p>
                </div>
              </div>

              {!isAllSalesmen ? (
                <div className="flex w-full flex-wrap items-stretch justify-between gap-y-3 divide-x divide-slate-200 sm:w-auto sm:flex-nowrap sm:justify-end dark:divide-white/10">
                  <div className="flex flex-col justify-center pr-3 text-right sm:px-4 sm:first:pl-0 sm:last:pr-0">
                    <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{overview.kpis.totalOrders ?? 0}</p>
                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">{t('salesman360.kpi.totalOrders')}</p>
                  </div>
                  <div className="flex flex-col justify-center px-3 text-right sm:px-4 sm:first:pl-0 sm:last:pr-0">
                    <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{overview.kpis.totalActivities ?? 0}</p>
                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">{t('salesman360.kpi.totalActivities')}</p>
                  </div>
                  {lastActivityDateFormatted !== '-' ? (
                    <div className="flex flex-col justify-center pl-3 text-right sm:px-4 sm:first:pl-0 sm:last:pr-0">
                      <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{lastActivityDateFormatted}</p>
                      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">{t('salesman360.analytics.lastActivityDate')}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <Salesmen360Filters
            salesmen={salespersonOptions}
            selectedUserId={userId}
            selectedSalesmanLabel={selectedSalesmanLabel}
            showSalesmanFilter={visibleSalesmen.length > 1 && Boolean(selectedSalesmanValue)}
            onSelectUserId={(id) =>
              navigate(id === ALL_SALESMEN_ID ? '/salesmen-360/all' : `/salesmen-360/${id}`)
            }
            currencyOptions={currencyOptions}
            selectedCurrency={selectedCurrency}
            selectedCurrencyLabel={selectedCurrencyOption?.label}
            onSelectCurrency={setSelectedCurrency}
            selectedPeriod={selectedPeriod}
            onSelectPeriod={setSelectedPeriod}
          />
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Salesmen360TabKey)} className="space-y-6">
          <SalesmenReportTabs
            isTeamView={isAllSalesmen}
            showErpMovements={showErpMovementsTab}
          />

          <SalesmenOverviewTab
            overview={overview}
            cohortData={cohortData}
            isCohortLoading={isCohortLoading}
            isActionPending={executeActionMutation.isPending}
            onExecuteAction={(action) =>
              executeActionMutation.mutate({
                actionCode: action.actionCode,
                title: action.title,
                reason: action.reason ?? undefined,
                dueInDays: 1,
                priority: "High",
              })
            }
            currencyFormatter={currencyFormatter}
            isAllCurrencies={isAllCurrencies}
            onNavigateDemands={navigateToDemands}
            onNavigateQuotations={navigateToQuotations}
            onNavigateOrders={navigateToOrders}
            onNavigateActivities={navigateToActivities}
          />

          <SalesmenPerformanceTab
            userId={userId}
            performance={performance}
            isLoading={isPerformanceLoading}
            isError={isPerformanceError}
            onRetry={() => void refetchPerformance()}
            locale={i18n.resolvedLanguage ?? i18n.language}
            currency={currencyParam}
            periodParams={periodParams}
          />

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
                      userId={userId}
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
                      <Card key={i} className="rounded-2xl border border-slate-200 bg-white/50 dark:border-white/10 dark:bg-white/2">
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
                    locale={i18n.language}
                    noDataKey="common.noData"
                    chartsEnabled={activeTab === 'analytics'}
                  />
                ) : null}
              </>
            )}
          </TabsContent>
          {showErpMovementsTab && (
            <TabsContent value="erpMovements" className="space-y-6 outline-none">
              <SalesmenErpMovementsTabContent
                movements={erpMovements}
                isLoading={isErpMovementsLoading}
                isError={isErpMovementsError}
                numberFormatter={currencyFormatter}
                selectedUserId={userId}
                locale={i18n.language}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
