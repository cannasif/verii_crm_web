import { type ReactElement, useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CircleHelp, RefreshCw, User, MapPin, FileText, ClipboardList, ShoppingCart, Activity, Clock, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCustomer360OverviewQuery,
  useCustomer360AnalyticsSummaryQuery,
  useCustomer360AnalyticsChartsQuery,
  useCustomer360CohortQuery,
  useCustomerImagesQuery,
  useExecuteCustomer360ActionMutation,
} from '../hooks/useCustomer360';
import { CustomerCurrencySummaryCards } from './CustomerCurrencySummaryCards';
import { CustomerAmountComparisonByCurrencyTable } from './CustomerAmountComparisonByCurrencyTable';
import { CustomerMailLogsTab } from './CustomerMailLogsTab';
import { useRechartsModule } from '@/lib/useRechartsModule';
import { getApiBaseUrl } from '@/lib/axios';
import { useAuthStore } from '@/stores/auth-store';
import { ActivityForm } from '@/features/activity-management/components/ActivityForm';
import { useCreateActivity } from '@/features/activity-management/hooks/useCreateActivity';
import { buildCreateActivityPayload } from '@/features/activity-management/utils/build-create-payload';
import type { ActivityFormSchema } from '@/features/activity-management/types/activity-types';
import type {
  CohortRetentionDto,
  Customer360SimpleItemDto,
  Customer360TimelineItemDto,
  Customer360DistributionDto,
  Customer360AmountComparisonDto,
  RecommendedActionDto,
  RevenueQualityDto,
} from '../types/customer360.types';

function getQuickActivityWindow(): { start: string; end: string } {
  const start = new Date();
  const end = new Date(start);
  end.setHours(end.getHours() + 1, end.getMinutes(), 0, 0);
  start.setSeconds(0, 0);

  const toInputValue = (value: Date): string => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const hour = String(value.getHours()).padStart(2, '0');
    const minute = String(value.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hour}:${minute}`;
  };

  return {
    start: toInputValue(start),
    end: toInputValue(end),
  };
}

function recommendedActionCodeToKey(code: string): string {
  return code
    .replace(/\s+/g, '_')
    .replace(/([A-Z])/g, '_$1')
    .replace(/^_/, '')
    .toUpperCase();
}

function SectionSkeleton(): ReactElement {
  return (
    <Card className="rounded-xl border border-slate-200 dark:border-white/10">
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}

function SectionCard({
  title,
  icon: Icon,
  items,
  emptyKey,
  renderItem,
}: {
  title: string;
  icon: React.ElementType;
  items: unknown[];
  emptyKey: string;
  renderItem: (item: unknown) => ReactElement;
}): ReactElement {
  const { t } = useTranslation();
  return (
    <Card className="rounded-xl border border-slate-200 dark:border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!items?.length ? (
          <p className="text-sm text-muted-foreground py-2">{t(emptyKey)}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, i) => (
              <li key={(item as { id?: number; itemId?: number }).id ?? (item as { itemId?: number }).itemId ?? i}>
                {renderItem(item)}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function SimpleItemRow({ item }: { item: Customer360SimpleItemDto }): ReactElement {
  const { i18n } = useTranslation();
  const label = [item.title, item.subtitle].filter(Boolean).join(' · ') || `#${item.id}`;
  const date = item.date ? new Date(item.date).toLocaleDateString(i18n.language) : null;
  return (
    <div className="flex items-center justify-between gap-2 text-sm py-1.5 border-b border-slate-100 dark:border-white/5 last:border-0">
      <span className="truncate">{label}</span>
      {date && <span className="text-muted-foreground shrink-0">{date}</span>}
    </div>
  );
}

function translateStatus(t: (key: string) => string, status: string): string {
  const key = `customer360.status.${status}`;
  const translated = t(key);
  return translated !== key ? translated : status;
}

function TimelineRow({ item }: { item: Customer360TimelineItemDto }): ReactElement {
  const { t, i18n } = useTranslation();
  const date = new Date(item.date).toLocaleString(i18n.language, { dateStyle: 'short', timeStyle: 'short' });
  const statusLabel = item.status ? translateStatus(t, item.status) : null;
  return (
    <div className="flex gap-3 py-2 border-b border-slate-100 dark:border-white/5 last:border-0">
      <div className="shrink-0 text-muted-foreground text-xs w-36">{date}</div>
      <div className="min-w-0">
        <div className="font-medium text-sm">{item.title || item.type || '-'}</div>
        {statusLabel && (
          <div className="text-muted-foreground text-xs mt-0.5">{statusLabel}</div>
        )}
      </div>
    </div>
  );
}

