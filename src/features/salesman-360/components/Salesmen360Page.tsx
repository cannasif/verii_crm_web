import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronDown, CircleHelp, RefreshCw, LineChart, Target, Info, Loader2, BarChart3, TrendingUp, Zap, ChevronRight, Users, Coins, type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { matchesSearchTerm } from '@/lib/search';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useAuthStore } from '@/stores/auth-store';
import {
  useSalesmenOverviewQuery,
  useSalesmenAnalyticsSummaryQuery,
  useSalesmenAnalyticsChartsQuery,
  useSalesmenCohortQuery,
  useSalesmenErpMovementsQuery,
  useExecuteSalesmenActionMutation,
  useVisibleSalesmenQuery,
} from '../hooks/useSalesmen360';
import { SalesmenCurrencySummaryCards } from './SalesmenCurrencySummaryCards';
import { SalesmenAmountComparisonByCurrencyTable } from './SalesmenAmountComparisonByCurrencyTable';
import { SalesmenErpMovementsTabContent } from './SalesmenErpMovementsTabContent';
import { useRechartsModule } from '@/lib/useRechartsModule';
import type {
  CohortRetentionDto,
  RecommendedActionDto,
  RevenueQualityDto,
  Salesmen360DistributionDto,
  Salesmen360AmountComparisonDto,
  Salesmen360PeriodKey,
  Salesmen360VisibleUserDto,
} from '../types/salesmen360.types';
import { cn } from '@/lib/utils';
import { formatSalesmen360PeriodLabel, translateSalesmen360RfmSegment } from '../utils/localizedDisplay';
import { translateRecommendedActionCopy } from '../utils/recommendedActionsI18n';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';

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

const CHART_COLORS = ['#ec4899', '#f59e0b', '#8b5cf6'];
const SALESMAN_360_PERIOD_OPTIONS: Salesmen360PeriodKey[] = ['today', 'week', 'month', 'year'];
const ALL_SALESMEN_ROUTE_VALUE = 'all';
const ALL_SALESMEN_ID = 0;

type Salesmen360CurrencyFilterOption = {
  value: string;
  label: string;
  helper?: string;
};

type Salesmen360TabKey = 'overview' | 'analytics' | 'erpMovements';

const SALESMEN_360_FILTER_OUTER =
  'flex min-h-11 w-fit max-w-full items-stretch overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-sm ring-1 ring-slate-950/[0.03] dark:border-white/10 dark:bg-linear-to-br dark:from-[#1E1627]/95 dark:to-[#130822]/98 dark:ring-white/[0.05]';

const SALESMEN_360_FILTER_LABEL_SEGMENT =
  'flex shrink-0 items-center gap-2.5 border-r border-slate-200/80 bg-linear-to-b from-slate-50/98 to-slate-100/35 px-3 py-2 dark:border-white/10 dark:from-white/[0.07] dark:to-transparent';

const SALESMEN_360_FILTER_MICRO_LABEL =
  'max-w-[5rem] truncate text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:max-w-[7rem] dark:text-slate-400';

const SALESMEN_360_FILTER_TRIGGER =
  'h-11 min-h-11 w-full min-w-0 border-0 bg-transparent px-3 text-sm font-semibold text-slate-800 shadow-none transition-colors rounded-none rounded-r-2xl hover:bg-accent/50 focus:ring-0 focus:ring-offset-0 focus-visible:bg-accent/60 focus-visible:outline-none data-[state=open]:bg-accent/60 dark:text-white/95 dark:hover:bg-primary/10 dark:focus-visible:bg-primary/12 dark:data-[state=open]:bg-primary/12 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-slate-400 [&_svg]:opacity-80 dark:[&_svg]:text-slate-500';

const SALESMEN_360_FILTER_CONTENT =
  'z-50 max-h-72 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white/98 p-1.5 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#1E1627]/98';

