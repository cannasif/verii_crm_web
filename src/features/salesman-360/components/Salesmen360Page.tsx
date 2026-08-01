import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LineChart, RefreshCw, Target, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/auth-store';
import {
  useSalesmenOverviewQuery,
  useSalesmenPerformanceQuery,
  useSalesmenCohortQuery,
  useExecuteSalesmenActionMutation,
  useVisibleSalesmenQuery,
} from '../hooks/useSalesmen360';
import { Salesmen360Filters, type Salesmen360CurrencyFilterOption } from './filters/Salesmen360Filters';
import { SalesmenOverviewTab } from './tabs/SalesmenOverviewTab';
import { SalesmenPerformanceTab } from './tabs/SalesmenPerformanceTab';
import { SalesWorkFeedTab } from './performance/tabs/SalesWorkFeedTab';
import { SalesmenReportTabs, type Salesmen360TabKey } from './navigation/SalesmenReportTabs';
import type { Salesmen360PeriodKey } from '../types/salesmen360.types';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';

function getInitials(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
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

function toLocalDateInput(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

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
  const [customStartDate, setCustomStartDate] = useState(() =>
    toLocalDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
  );
  const [customEndDate, setCustomEndDate] = useState(() => toLocalDateInput(new Date()));
  const [activeTab, setActiveTab] = useState<Salesmen360TabKey>('overview');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>(isAllSalesmen || userId <= 0 ? [] : [userId]);
  const visibleSalesmenQuery = useVisibleSalesmenQuery();
  const { currencyOptions: erpCurrencyOptions, isLoading: isCurrencyOptionsLoading } = useCurrencyOptions();
  const currencyParam = selectedCurrency === 'ALL' ? undefined : selectedCurrency;
  const periodParams = useMemo(
    () =>
      selectedPeriod === 'custom'
        ? {
            period: selectedPeriod,
            startDate: customStartDate,
            endDate: customEndDate,
          }
        : { period: selectedPeriod },
    [customEndDate, customStartDate, selectedPeriod],
  );
  const scopedUserId = selectedUserIds.length === 1 ? selectedUserIds[0] : ALL_SALESMEN_ID;
  const selectedUserIdsParam = selectedUserIds.length > 1 ? selectedUserIds : undefined;
  const isTeamScope = selectedUserIds.length !== 1;
  const {
    data: overview,
    isLoading,
    isError,
    error,
    refetch,
  } = useSalesmenOverviewQuery(scopedUserId, currencyParam, periodParams, scopedUserId >= 0);
  const {
    data: performance,
    isLoading: isPerformanceLoading,
    isError: isPerformanceError,
    refetch: refetchPerformance,
  } = useSalesmenPerformanceQuery(scopedUserId, selectedUserIdsParam, currencyParam, periodParams, scopedUserId >= 0);
  const { data: cohortData, isLoading: isCohortLoading } = useSalesmenCohortQuery(scopedUserId, 12, activeTab === 'overview' && !isTeamScope);
  const executeActionMutation = useExecuteSalesmenActionMutation(scopedUserId);
  const visibleSalesmen = useMemo(() => visibleSalesmenQuery.data ?? [], [visibleSalesmenQuery.data]);
  const salespersonOptions = visibleSalesmen;

  useEffect(() => {
    setSelectedUserIds(isAllSalesmen || userId <= 0 ? [] : [userId]);
  }, [isAllSalesmen, userId]);

  useEffect(() => {
    if (selectedUserIds.length === 0 || visibleSalesmen.length === 0) {
      return;
    }

    const visibleIds = new Set(visibleSalesmen.map((item) => item.userId));
    const validSelection = selectedUserIds.filter((id) => visibleIds.has(id));
    if (validSelection.length !== selectedUserIds.length) {
      setSelectedUserIds(validSelection);
    }
  }, [selectedUserIds, visibleSalesmen]);

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

  const currencyOptions = useMemo<Salesmen360CurrencyFilterOption[]>(() => {
    const seen = new Set<string>();
    const options: Salesmen360CurrencyFilterOption[] = [{ value: 'ALL', label: t('salesman360.currencyFilter.all') }];

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
    [currencyOptions, selectedCurrency],
  );

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(i18n.resolvedLanguage ?? i18n.language, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [i18n.resolvedLanguage, i18n.language],
  );
  const currencyOptionValueSignature = useMemo(() => currencyOptions.map((option) => option.value).join('|'), [currencyOptions]);
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

  const isAllCurrencies = selectedCurrency === 'ALL';
  const lastActivityDateFormatted = '-';

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
            <p className="text-slate-600 dark:text-slate-400 font-bold text-xl">
              {is404 ? t('salesman360.notFound') : t('salesman360.error')}
            </p>
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
    if (isTeamScope) {
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
                {isTeamScope ? (
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
                      {isTeamScope ? t('salesman360.title') : overview.fullName || t('salesman360.title')}
                    </h1>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/60 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-primary">
                      <LineChart className="size-3" />
                      360°
                    </span>
                  </div>
                  <p className="truncate text-[13px] font-medium italic text-slate-500 dark:text-slate-400">
                    {isTeamScope ? t('salesman360.subtitle') : overview.email || t('salesman360.subtitle')}
                  </p>
                </div>
              </div>

              {!isTeamScope ? (
                <div className="flex w-full flex-wrap items-stretch justify-between gap-y-3 divide-x divide-slate-200 sm:w-auto sm:flex-nowrap sm:justify-end dark:divide-white/10">
                  <div className="flex flex-col justify-center pr-3 text-right sm:px-4 sm:first:pl-0 sm:last:pr-0">
                    <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{overview.kpis.totalOrders ?? 0}</p>
                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                      {t('salesman360.kpi.totalOrders')}
                    </p>
                  </div>
                  <div className="flex flex-col justify-center px-3 text-right sm:px-4 sm:first:pl-0 sm:last:pr-0">
                    <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{overview.kpis.totalActivities ?? 0}</p>
                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                      {t('salesman360.kpi.totalActivities')}
                    </p>
                  </div>
                  {lastActivityDateFormatted !== '-' ? (
                    <div className="flex flex-col justify-center pl-3 text-right sm:px-4 sm:first:pl-0 sm:last:pr-0">
                      <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{lastActivityDateFormatted}</p>
                      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        {t('salesman360.analytics.lastActivityDate')}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <Salesmen360Filters
            salesmen={salespersonOptions}
            selectedUserIds={selectedUserIds}
            showSalesmanFilter={visibleSalesmen.length > 1}
            onSelectedUserIdsChange={setSelectedUserIds}
            currencyOptions={currencyOptions}
            selectedCurrency={selectedCurrency}
            selectedCurrencyLabel={selectedCurrencyOption?.label}
            onSelectCurrency={setSelectedCurrency}
            selectedPeriod={selectedPeriod}
            onSelectPeriod={setSelectedPeriod}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onCustomStartDateChange={setCustomStartDate}
            onCustomEndDateChange={setCustomEndDate}
          />
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Salesmen360TabKey)} className="space-y-6">
          <SalesmenReportTabs />

          {!isTeamScope ? (
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
                  priority: 'High',
                })
              }
              currencyFormatter={currencyFormatter}
              isAllCurrencies={isAllCurrencies}
              onNavigateDemands={navigateToDemands}
              onNavigateQuotations={navigateToQuotations}
              onNavigateOrders={navigateToOrders}
              onNavigateActivities={navigateToActivities}
            />
          ) : null}

          {(isTeamScope
            ? (['overview', 'sales', 'demand', 'quotation', 'order', 'activity', 'customer', 'stock', 'movement'] as const)
            : (['sales', 'demand', 'quotation', 'order', 'activity', 'customer', 'stock', 'movement'] as const)
          ).map((section) => (
            <SalesmenPerformanceTab
              key={section}
              section={section}
              userId={scopedUserId}
              userIds={selectedUserIdsParam}
              performance={performance}
              isLoading={isPerformanceLoading}
              isError={isPerformanceError}
              onRetry={() => void refetchPerformance()}
              locale={i18n.resolvedLanguage ?? i18n.language}
              currency={currencyParam}
              periodParams={periodParams}
            />
          ))}
          {(['demand', 'quotation', 'order', 'activity'] as const).map((kind) => (
            <SalesWorkFeedTab
              key={kind}
              tabValue={kind}
              fixedKind={kind}
              userId={scopedUserId}
              userIds={selectedUserIdsParam}
              locale={i18n.resolvedLanguage ?? i18n.language}
              currency={currencyParam}
              periodParams={periodParams}
              attentionItems={performance?.attentionItems ?? []}
              enabled={activeTab === kind}
            />
          ))}
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