const CHART_COLORS = ['#8b5cf6', '#ec4899', '#f59e0b'];

function CardTitleWithInfo({ titleKey, explainKey }: { titleKey: string; explainKey: string }): ReactElement {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-base">{t(titleKey)}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex text-muted-foreground hover:text-foreground cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
            <CircleHelp className="size-4 shrink-0" aria-hidden />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px]">
          {t(explainKey)}
        </TooltipContent>
      </Tooltip>
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
  const toneClass = safeValue >= 70 ? 'text-emerald-600' : safeValue >= 40 ? 'text-amber-600' : 'text-rose-600';
  const labelEl = explainKey ? (
    <span className="flex items-center gap-1 text-muted-foreground">
      {label}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
            <CircleHelp className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px]">
          {t(explainKey)}
        </TooltipContent>
      </Tooltip>
    </span>
  ) : (
    <span className="text-muted-foreground">{label}</span>
  );
  return (
    <div className="flex items-center justify-between text-sm py-1.5">
      {labelEl}
      <span className={`font-semibold ${toneClass}`}>{safeValue.toFixed(2)}</span>
    </div>
  );
}

function RevenueQualityPanel({ quality }: { quality: RevenueQualityDto | null | undefined }): ReactElement {
  const { t } = useTranslation();
  return (
    <Card className="rounded-xl border border-slate-200 dark:border-white/10">
      <CardHeader>
        <CardTitle className="text-base">
          <CardTitleWithInfo
            titleKey="customer360.revenueQuality.title"
            explainKey="customer360.explain.revenueQualityTitle"
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <ScoreRow
          label={t('customer360.revenueQuality.churnRisk')}
          value={quality?.churnRiskScore}
          explainKey="customer360.explain.churnRisk"
        />
        <ScoreRow
          label={t('customer360.revenueQuality.upsell')}
          value={quality?.upsellPropensityScore}
          explainKey="customer360.explain.upsellPropensity"
        />
        <ScoreRow
          label={t('customer360.revenueQuality.payment')}
          value={quality?.paymentBehaviorScore}
          explainKey="customer360.explain.paymentBehavior"
        />
        <div className="flex items-center justify-between text-sm py-1.5 pt-1">
          <span className="flex items-center gap-1 text-muted-foreground">
            {t('customer360.revenueQuality.segment')}:{' '}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
                  <CircleHelp className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px]">
                {t('customer360.explain.rfmSegment')}
              </TooltipContent>
            </Tooltip>
          </span>
          <span className="font-medium">{quality?.rfmSegment ?? '-'}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">{t('customer360.revenueQuality.ltv')}: </span>
          <span className="font-medium">{quality?.ltv ?? 0}</span>
        </div>
        {quality?.dataQualityNote ? <p className="text-xs text-muted-foreground pt-2">{quality.dataQualityNote}</p> : null}
        <p className="text-xs text-muted-foreground border-t border-slate-100 dark:border-white/5 mt-2 pt-2">
          {t('customer360.explain.modelNote')}
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
    <Card className="rounded-xl border border-slate-200 dark:border-white/10">
      <CardHeader>
        <CardTitle className="text-base">
          <CardTitleWithInfo
            titleKey="customer360.cohort.title"
            explainKey="customer360.explain.cohortRetentionTitle"
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!first?.points?.length ? (
          <p className="text-sm text-muted-foreground">
            {t('customer360.explain.noCohortData')}
          </p>
        ) : (
          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">{t('customer360.cohort.cohortKey')}: </span>
              <span className="font-medium">{first.cohortKey}</span>
            </div>
            <div className="max-h-56 overflow-auto space-y-1">
              {first.points.map((point) => (
                <div key={`${point.periodMonth}-${point.periodIndex}`} className="flex items-center justify-between text-sm py-1 border-b border-slate-100 dark:border-white/5 last:border-0">
                  <span>{point.periodMonth}</span>
                  <span className="font-medium">{point.retentionRate.toFixed(2)}%</span>
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
    <Card className="rounded-xl border border-slate-200 dark:border-white/10">
      <CardHeader>
        <CardTitle className="text-base">
          <CardTitleWithInfo
            titleKey="customer360.actions.title"
            explainKey="customer360.explain.recommendedActionsTitle"
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('customer360.actions.empty')}</p>
        ) : (
          <div className="space-y-3">
            {rows.map((action) => {
              const actionKey = recommendedActionCodeToKey(action.actionCode);
              const title = t(`customer360.actions.recommendedActions.${actionKey}.title`, { defaultValue: action.title });
              const reason = t(`customer360.actions.recommendedActions.${actionKey}.reason`, { defaultValue: action.reason ?? '-' });
              return (
              <div key={`${action.actionCode}-${action.title}`} className="rounded-lg border border-slate-200 dark:border-white/10 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{reason}</p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Button size="sm" onClick={() => onExecute(action)} disabled={busy}>
                          {t('customer360.actions.execute')}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px]">
                      {t('customer360.explain.executeAction')}
                    </TooltipContent>
                  </Tooltip>
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

function AnalyticsChartsSection({
  distribution,
  monthlyTrend,
  amountComparison,
  currencyFormatter,
  t,
  noDataKey,
  showAmountBar = true,
}: {
  distribution: Customer360DistributionDto;
  monthlyTrend: { month: string; demandCount: number; quotationCount: number; orderCount: number }[];
  amountComparison: Customer360AmountComparisonDto;
  currencyFormatter: Intl.NumberFormat;
  t: (key: string) => string;
  noDataKey: string;
  showAmountBar?: boolean;
}): ReactElement {
  const recharts = useRechartsModule();
  const Recharts = recharts;
  const pieData = [
    { name: t('customer360.analyticsCharts.demand'), value: distribution.demandCount },
    { name: t('customer360.analyticsCharts.quotation'), value: distribution.quotationCount },
    { name: t('customer360.analyticsCharts.order'), value: distribution.orderCount },
  ].filter((d) => d.value > 0);

  const barData = [
    { name: t('customer360.analyticsCharts.last12MonthsOrderAmount'), value: amountComparison.last12MonthsOrderAmount },
    { name: t('customer360.analyticsCharts.openQuotationAmount'), value: amountComparison.openQuotationAmount },
    { name: t('customer360.analyticsCharts.openOrderAmount'), value: amountComparison.openOrderAmount },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
      <Card className="rounded-xl border border-slate-200 dark:border-white/10">
        <CardHeader>
          <CardTitle className="text-base">{t('customer360.analyticsCharts.distributionTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t(noDataKey)}</p>
          ) : !Recharts ? (
            <Skeleton className="h-64 w-full" />
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
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, index) => (
                      <Recharts.Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Recharts.Pie>
                  <Recharts.Tooltip formatter={(value: number | undefined) => [value ?? 0, '']} />
                </Recharts.PieChart>
              </Recharts.ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-slate-200 dark:border-white/10 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">{t('customer360.analyticsCharts.monthlyTrendTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!monthlyTrend?.length ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t(noDataKey)}</p>
          ) : !Recharts ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="h-64">
              <Recharts.ResponsiveContainer width="100%" height="100%">
                <Recharts.LineChart data={monthlyTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <Recharts.CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <Recharts.XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <Recharts.YAxis tick={{ fontSize: 11 }} />
                  <Recharts.Tooltip />
                  <Recharts.Legend />
                  <Recharts.Line type="monotone" dataKey="demandCount" name={t('customer360.analyticsCharts.demand')} stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
                  <Recharts.Line type="monotone" dataKey="quotationCount" name={t('customer360.analyticsCharts.quotation')} stroke={CHART_COLORS[1]} strokeWidth={2} dot={{ r: 3 }} />
                  <Recharts.Line type="monotone" dataKey="orderCount" name={t('customer360.analyticsCharts.order')} stroke={CHART_COLORS[2]} strokeWidth={2} dot={{ r: 3 }} />
                </Recharts.LineChart>
              </Recharts.ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {showAmountBar && (
        <Card className="rounded-xl border border-slate-200 dark:border-white/10 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">{t('customer360.analyticsCharts.amountComparisonTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {barData.every((d) => d.value === 0) ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{t(noDataKey)}</p>
            ) : !Recharts ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="h-64">
                <Recharts.ResponsiveContainer width="100%" height="100%">
                  <Recharts.BarChart data={barData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                    <Recharts.CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <Recharts.XAxis type="number" tickFormatter={(v) => currencyFormatter.format(v)} tick={{ fontSize: 11 }} />
                    <Recharts.YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 11 }} />
                    <Recharts.Tooltip formatter={(value: number | undefined) => [currencyFormatter.format(value ?? 0), '']} />
                    <Recharts.Bar dataKey="value" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
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

const ALL_CURRENCY = 'ALL';

export function Customer360Page(): ReactElement {
  const { customerId } = useParams<{ customerId: string }>();
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const id = Number(customerId ?? 0);
  const [currency, setCurrency] = useState<string>(ALL_CURRENCY);
  const [quickActivityOpen, setQuickActivityOpen] = useState(false);
  const createActivity = useCreateActivity();
  const currencyParam = currency === ALL_CURRENCY ? undefined : currency;
  const { data, isLoading, isError, error, refetch } = useCustomer360OverviewQuery(id, currencyParam);
  const { data: analytics, isLoading: isAnalyticsLoading, isError: isAnalyticsError } =
    useCustomer360AnalyticsSummaryQuery(id, currencyParam);
  const { data: chartsData, isLoading: isChartsLoading, isError: isChartsError } =
    useCustomer360AnalyticsChartsQuery(id, 12, currencyParam);
  const { data: cohortData, isLoading: isCohortLoading } = useCustomer360CohortQuery(id, 12);
  const { data: customerImages = [], isLoading: isImagesLoading, isError: isImagesError } = useCustomerImagesQuery(id);
  const executeActionMutation = useExecuteCustomer360ActionMutation(id);
  const apiBaseUrl = getApiBaseUrl().replace(/\/$/, '');
  const imageItems = useMemo(
    () =>
      customerImages.map((item) => ({
        ...item,
        src:
          item.imageUrl?.startsWith('http://') || item.imageUrl?.startsWith('https://')
            ? item.imageUrl
            : `${apiBaseUrl}${item.imageUrl?.startsWith('/') ? item.imageUrl : `/${item.imageUrl ?? ''}`}`,
      })),
    [customerImages, apiBaseUrl]
  );
  const currencyOptions = useMemo(() => {
    const set = new Set<string>();
    analytics?.totalsByCurrency?.forEach((r) => set.add(r.currency));
    chartsData?.amountComparisonByCurrency?.forEach((r) => (r.currency ? set.add(r.currency) : null));
    return [ALL_CURRENCY, ...Array.from(set).sort()];
  }, [analytics?.totalsByCurrency, chartsData?.amountComparisonByCurrency]);
  const isAllCurrencies = currency === ALL_CURRENCY;
  const quickActivityWindow = useMemo(() => getQuickActivityWindow(), []);
  const profile = data?.profile ?? { id: 0, name: '', customerCode: null };
  const handleQuickActivitySubmit = useCallback(
    async (formData: ActivityFormSchema): Promise<void> => {
      await createActivity.mutateAsync(
        buildCreateActivityPayload(formData, { assignedUserIdFallback: user?.id })
      );
      setQuickActivityOpen(false);
    },
    [createActivity, user?.id]
  );

  if (id <= 0) {
    return (
      <div className="container py-8">
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 p-8 text-center">
          <p className="text-muted-foreground">{t('customer360.notFound')}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <SectionSkeleton />
          <SectionSkeleton />
          <SectionSkeleton />
          <SectionSkeleton />
        </div>
      </div>
    );
  }

  if (isError) {
    const is404 =
      (error as { response?: { status?: number } })?.response?.status === 404 ||
      /not found|bulunamadı/i.test((error as Error)?.message ?? '');
    return (
      <div className="container py-8">
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 p-8 text-center space-y-4">
          <p className="text-muted-foreground">
            {is404 ? t('customer360.notFound') : t('customer360.error')}
          </p>
          {!is404 && (
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('customer360.retry')}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container py-8">
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 p-8 text-center">
          <p className="text-muted-foreground">{t('customer360.notFound')}</p>
        </div>
      </div>
    );
  }

  const kpi = data.kpis ?? {
    totalDemands: 0,
    totalQuotations: 0,
    totalOrders: 0,
    openQuotations: 0,
    openOrders: 0,
  };
  const timelineSorted = [...(data.timeline ?? [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const analyticsSummary = analytics ?? {
    last12MonthsOrderAmount: 0,
    openQuotationAmount: 0,
    openOrderAmount: 0,
    activityCount: 0,
    lastActivityDate: null,
    totalsByCurrency: [],
  };
  const lastActivityDateFormatted = analyticsSummary.lastActivityDate
    ? new Date(analyticsSummary.lastActivityDate).toLocaleDateString(i18n.language)
    : '-';
  const currencyFormatter = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const recommendedActions = data.recommendedActions ?? [];

  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={0}>
      <div className="container py-6 space-y-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">{t('customer360.title')}</h1>
            <p className="text-muted-foreground text-sm">
              {profile.name ?? ''}
              {profile.customerCode ? ` · ${profile.customerCode}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={() => setQuickActivityOpen(true)}
              className="h-10 rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white border-0 hover:text-white"
            >
              <Activity className="mr-2 h-4 w-4" />
              {t('customer360.quickActivity')}
            </Button>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-[180px]" size="default">
                <SelectValue placeholder={t('customer360.currencyFilter.label')} />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt === ALL_CURRENCY ? t('customer360.currencyFilter.all') : opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t('customer360.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('customer360.tabs.analytics')}</TabsTrigger>
          <TabsTrigger value="mailLogs">{t('customer360.tabs.mailLogs', { defaultValue: 'Mail Geçmişi' })}</TabsTrigger>
          <TabsTrigger value="images">{t('customer360.tabs.images', { defaultValue: 'Görseller' })}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card className="rounded-xl border border-slate-200 dark:border-white/10">
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('customer360.kpi.totalDemands')}
                </p>
                <p className="text-2xl font-bold mt-1">{kpi.totalDemands ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border border-slate-200 dark:border-white/10">
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('customer360.kpi.totalQuotations')}
                </p>
                <p className="text-2xl font-bold mt-1">{kpi.totalQuotations ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border border-slate-200 dark:border-white/10">
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('customer360.kpi.totalOrders')}
                </p>
                <p className="text-2xl font-bold mt-1">{kpi.totalOrders ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border border-slate-200 dark:border-white/10">
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('customer360.kpi.openQuotations')}
                </p>
                <p className="text-2xl font-bold mt-1">{kpi.openQuotations ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border border-slate-200 dark:border-white/10">
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('customer360.kpi.openOrders')}
                </p>
                <p className="text-2xl font-bold mt-1">{kpi.openOrders ?? 0}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <RevenueQualityPanel quality={data.revenueQuality} />
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
            {isCohortLoading ? (
              <SectionSkeleton />
            ) : (
              <CohortRetentionPanel rows={cohortData} />
            )}
            <SectionCard
              title={t('customer360.sections.contacts')}
              icon={User}
              items={data.contacts ?? []}
              emptyKey="common.noData"
              renderItem={(item) => <SimpleItemRow item={item as Customer360SimpleItemDto} />}
            />
            <SectionCard
              title={t('customer360.sections.shippingAddresses')}
              icon={MapPin}
              items={data.shippingAddresses ?? []}
              emptyKey="common.noData"
              renderItem={(item) => <SimpleItemRow item={item as Customer360SimpleItemDto} />}
            />
            <SectionCard
              title={t('customer360.sections.recentDemands')}
              icon={ClipboardList}
              items={data.recentDemands ?? []}
              emptyKey="common.noData"
              renderItem={(item) => <SimpleItemRow item={item as Customer360SimpleItemDto} />}
            />
            <SectionCard
              title={t('customer360.sections.recentQuotations')}
              icon={FileText}
              items={data.recentQuotations ?? []}
              emptyKey="common.noData"
              renderItem={(item) => <SimpleItemRow item={item as Customer360SimpleItemDto} />}
            />
            <SectionCard
              title={t('customer360.sections.recentOrders')}
              icon={ShoppingCart}
              items={data.recentOrders ?? []}
              emptyKey="common.noData"
              renderItem={(item) => <SimpleItemRow item={item as Customer360SimpleItemDto} />}
            />
            <SectionCard
              title={t('customer360.sections.recentActivities')}
              icon={Activity}
              items={data.recentActivities ?? []}
              emptyKey="common.noData"
              renderItem={(item) => <SimpleItemRow item={item as Customer360SimpleItemDto} />}
            />
          </div>

          <SectionCard
            title={t('customer360.sections.timeline')}
            icon={Clock}
            items={timelineSorted}
            emptyKey="common.noData"
            renderItem={(item) => <TimelineRow item={item as Customer360TimelineItemDto} />}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {isAnalyticsError ? (
            <Card className="rounded-xl border border-dashed border-slate-200 dark:border-white/10">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                {t('customer360.analytics.error')}
              </CardContent>
            </Card>
          ) : (
            <>
              <CustomerCurrencySummaryCards
                isAllCurrencies={isAllCurrencies}
                summary={analytics}
                totalsByCurrency={analytics?.totalsByCurrency ?? []}
                isLoading={isAnalyticsLoading}
                lastActivityDateFormatted={lastActivityDateFormatted}
              />

              {isAllCurrencies && (
                <CustomerAmountComparisonByCurrencyTable
                  rows={chartsData?.amountComparisonByCurrency ?? []}
                  isLoading={isChartsLoading}
                />
              )}

              {isChartsError ? (
                <Card className="rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                  <CardContent className="pt-6 text-sm text-muted-foreground">
                    {t('customer360.analytics.error')}
                  </CardContent>
                </Card>
              ) : isChartsLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card className="rounded-xl border border-slate-200 dark:border-white/10">
                    <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
                    <CardContent><Skeleton className="h-64 w-full" /></CardContent>
                  </Card>
                  <Card className="rounded-xl border border-slate-200 dark:border-white/10">
                    <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
                    <CardContent><Skeleton className="h-64 w-full" /></CardContent>
                  </Card>
                  <Card className="rounded-xl border border-slate-200 dark:border-white/10">
                    <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
                    <CardContent><Skeleton className="h-64 w-full" /></CardContent>
                  </Card>
                </div>
              ) : chartsData ? (
                <>
                  <AnalyticsChartsSection
                    distribution={chartsData.distribution}
                    monthlyTrend={chartsData.monthlyTrend}
                    amountComparison={chartsData.amountComparison}
                    currencyFormatter={currencyFormatter}
                    t={t}
                    noDataKey="common.noData"
                    showAmountBar={!isAllCurrencies}
                  />
                </>
              ) : null}
            </>
          )}
        </TabsContent>

        <TabsContent value="images" className="space-y-4">
          <Card className="rounded-xl border border-slate-200 dark:border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                {t('customer360.tabs.images', { defaultValue: 'Görseller' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isImagesLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-48 w-full rounded-lg" />
                  ))}
                </div>
              ) : isImagesError ? (
                <p className="text-sm text-muted-foreground">
                  {t('customer360.analytics.error')}
                </p>
              ) : imageItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('common.noData')}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {imageItems.map((img) => (
                    <a
                      key={img.id}
                      href={img.src}
                      target="_blank"
                      rel="noreferrer"
                      className="group block rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:shadow-md transition"
                    >
                      <img
                        src={img.src}
                        alt={img.imageDescription ?? `customer-image-${img.id}`}
                        className="h-44 w-full object-cover"
                        loading="lazy"
                      />
                      <div className="p-3">
                        <p className="text-sm font-medium line-clamp-2">
                          {img.imageDescription || t('customer360.tabs.images', { defaultValue: 'Kartvizit Görseli' })}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mailLogs" className="space-y-4">
          <CustomerMailLogsTab customerId={id} />
        </TabsContent>
      </Tabs>
        <ActivityForm
          open={quickActivityOpen}
          onOpenChange={setQuickActivityOpen}
          onSubmit={handleQuickActivitySubmit}
          isLoading={createActivity.isPending}
          initialStartDateTime={quickActivityWindow.start}
          initialEndDateTime={quickActivityWindow.end}
          initialPotentialCustomerId={profile.id || undefined}
          initialErpCustomerCode={profile.customerCode ?? undefined}
          initialCustomerDisplayName={profile.name ?? undefined}
        />
      </div>
    </TooltipProvider>
  );
}