const SALESMEN_360_FILTER_ITEM =
  'cursor-pointer rounded-xl py-2.5 pl-3 pr-9 text-sm font-medium text-slate-700 transition-colors focus:bg-accent focus:text-foreground data-[highlighted]:bg-accent/80 data-[highlighted]:text-foreground data-[selected=true]:bg-accent data-[selected=true]:text-foreground data-[state=checked]:bg-accent data-[state=checked]:text-primary dark:text-slate-200 dark:focus:bg-primary/12 dark:focus:text-slate-100 dark:data-[highlighted]:bg-primary/12 dark:data-[highlighted]:text-slate-100 dark:data-[selected=true]:bg-primary/12 dark:data-[selected=true]:text-primary dark:data-[state=checked]:bg-primary/15 dark:data-[state=checked]:text-primary';

const SALESMEN_360_FILTER_ICON_WRAP = {
  salesman:
    'border-indigo-200/90 bg-indigo-50 text-indigo-600 shadow-indigo-500/10 dark:border-indigo-400/25 dark:bg-indigo-500/12 dark:text-indigo-200',
  currency:
    'border-primary/20 bg-accent text-primary shadow-primary/10 dark:border-primary/40 dark:bg-accent/12 dark:text-primary',
  period:
    'border-amber-200/90 bg-amber-50 text-amber-600 shadow-amber-500/10 dark:border-amber-400/25 dark:bg-amber-500/12 dark:text-amber-200',
} as const;

function buildSalespersonOptionLabel(item: Salesmen360VisibleUserDto, meLabel: string): string {
  if (item.userId === ALL_SALESMEN_ID) {
    return item.fullName?.trim() || 'Tümü';
  }

  const fullName = item.fullName?.trim();
  const base =
    fullName && item.email
      ? `${fullName} (${item.email})`
      : fullName || item.email || String(item.userId);
  return item.isSelf ? `${base} • ${meLabel}` : base;
}

function Salesmen360SalespersonCombobox({
  visibleSalesmen,
  selectedUserId,
  selectedLabel,
  onSelectUserId,
  triggerClassName,
  outerClassName,
}: {
  visibleSalesmen: Salesmen360VisibleUserDto[];
  selectedUserId: number;
  selectedLabel: string | undefined;
  onSelectUserId: (userId: number) => void;
  triggerClassName: string;
  outerClassName: string;
}): ReactElement {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const meLabel = t('salesman360.salesmanFilter.me');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={outerClassName}>
        <PopoverAnchor asChild>
          <div className="flex min-w-0 w-full flex-1 items-stretch">
            <div className={SALESMEN_360_FILTER_LABEL_SEGMENT}>
              <div
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-xl border shadow-sm',
                  SALESMEN_360_FILTER_ICON_WRAP.salesman
                )}
              >
                <Users className="size-4" aria-hidden />
              </div>
              <span className={SALESMEN_360_FILTER_MICRO_LABEL}>{t('salesman360.salesmanFilter.label')}</span>
            </div>
            <PopoverTrigger asChild>
              <button
                type="button"
                role="combobox"
                aria-expanded={open}
                aria-haspopup="listbox"
                className={cn('flex min-w-0 items-center justify-between gap-2 text-left', triggerClassName)}
              >
                <span className="min-w-0 flex-1 truncate">{selectedLabel ?? String(selectedUserId)}</span>
                <ChevronDown className="size-4 shrink-0 text-slate-400 opacity-80 dark:text-slate-500" aria-hidden />
              </button>
            </PopoverTrigger>
          </div>
        </PopoverAnchor>
      </div>
      <PopoverContent
        align="start"
        alignOffset={0}
        side="bottom"
        sideOffset={6}
        className={cn(SALESMEN_360_FILTER_CONTENT, 'z-50 w-[min(22rem,calc(100vw-2rem))] max-h-[min(20rem,70dvh)] overflow-hidden p-0')}
      >
        <Command
          className="max-h-[min(18rem,65dvh)] rounded-none border-0 bg-transparent shadow-none [&_[cmdk-input-wrapper]]:border-b [&_[cmdk-input-wrapper]]:border-slate-200/80 dark:[&_[cmdk-input-wrapper]]:border-white/10"
          filter={(value, search) => {
            const uid = Number(value);
            const item = visibleSalesmen.find((u) => u.userId === uid);
            if (!item) {
              return 0;
            }
            return matchesSearchTerm(search, [item.fullName, item.email, item.userId]) ? 1 : 0;
          }}
        >
          <CommandInput
            placeholder={t('salesman360.salesmanFilter.searchPlaceholder')}
            className="h-10 border-0"
          />
          <CommandList>
            <CommandEmpty>{t('salesman360.salesmanFilter.noResults')}</CommandEmpty>
            <CommandGroup value="salesmen-360-visible" className="p-1.5">
              {visibleSalesmen.map((item) => (
                <CommandItem
                  key={item.userId}
                  value={String(item.userId)}
                  onSelect={(currentValue) => {
                    onSelectUserId(Number(currentValue));
                    setOpen(false);
                  }}
                  className={SALESMEN_360_FILTER_ITEM}
                >
                  {buildSalespersonOptionLabel(item, meLabel)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function CardTitleWithInfo({
  titleKey,
  explainKey,
  icon: Icon,
  iconClassName
}: {
  titleKey: string;
  explainKey: string;
  icon?: LucideIcon;
  iconClassName?: string;
}): ReactElement {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2.5">
      {Icon && (
        <div className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm transition-transform group-hover:scale-105",
          iconClassName || "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
        )}>
          <Icon className="size-4" />
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <span className="text-base font-bold text-slate-800 dark:text-white">{t(titleKey)}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex text-slate-400 hover:text-red-500 cursor-help transition-colors">
              <Info className="size-4 shrink-0" aria-hidden />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[280px] rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E1627] shadow-xl">
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

  const getScoreStyles = (val: number) => {
    if (val >= 70) return 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20';
    if (val >= 40) return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20';
    return 'text-primary bg-accent dark:text-primary dark:bg-primary/10 border-primary/15 dark:border-primary/20';
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5 last:border-0 group transition-all hover:px-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</span>
        {explainKey && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help text-slate-300 hover:text-slate-500 transition-colors">
                <CircleHelp className="size-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px] rounded-lg">{t(explainKey)}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold border transition-transform group-hover:scale-110", getScoreStyles(safeValue))}>
        {safeValue.toFixed(1)}
      </div>
    </div>
  );
}

function RevenueQualityPanel({ quality }: { quality: RevenueQualityDto | null | undefined }): ReactElement {
  const { t } = useTranslation();
  return (
    <Card className="rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/3 shadow-sm overflow-hidden relative group">
      <div className="pt-3 pb-2.5 px-5 border-b border-slate-100 dark:border-white/5">
        <CardTitleWithInfo
          titleKey="salesman360.revenueQuality.title"
          explainKey="salesman360.explain.revenueQualityTitle"
          icon={TrendingUp}
          iconClassName="bg-accent dark:bg-primary/10 border-primary/15 dark:border-primary/20 text-red-600 dark:text-red-400"
        />
      </div>
      <CardContent className="px-5 pt-2 pb-5">
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
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5 last:border-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('salesman360.revenueQuality.segment')}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-help text-slate-300 hover:text-slate-500 transition-colors">
                    <CircleHelp className="size-3.5" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[260px] rounded-lg">{t('salesman360.explain.rfmSegment')}</TooltipContent>
              </Tooltip>
            </div>
            <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-xs font-bold text-slate-700 dark:text-white border border-slate-200 dark:border-white/10">
              {translateSalesmen360RfmSegment(quality?.rfmSegment ?? null, t)}
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 italic flex items-center gap-1.5">
          <Zap className="size-3.5 text-red-500/50" />
          {t('salesman360.explain.modelNote')}
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
  const { t, i18n } = useTranslation();
  const first = rows?.[0];
  const cohortLabel = first?.cohortKey
    ? formatSalesmen360PeriodLabel(first.cohortKey, i18n.language)
    : '';

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/3 shadow-sm overflow-hidden group">
      <div className="border-b border-slate-100 px-5 pb-2.5 pt-3 dark:border-white/5">
        <CardTitleWithInfo
          titleKey="salesman360.cohort.title"
          explainKey="salesman360.explain.cohortRetentionTitle"
          icon={Users}
          iconClassName="bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
        />
      </div>
      <CardContent className="px-5 pt-2 pb-5">
        {!first?.points?.length ? (
          <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
            <BarChart3 className="size-8 opacity-20" />
            <p className="text-sm font-medium">{t('salesman360.explain.noCohortData')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('salesman360.cohort.cohortKey')}</span>
              <span className="text-sm font-bold text-red-600 dark:text-red-400">{cohortLabel || first.cohortKey}</span>
            </div>
            <div className="max-h-60 overflow-auto pr-1 custom-scrollbar space-y-1">
              {first.points.map((point) => (
                <div key={`${point.periodMonth}-${point.periodIndex}`} className="flex items-center justify-between text-sm py-2 px-1 border-b border-slate-50 dark:border-white/5 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/5 rounded-lg transition-colors group">
                  <span className="font-medium text-slate-600 dark:text-slate-400">
                    {formatSalesmen360PeriodLabel(point.periodMonth, i18n.language)}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden hidden sm:block">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${point.retentionRate}%` }} />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-white min-w-[50px] text-right">{point.retentionRate.toFixed(1)}%</span>
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
    <Card className="rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/3 shadow-sm overflow-hidden group">
      <div className="pt-3 pb-2.5 px-5 border-b border-slate-100 dark:border-white/5">
        <CardTitleWithInfo
          titleKey="salesman360.actions.title"
          explainKey="salesman360.explain.recommendedActionsTitle"
          icon={Zap}
          iconClassName="bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20 text-orange-600 dark:text-orange-400"
        />
      </div>
      <CardContent className="px-5 pt-2 pb-5">
        {rows.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Target className="size-8 opacity-20" />
            <p className="text-sm font-medium">{t('salesman360.actions.empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((action) => {
              const { title, reason } = translateRecommendedActionCopy(action, t);
              return (
                <div key={`${action.actionCode}-${action.title}`} className="group relative rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <p className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                        {title}
                      </p>
                      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium pl-3.5">{reason}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onExecute(action)}
                      disabled={busy}
                      className="shrink-0 h-9 rounded-xl border-0 bg-[image:var(--crm-brand-gradient)] px-4 font-bold text-white shadow-[0_4px_14px_-6px_var(--crm-brand-shadow)] transition-all hover:-translate-y-0.5 hover:text-white hover:shadow-[0_6px_20px_-6px_var(--crm-brand-shadow)] active:translate-y-0 gap-1.5"
                    >
                      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
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

function DistributionAndTrendCharts({
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
  monthlyTrend: { month: string; demandCount: number; quotationCount: number; orderCount: number }[];
  amountComparison: Salesmen360AmountComparisonDto;
  isSingleCurrency: boolean;
  currencyFormatter: Intl.NumberFormat;
  t: (key: string) => string;
  locale: string;
  noDataKey: string;
  chartsEnabled?: boolean;
}): ReactElement {
  const recharts = useRechartsModule(chartsEnabled);
  const Recharts = recharts;
  const pieData = [
    { name: t('salesman360.analyticsCharts.demand'), value: distribution.demandCount },
    { name: t('salesman360.analyticsCharts.quotation'), value: distribution.quotationCount },
    { name: t('salesman360.analyticsCharts.order'), value: distribution.orderCount },
  ].filter((d) => d.value > 0);

  const singleBarData = [
    { name: t('salesman360.analyticsCharts.last12MonthsOrderAmount'), value: amountComparison.last12MonthsOrderAmount },
    { name: t('salesman360.analyticsCharts.openQuotationAmount'), value: amountComparison.openQuotationAmount },
    { name: t('salesman360.analyticsCharts.openOrderAmount'), value: amountComparison.openOrderAmount },
  ];
  const hasSingleBarData = singleBarData.some((d) => d.value > 0);

  return (
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
      <Card className="rounded-2xl border border-slate-200 bg-white/80 p-1 dark:border-white/10 dark:bg-white/3 shadow-sm overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-base font-bold text-slate-800 dark:text-white">{t('salesman360.analyticsCharts.distributionTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {pieData.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-2 text-slate-400">
              <TrendingUp className="size-10 opacity-10" />
              <p className="text-sm font-medium">{t(noDataKey)}</p>
            </div>
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
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    stroke="none"
                  >
                    {pieData.map((_, i) => (
                      <Recharts.Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Recharts.Pie>
                  <Recharts.Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: '#1e293b', fontWeight: '600' }}
                    formatter={(v: number | undefined) => [v ?? 0, '']}
                  />
                </Recharts.PieChart>
              </Recharts.ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-slate-200 bg-white/80 p-1 dark:border-white/10 dark:bg-white/3 shadow-sm overflow-hidden lg:col-span-2">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-base font-bold text-slate-800 dark:text-white">{t('salesman360.analyticsCharts.monthlyTrendTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {!monthlyTrend?.length ? (
            <div className="py-20 flex flex-col items-center gap-2 text-slate-400">
              <TrendingUp className="size-10 opacity-10" />
              <p className="text-sm font-medium">{t(noDataKey)}</p>
            </div>
          ) : !Recharts ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : (
            <div className="h-64">
              <Recharts.ResponsiveContainer width="100%" height="100%">
                <Recharts.LineChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <Recharts.CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-white/5" />
                  <Recharts.XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    dy={10}
                    tickFormatter={(v) => formatSalesmen360PeriodLabel(String(v), locale)}
                  />
                  <Recharts.YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Recharts.Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                    labelFormatter={(label) => formatSalesmen360PeriodLabel(String(label), locale)}
                  />
                  <Recharts.Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: '600' }} />
                  <Recharts.Line type="monotone" dataKey="demandCount" name={t('salesman360.analyticsCharts.demand')} stroke={CHART_COLORS[0]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                  <Recharts.Line type="monotone" dataKey="quotationCount" name={t('salesman360.analyticsCharts.quotation')} stroke={CHART_COLORS[1]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                  <Recharts.Line type="monotone" dataKey="orderCount" name={t('salesman360.analyticsCharts.order')} stroke={CHART_COLORS[2]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                </Recharts.LineChart>
              </Recharts.ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {isSingleCurrency && (
        <Card className="rounded-2xl border border-slate-200 bg-white/80 p-1 dark:border-white/10 dark:bg-white/3 shadow-sm overflow-hidden lg:col-span-3">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-base font-bold text-slate-800 dark:text-white">{t('salesman360.analyticsCharts.amountComparisonTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {!hasSingleBarData ? (
              <div className="py-20 flex flex-col items-center gap-2 text-slate-400">
                <Target className="size-10 opacity-10" />
                <p className="text-sm font-medium">{t(noDataKey)}</p>
              </div>
            ) : !Recharts ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : (
              <div className="h-64">
                <Recharts.ResponsiveContainer width="100%" height="100%">
                  <Recharts.BarChart data={singleBarData} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 5 }}>
                    <Recharts.CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-slate-100 dark:stroke-white/5" />
                    <Recharts.XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(v) => currencyFormatter.format(v)} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Recharts.YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: '600', fill: '#475569' }} />
                    <Recharts.Tooltip cursor={{ fill: 'transparent' }} formatter={(v: number | undefined) => [currencyFormatter.format(v ?? 0), '']} />
                    <Recharts.Bar dataKey="value" fill={CHART_COLORS[0]} radius={[0, 10, 10, 0]} barSize={32}>
                      {singleBarData.map((_, i) => (
                        <Recharts.Cell key={i} fill={i === 0 ? '#ec4899' : i === 1 ? '#f59e0b' : '#8b5cf6'} />
                      ))}
                    </Recharts.Bar>
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
  const showErpMovementsTab = !isAllSalesmen && userId > 0;
  const { data: summary, isLoading: isSummaryLoading, isError: isSummaryError } = useSalesmenAnalyticsSummaryQuery(userId, currencyParam, periodParams, activeTab === 'analytics');
  const { data: charts, isLoading: isChartsLoading, isError: isChartsError } = useSalesmenAnalyticsChartsQuery(userId, 12, currencyParam, periodParams, activeTab === 'analytics');
  const {
    data: erpMovements = [],
    isLoading: isErpMovementsLoading,
    isError: isErpMovementsError,
  } = useSalesmenErpMovementsQuery(userId, activeTab === 'erpMovements' && showErpMovementsTab);
  const { data: cohortData, isLoading: isCohortLoading } = useSalesmenCohortQuery(userId, 12);
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
    if (isAllSalesmen && activeTab !== 'overview') {
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

  const kpis = overview.kpis;
  const subtitle = [overview.fullName ?? '', overview.email ?? ''].filter(Boolean).join(' · ') || '';
  const recommendedActions = overview.recommendedActions ?? [];
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
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-accent shadow-inner dark:border-primary/30 dark:bg-primary/10">
              <LineChart className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
                {t('salesman360.title')}
              </h1>
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium">
                <span>{subtitle || t('salesman360.subtitle')}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-3">
            {visibleSalesmen.length > 1 && selectedSalesmanValue && (
              <Salesmen360SalespersonCombobox
                outerClassName={cn(
                  SALESMEN_360_FILTER_OUTER,
                  'min-w-0 w-full sm:w-auto sm:min-w-[min(20rem,calc(100vw-2rem))] sm:max-w-[22rem]'
                )}
                visibleSalesmen={salespersonOptions}
                selectedUserId={userId}
                selectedLabel={selectedSalesmanLabel}
                onSelectUserId={(id) => navigate(id === ALL_SALESMEN_ID ? '/salesmen-360/all' : `/salesmen-360/${id}`)}
                triggerClassName={cn(SALESMEN_360_FILTER_TRIGGER, 'w-full min-w-0 sm:min-w-[11rem]')}
              />
            )}

            <div className={cn(SALESMEN_360_FILTER_OUTER, 'min-w-0 sm:min-w-[10.5rem]')}>
              <div className={SALESMEN_360_FILTER_LABEL_SEGMENT}>
                <div
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-xl border shadow-sm',
                    SALESMEN_360_FILTER_ICON_WRAP.currency
                  )}
                >
                  <Target className="size-4" aria-hidden />
                </div>
                <span className={SALESMEN_360_FILTER_MICRO_LABEL}>{t('salesman360.currencyFilter.label')}</span>
              </div>
              <div className="flex min-w-0 flex-1">
                <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                  <SelectTrigger className={cn(SALESMEN_360_FILTER_TRIGGER, 'w-full min-w-[6.5rem]')}>
                    <span className="min-w-0 truncate">
                      {selectedCurrencyOption?.label ?? t('salesman360.currencyFilter.all')}
                    </span>
                  </SelectTrigger>
                  <SelectContent sideOffset={6} className={SALESMEN_360_FILTER_CONTENT}>
                    {currencyOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} textValue={opt.label} className={SALESMEN_360_FILTER_ITEM}>
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate">{opt.label}</span>
                          {opt.helper && <span className="truncate text-[11px] font-semibold text-slate-400 dark:text-slate-500">{opt.helper}</span>}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={cn(SALESMEN_360_FILTER_OUTER, 'min-w-0 sm:min-w-[11rem]')}>
              <div className={SALESMEN_360_FILTER_LABEL_SEGMENT}>
                <div
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-xl border shadow-sm',
                    SALESMEN_360_FILTER_ICON_WRAP.period
                  )}
                >
                  <CalendarDays className="size-4" aria-hidden />
                </div>
                <span className={SALESMEN_360_FILTER_MICRO_LABEL}>{t('salesman360.periodFilter.label')}</span>
              </div>
              <div className="flex min-w-0 flex-1">
                <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as Salesmen360PeriodKey)}>
                  <SelectTrigger className={cn(SALESMEN_360_FILTER_TRIGGER, 'w-full min-w-[6.75rem]')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent sideOffset={6} className={SALESMEN_360_FILTER_CONTENT}>
                    {SALESMAN_360_PERIOD_OPTIONS.map((period) => (
                      <SelectItem key={period} value={period} className={SALESMEN_360_FILTER_ITEM}>
                        {t(`salesman360.periodFilter.${period}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Salesmen360TabKey)} className="space-y-6">
          <div className="flex justify-center sm:justify-start">
            <TabsList className="h-11 p-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl shadow-inner">
              <TabsTrigger
                value="overview"
                className="rounded-xl px-6 font-bold text-muted-foreground transition-all data-[state=active]:bg-accent data-[state=active]:text-primary data-[state=active]:shadow-sm dark:data-[state=active]:bg-primary/12 dark:data-[state=active]:text-primary"
              >
                {t('salesman360.tabs.overview')}
              </TabsTrigger>
              {!isAllSalesmen && (
                <TabsTrigger
                  value="analytics"
                  className="rounded-xl px-6 font-bold text-muted-foreground transition-all data-[state=active]:bg-accent data-[state=active]:text-primary data-[state=active]:shadow-sm dark:data-[state=active]:bg-primary/12 dark:data-[state=active]:text-primary"
                >
                  {t('salesman360.tabs.analytics')}
                </TabsTrigger>
              )}
              {showErpMovementsTab && (
                <TabsTrigger
                  value="erpMovements"
                  className="rounded-xl px-6 font-bold text-muted-foreground transition-all data-[state=active]:bg-accent data-[state=active]:text-primary data-[state=active]:shadow-sm dark:data-[state=active]:bg-primary/12 dark:data-[state=active]:text-primary"
                >
                  {t('salesman360.tabs.erpMovements')}
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6 outline-none">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <Card
                role="button"
                tabIndex={0}
                onClick={navigateToDemands}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigateToDemands();
                  }
                }}
                className="group cursor-pointer rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/3 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent dark:bg-primary/10 border border-primary/20 dark:border-primary/20 shadow-sm transition-transform">
                      <ChevronRight className="size-4 text-red-600 dark:text-red-400" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{t('salesman360.kpi.totalDemands')}</p>
                  </div>
                  <p className="text-2xl font-black mt-2.5 text-slate-900 dark:text-white tabular-nums pl-10.5">{kpis.totalDemands ?? 0}</p>
                </CardContent>
              </Card>
              <Card
                role="button"
                tabIndex={0}
                onClick={navigateToQuotations}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigateToQuotations();
                  }
                }}
                className="group cursor-pointer rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/3 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 shadow-sm transition-transform">
                      <Zap className="size-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{t('salesman360.kpi.totalQuotations')}</p>
                  </div>
                  <p className="text-2xl font-black mt-2.5 text-slate-900 dark:text-white tabular-nums pl-10.5">{kpis.totalQuotations ?? 0}</p>
                </CardContent>
              </Card>
              <Card
                role="button"
                tabIndex={0}
                onClick={navigateToOrders}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigateToOrders();
                  }
                }}
                className="group cursor-pointer rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/3 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 shadow-sm transition-transform">
                      <Target className="size-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{t('salesman360.kpi.totalOrders')}</p>
                  </div>
                  <p className="text-2xl font-black mt-2.5 text-slate-900 dark:text-white tabular-nums pl-10.5">{kpis.totalOrders ?? 0}</p>
                </CardContent>
              </Card>
              <Card
                role="button"
                tabIndex={0}
                onClick={navigateToActivities}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigateToActivities();
                  }
                }}
                className="group cursor-pointer rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/3 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 shadow-sm transition-transform">
                      <Users className="size-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{t('salesman360.kpi.totalActivities')}</p>
                  </div>
                  <p className="text-2xl font-black mt-2.5 text-slate-900 dark:text-white tabular-nums pl-10.5">{kpis.totalActivities ?? 0}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <RevenueQualityPanel quality={overview.revenueQuality} />
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
              {isCohortLoading ? <KpiCardSkeleton /> : <CohortRetentionPanel rows={cohortData} />}

              {overviewTotalsByCurrency.length > 0 && (
                <Card className="rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/3 shadow-sm overflow-hidden group">
                  <div className="pt-3 pb-2.5 px-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 shadow-sm transition-transform group-hover:scale-105">
                      <Coins className="size-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-base font-bold text-slate-800 dark:text-white">{t('salesman360.currencyTotals.title')}</span>
                  </div>
                  <CardContent className="p-0">
                    <div className="overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="dark:bg-[#231A2C] border-b-0">
                            <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white h-12 py-3 border-r border-slate-100 dark:border-white/5">{t('salesman360.currencyTotals.currency')}</TableHead>
                            <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white h-12 border-r border-slate-100 dark:border-white/5">{t('salesman360.currencyTotals.demandAmount')}</TableHead>
                            <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white h-12 border-r border-slate-100 dark:border-white/5">{t('salesman360.currencyTotals.quotationAmount')}</TableHead>
                            <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white h-12">{t('salesman360.currencyTotals.orderAmount')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {overviewTotalsByCurrency.map((row) => (
                            <TableRow key={row.currency} className="hover:bg-accent/30 dark:hover:bg-accent/5 transition-colors border-b border-slate-50 dark:border-white/5 last:border-0">
                              <TableCell className="font-bold text-slate-700 dark:text-white border-r border-slate-100 dark:border-white/5">{row.currency}</TableCell>
                              <TableCell className="text-right tabular-nums font-medium border-r border-slate-100 dark:border-white/5">{currencyFormatter.format(row.demandAmount ?? 0)}</TableCell>
                              <TableCell className="text-right tabular-nums font-medium border-r border-slate-100 dark:border-white/5">{currencyFormatter.format(row.quotationAmount ?? 0)}</TableCell>
                              <TableCell className="text-right tabular-nums font-medium">{currencyFormatter.format(row.orderAmount ?? 0)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {!isAllCurrencies && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Card className="rounded-2xl border border-slate-200 bg-white/80 p-1 dark:border-white/10 dark:bg-white/3 shadow-sm overflow-hidden border-l-primary border-l-4">
                  <CardContent className="pt-4 pb-3 px-6">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('salesman360.kpi.totalDemandAmount')}</p>
                    <p className="text-2xl font-black mt-2 text-slate-900 dark:text-white">{currencyFormatter.format(kpis.totalDemandAmount ?? 0)}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border border-slate-200 bg-white/80 p-1 dark:border-white/10 dark:bg-white/3 shadow-sm overflow-hidden border-l-orange-500 border-l-4">
                  <CardContent className="pt-4 pb-3 px-6">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('salesman360.kpi.totalQuotationAmount')}</p>
                    <p className="text-2xl font-black mt-2 text-slate-900 dark:text-white">{currencyFormatter.format(kpis.totalQuotationAmount ?? 0)}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border border-slate-200 bg-white/80 p-1 dark:border-white/10 dark:bg-white/3 shadow-sm overflow-hidden border-l-emerald-500 border-l-4">
                  <CardContent className="pt-4 pb-3 px-6">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('salesman360.kpi.totalOrderAmount')}</p>
                    <p className="text-2xl font-black mt-2 text-slate-900 dark:text-white">{currencyFormatter.format(kpis.totalOrderAmount ?? 0)}</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

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
