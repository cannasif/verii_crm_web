import { type ReactElement, type ChangeEvent, useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  CircleHelp,
  RefreshCw,
  User,
  MapPin,
  FileText,
  ClipboardList,
  ShoppingCart,
  Activity,
  Clock,
  Image as ImageIcon,
  Phone,
  Mail,
  MessageCircle,
  Building2,
  CalendarDays,
  Plus,
  ChevronRight,
  ExternalLink,
  Upload,
  Trash2,
  Globe,
  BadgeCheck,
  Pencil,
  MoreVertical,
  Package,
  Send,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  useCustomer360QuickQuotationsQuery,
  useCustomer360ErpBalanceQuery,
  useCustomer360ErpMovementsQuery,
  useCustomerImagesQuery,
  useUploadCustomerImagesMutation,
  useDeleteCustomerImageMutation,
  useExecuteCustomer360ActionMutation,
} from '../hooks/useCustomer360';
import { useCustomer } from '@/features/customer-management/hooks/useCustomer';
import { useUpdateCustomer } from '@/features/customer-management/hooks/useUpdateCustomer';
import { CustomerForm } from '@/features/customer-management/components/CustomerForm';
import {
  CustomerQuotationsTab,
  CustomerOrdersTab,
  CustomerActivitiesTab,
} from './Customer360RelatedTabs';
import { CustomerErpOrdersTab, useCanViewCustomerErpOrders } from './CustomerErpOrdersTab';
import type { CustomerDto, CustomerFormData } from '@/features/customer-management/types/customer-types';
import { CustomerCurrencySummaryCards } from './CustomerCurrencySummaryCards';
import { CustomerAmountComparisonByCurrencyTable } from './CustomerAmountComparisonByCurrencyTable';
import { CustomerMailLogsTab } from './CustomerMailLogsTab';
import { useRechartsModule } from '@/lib/useRechartsModule';
import { getApiBaseUrl } from '@/lib/axios';
import { formatSystemDate, formatSystemNumber } from '@/lib/system-settings';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { ActivityForm } from '@/features/activity-management/components/ActivityForm';
import { activityImageApi } from '@/features/activity-image-management/api/activity-image-api';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateActivity } from '@/features/activity-management/hooks/useCreateActivity';
import { useUpdateActivity } from '@/features/activity-management/hooks/useUpdateActivity';
import { useActivity } from '@/features/activity-management/hooks/useActivity';
import { buildCreateActivityPayload } from '@/features/activity-management/utils/build-create-payload';
import { buildUpdateActivityPayload } from '@/features/activity-management/utils/build-update-payload';
import { persistActivityFormImages } from '@/features/activity-management/utils/persist-activity-form-images';
import type { ActivityFormSchema } from '@/features/activity-management/types/activity-types';
import type {
  CohortRetentionDto,
  Customer360SimpleItemDto,
  Customer360TimelineItemDto,
  Customer360DistributionDto,
  Customer360AmountComparisonDto,
  Customer360QuickQuotationDto,
  Customer360ErpBalanceDto,
  Customer360ErpMovementDto,
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

const MODERN_CARD_CLASS =
  'group relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-300 ' +
  'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-rose-500/40 before:to-transparent before:opacity-60 before:transition-opacity ' +
  'after:pointer-events-none after:absolute after:-right-16 after:-top-16 after:h-32 after:w-32 after:rounded-full after:bg-rose-500/[0.06] after:blur-2xl after:transition-opacity after:duration-300 after:opacity-0 ' +
  'hover:-translate-y-0.5 hover:border-rose-500/30 hover:shadow-[0_12px_34px_-16px_rgba(236,72,153,0.4)] hover:before:opacity-100 hover:after:opacity-100';

const MODERN_ICON_CHIP_CLASS =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-rose-500/15 to-amber-500/10 text-rose-500 ring-1 ring-inset ring-rose-500/15 transition-all group-hover:from-rose-500/25 group-hover:to-amber-500/15 group-hover:ring-rose-500/30';

function SectionSkeleton(): ReactElement {
  return (
    <Card className="rounded-2xl border border-border/60">
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
    <Card className={MODERN_CARD_CLASS}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2.5 text-sm font-semibold">
          <span className={MODERN_ICON_CHIP_CLASS}>
            <Icon className="h-4 w-4" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!items?.length ? (
          <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 py-5 text-center text-sm text-muted-foreground">
            {t(emptyKey)}
          </p>
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

function SimpleItemRow({
  item,
  onClick,
  currencyFormatter,
}: {
  item: Customer360SimpleItemDto;
  onClick?: () => void;
  currencyFormatter?: Intl.NumberFormat;
}): ReactElement {
  const { t, i18n } = useTranslation();
  const label = item.title || `#${item.id}`;
  const date = item.date ? new Date(item.date).toLocaleDateString(i18n.language) : null;
  const statusLabel = item.status ? translateStatus(t, item.status) : null;
  const amountLabel =
    item.amount != null && currencyFormatter ? currencyFormatter.format(item.amount) : null;

  const content = (
    <>
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-foreground">{label}</span>
        {(item.subtitle || statusLabel) && (
          <span className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            {item.subtitle && <span className="truncate">{item.subtitle}</span>}
            {item.subtitle && statusLabel && <span className="opacity-40">·</span>}
            {statusLabel && <span className="truncate">{statusLabel}</span>}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        {amountLabel && <span className="text-sm font-semibold tabular-nums">{amountLabel}</span>}
        {date && <span className="hidden text-xs text-muted-foreground sm:inline">{date}</span>}
        {onClick && (
          <ChevronRight className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        )}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group flex w-full items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2 text-left transition-all hover:border-rose-500/40 hover:bg-muted/50 hover:shadow-xs"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2">
      {content}
    </div>
  );
}

function translateStatus(t: (key: string, opts?: { ns?: string }) => string, status: string): string {
  const MISSING_TRANSLATION = 'Çeviri eksik';
  const raw = String(status).trim();
  if (!raw) return raw;
  const candidates = [`status.${raw}`, `status.${raw.toLowerCase()}`];
  for (const key of candidates) {
    const translated = t(key, { ns: 'customer360' });
    if (translated && translated !== key && translated !== MISSING_TRANSLATION) return translated;
  }
  return raw;
}

function TimelineRow({ item }: { item: Customer360TimelineItemDto }): ReactElement {
  const { t, i18n } = useTranslation();
  const date = new Date(item.date).toLocaleString(i18n.language, { dateStyle: 'short', timeStyle: 'short' });
  const statusLabel = item.status ? translateStatus(t, item.status) : null;
  return (
    <div className="flex gap-3 py-2 border-b border-border/50 last:border-0">
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

function CardTitleWithInfo({ titleKey, explainKey, ns = 'customer360' }: { titleKey: string; explainKey: string; ns?: string }): ReactElement {
  const { t } = useTranslation(ns);
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
  const { t } = useTranslation('customer360');
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
  const { t } = useTranslation('customer360');
  const tc = (key: string, opts?: Record<string, unknown>) => t(key, opts);
  return (
    <Card className={MODERN_CARD_CLASS}>
      <CardHeader>
        <CardTitle className="text-base">
          <CardTitleWithInfo
            titleKey="revenueQuality.title"
            explainKey="explain.revenueQualityTitle"
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <ScoreRow
          label={tc('revenueQuality.churnRisk')}
          value={quality?.churnRiskScore}
          explainKey="explain.churnRisk"
        />
        <ScoreRow
          label={tc('revenueQuality.upsell')}
          value={quality?.upsellPropensityScore}
          explainKey="explain.upsellPropensity"
        />
        <ScoreRow
          label={tc('revenueQuality.payment')}
          value={quality?.paymentBehaviorScore}
          explainKey="explain.paymentBehavior"
        />
        <div className="flex items-center justify-between text-sm py-1.5 pt-1">
          <span className="flex items-center gap-1 text-muted-foreground">
            {tc('revenueQuality.segment')}:{' '}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
                  <CircleHelp className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px]">
                {tc('explain.rfmSegment')}
              </TooltipContent>
            </Tooltip>
          </span>
          <span className="font-medium">{quality?.rfmSegment ?? '-'}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">{tc('revenueQuality.ltv')}: </span>
          <span className="font-medium">{quality?.ltv ?? 0}</span>
        </div>
        {quality?.dataQualityNote ? <p className="text-xs text-muted-foreground pt-2">{quality.dataQualityNote}</p> : null}
        <p className="text-xs text-muted-foreground border-t border-border/50 mt-2 pt-2">
          {tc('explain.modelNote')}
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
  const { t } = useTranslation('customer360');
  const tc = (key: string, opts?: Record<string, unknown>) => t(key, opts);
  const first = rows?.[0];
  return (
    <Card className={MODERN_CARD_CLASS}>
      <CardHeader>
        <CardTitle className="text-base">
          <CardTitleWithInfo
            titleKey="cohort.title"
            explainKey="explain.cohortRetentionTitle"
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!first?.points?.length ? (
          <p className="text-sm text-muted-foreground">
            {tc('explain.noCohortData')}
          </p>
        ) : (
          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">{tc('cohort.cohortKey')}: </span>
              <span className="font-medium">{first.cohortKey}</span>
            </div>
            <div className="max-h-56 overflow-auto space-y-1">
              {first.points.map((point) => (
                <div key={`${point.periodMonth}-${point.periodIndex}`} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
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
  const { t } = useTranslation(['customer360', 'common']);
  const tc = (key: string, opts?: Record<string, unknown>) => t(key, { ns: 'customer360', ...opts });
  return (
    <Card className={MODERN_CARD_CLASS}>
      <CardHeader>
        <CardTitle className="text-base">
          <CardTitleWithInfo
            titleKey="actions.title"
            explainKey="explain.recommendedActionsTitle"
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tc('actions.empty')}</p>
        ) : (
          <div className="space-y-3">
            {rows.map((action) => {
              const actionKey = recommendedActionCodeToKey(action.actionCode);
              const title = tc(`actions.recommendedActions.${actionKey}.title`, { defaultValue: action.title });
              const reason = tc(`actions.recommendedActions.${actionKey}.reason`, { defaultValue: action.reason ?? '-' });
              return (
              <div key={`${action.actionCode}-${action.title}`} className="group/action relative overflow-hidden rounded-xl border border-border/70 bg-muted/20 p-3 transition-all hover:border-rose-500/30 hover:bg-muted/40 hover:shadow-sm">
                <span className="pointer-events-none absolute inset-y-0 left-0 w-0.5 bg-linear-to-b from-rose-500 to-amber-500 opacity-0 transition-opacity group-hover/action:opacity-100" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{reason}</p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Button size="sm" onClick={() => onExecute(action)} disabled={busy} className="rounded-lg border-0 bg-[image:var(--crm-brand-gradient)] shadow-[0_4px_14px_-6px_var(--crm-brand-shadow)] hover:shadow-[0_6px_20px_-6px_var(--crm-brand-shadow)] text-white transition-all hover:-translate-y-0.5 hover:text-white hover:shadow-md">
                          {tc('actions.execute')}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px]">
                      {tc('explain.executeAction')}
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
  tc,
  noDataKey,
  showAmountBar = true,
  chartsEnabled = true,
}: {
  distribution: Customer360DistributionDto;
  monthlyTrend: { month: string; demandCount: number; quotationCount: number; orderCount: number }[];
  amountComparison: Customer360AmountComparisonDto;
  currencyFormatter: Intl.NumberFormat;
  t: (key: string) => string;
  tc: (key: string, opts?: Record<string, unknown>) => string;
  noDataKey: string;
  showAmountBar?: boolean;
  chartsEnabled?: boolean;
}): ReactElement {
  const recharts = useRechartsModule(chartsEnabled);
  const Recharts = recharts;
  const pieData = [
    { name: tc('analyticsCharts.demand'), value: distribution.demandCount },
    { name: tc('analyticsCharts.quotation'), value: distribution.quotationCount },
    { name: tc('analyticsCharts.order'), value: distribution.orderCount },
  ].filter((d) => d.value > 0);

  const barData = [
    { name: tc('analyticsCharts.last12MonthsOrderAmount'), value: amountComparison.last12MonthsOrderAmount },
    { name: tc('analyticsCharts.openQuotationAmount'), value: amountComparison.openQuotationAmount },
    { name: tc('analyticsCharts.openOrderAmount'), value: amountComparison.openOrderAmount },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
      <Card className={MODERN_CARD_CLASS}>
        <CardHeader>
          <CardTitle className="text-base">{tc('analyticsCharts.distributionTitle')}</CardTitle>
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

      <Card className={cn(MODERN_CARD_CLASS, 'lg:col-span-2')}>
        <CardHeader>
          <CardTitle className="text-base">{tc('analyticsCharts.monthlyTrendTitle')}</CardTitle>
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
                  <Recharts.Line type="monotone" dataKey="demandCount" name={tc('analyticsCharts.demand')} stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
                  <Recharts.Line type="monotone" dataKey="quotationCount" name={tc('analyticsCharts.quotation')} stroke={CHART_COLORS[1]} strokeWidth={2} dot={{ r: 3 }} />
                  <Recharts.Line type="monotone" dataKey="orderCount" name={tc('analyticsCharts.order')} stroke={CHART_COLORS[2]} strokeWidth={2} dot={{ r: 3 }} />
                </Recharts.LineChart>
              </Recharts.ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {showAmountBar && (
        <Card className={cn(MODERN_CARD_CLASS, 'lg:col-span-3')}>
          <CardHeader>
            <CardTitle className="text-base">{tc('analyticsCharts.amountComparisonTitle')}</CardTitle>
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

function QuickQuotationRow({
  item,
  currencyFormatter,
  tc,
  onOpenQuotation,
}: {
  item: Customer360QuickQuotationDto;
  currencyFormatter: Intl.NumberFormat;
  tc: (key: string, options?: Record<string, unknown>) => string;
  onOpenQuotation?: (quotationId: number) => void;
}): ReactElement {
  const offerDate = new Date(item.offerDate).toLocaleDateString();
  const approvedDate = item.approvedDate ? new Date(item.approvedDate).toLocaleDateString() : null;

  return (
    <Card className={MODERN_CARD_CLASS}>
      <CardContent className="pt-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">#{item.id}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {offerDate}
              {item.quotationNo ? ` · ${item.quotationNo}` : ''}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.hasConvertedQuotation ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>
              {item.hasConvertedQuotation ? tc('quickQuotations.converted') : tc('quickQuotations.draft')}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.hasApprovalRequest ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300' : 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300'}`}>
              {item.hasApprovalRequest ? (item.approvalStatusName ?? tc('quickQuotations.sentToApproval')) : tc('quickQuotations.notSentToApproval')}
            </span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-sm">
          <div>
            <p className="text-muted-foreground">{tc('quickQuotations.currency')}</p>
            <p className="font-medium">{item.currencyCode}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{tc('quickQuotations.total')}</p>
            <p className="font-medium">{currencyFormatter.format(item.totalAmount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{tc('quickQuotations.quotationStatus')}</p>
            <p className="font-medium">{item.quotationStatusName ?? '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{tc('quickQuotations.approvalStep')}</p>
            <p className="font-medium">
              {item.approvalCurrentStep ? tc('quickQuotations.stepValue', { step: item.approvalCurrentStep }) : '-'}
            </p>
          </div>
        </div>

        {item.description ? (
          <p className="text-sm text-muted-foreground">{item.description}</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3">
          <div className="text-xs text-muted-foreground">
            {approvedDate ? tc('quickQuotations.convertedAt', { date: approvedDate }) : tc('quickQuotations.notConvertedYet')}
            {item.approvalFlowDescription ? ` · ${item.approvalFlowDescription}` : ''}
          </div>
          {item.quotationId ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenQuotation?.(item.quotationId as number)}
              className="h-8 gap-1.5 text-rose-600 hover:text-rose-700 dark:text-rose-400"
            >
              {tc('quickQuotations.openQuotation')}
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ErpBalanceCard({
  title,
  value,
}: {
  title: string;
  value: string;
}): ReactElement {
  return (
    <Card className={MODERN_CARD_CLASS}>
      <CardContent className="pt-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

const ERP_AMOUNT_EPS = 1e-6;

function erpDebitAmountClass(value: number): string {
  return Math.abs(value) > ERP_AMOUNT_EPS
    ? 'font-medium tabular-nums tracking-tight text-rose-600 dark:text-rose-400'
    : 'tabular-nums tracking-tight text-muted-foreground/60';
}

function erpCreditAmountClass(value: number): string {
  return Math.abs(value) > ERP_AMOUNT_EPS
    ? 'font-medium tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400'
    : 'tabular-nums tracking-tight text-muted-foreground/60';
}

/** Klasik borsa: pozitif yeşil, negatif kırmızı, sıfır nötr */
function erpSignedBalanceClass(value: number): string {
  if (value > ERP_AMOUNT_EPS) {
    return 'font-medium tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400';
  }
  if (value < -ERP_AMOUNT_EPS) {
    return 'font-medium tabular-nums tracking-tight text-rose-600 dark:text-rose-400';
  }
  return 'tabular-nums tracking-tight text-muted-foreground/60';
}

function ErpMovementsTabContent({
  balance,
  movements,
  isLoading,
  isError,
  t,
  tc,
}: {
  balance?: Customer360ErpBalanceDto;
  movements: Customer360ErpMovementDto[];
  isLoading: boolean;
  isError: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
  tc: (key: string, opts?: Record<string, unknown>) => string;
}): ReactElement {
  const formatter = {
    format: (value: number) =>
      formatSystemNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  };

  const formatDate = (value?: string | null): string =>
    value ? formatSystemDate(value) : '-';

  const formatNumber = (value?: number | null): string => formatter.format(value ?? 0);

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Card key={idx} className="rounded-xl border border-border">
              <CardContent className="pt-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="rounded-xl border border-border">
          <CardContent className="pt-6">
            <Skeleton className="h-72 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="rounded-xl border border-dashed border-border">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          {tc('erpMovements.error')}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ErpBalanceCard title={tc('erpMovements.summary.totalDebit')} value={formatNumber(balance?.toplamBorc)} />
        <ErpBalanceCard title={tc('erpMovements.summary.totalCredit')} value={formatNumber(balance?.toplamAlacak)} />
        <ErpBalanceCard
          title={`${tc('erpMovements.summary.balance')} · ${balance?.bakiyeDurumu ?? tc('erpMovements.summary.closed')}`}
          value={formatNumber(balance?.bakiyeTutari)}
        />
      </div>

      <Card className={MODERN_CARD_CLASS}>
        <CardHeader className="pb-2 pt-5">
          <CardTitle className="text-sm font-medium tracking-tight text-foreground">
            {tc('erpMovements.tableTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5 pt-0">
          {movements.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">{t('noData', { ns: 'common' })}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/70 bg-muted/20">
              <Table className="min-w-[1500px] text-[13px] leading-snug">
                <TableHeader>
                  <TableRow className="border-b border-border/60 hover:bg-transparent">
                    <TableHead className="h-9 px-3 py-2 text-xs font-medium text-muted-foreground">
                      {tc('erpMovements.columns.date')}
                    </TableHead>
                    <TableHead className="h-9 px-3 py-2 text-xs font-medium text-muted-foreground">
                      {tc('erpMovements.columns.dueDate')}
                    </TableHead>
                    <TableHead className="h-9 px-3 py-2 text-xs font-medium text-muted-foreground">
                      {tc('erpMovements.columns.documentNo')}
                    </TableHead>
                    <TableHead className="h-9 px-3 py-2 text-xs font-medium text-muted-foreground">
                      {tc('erpMovements.columns.description')}
                    </TableHead>
                    <TableHead className="h-9 px-3 py-2 text-xs font-medium text-muted-foreground">
                      {tc('erpMovements.columns.currency')}
                    </TableHead>
                    <TableHead className="h-9 px-3 py-2 text-right text-xs font-semibold tracking-tight text-rose-600/90 dark:text-rose-400/95">
                      {tc('erpMovements.columns.debit')}
                    </TableHead>
                    <TableHead className="h-9 px-3 py-2 text-right text-xs font-semibold tracking-tight text-emerald-600/90 dark:text-emerald-400/95">
                      {tc('erpMovements.columns.credit')}
                    </TableHead>
                    <TableHead className="h-9 px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                      {tc('erpMovements.columns.tlBalanceByDate')}
                    </TableHead>
                    <TableHead className="h-9 px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                      {tc('erpMovements.columns.tlBalanceByDueDate')}
                    </TableHead>
                    <TableHead className="h-9 px-3 py-2 text-right text-xs font-semibold tracking-tight text-rose-600/90 dark:text-rose-400/95">
                      {tc('erpMovements.columns.fxDebit')}
                    </TableHead>
                    <TableHead className="h-9 px-3 py-2 text-right text-xs font-semibold tracking-tight text-emerald-600/90 dark:text-emerald-400/95">
                      {tc('erpMovements.columns.fxCredit')}
                    </TableHead>
                    <TableHead className="h-9 px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                      {tc('erpMovements.columns.fxBalanceByDate')}
                    </TableHead>
                    <TableHead className="h-9 px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                      {tc('erpMovements.columns.fxBalanceByDueDate')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((row, index) => (
                    <TableRow
                      key={`${row.cariKod}-${row.tarih ?? index}-${row.belgeNo ?? index}`}
                      className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/50"
                    >
                      <TableCell className="px-3 py-2 text-muted-foreground">{formatDate(row.tarih)}</TableCell>
                      <TableCell className="px-3 py-2 text-muted-foreground">{formatDate(row.vadeTarihi)}</TableCell>
                      <TableCell className="px-3 py-2">{row.belgeNo || '-'}</TableCell>
                      <TableCell className="max-w-[220px] truncate px-3 py-2 text-muted-foreground">
                        {row.aciklama || '-'}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-muted-foreground">{row.paraBirimi || '-'}</TableCell>
                      <TableCell className={cn('px-3 py-2 text-right', erpDebitAmountClass(row.borc))}>
                        {formatNumber(row.borc)}
                      </TableCell>
                      <TableCell className={cn('px-3 py-2 text-right', erpCreditAmountClass(row.alacak))}>
                        {formatNumber(row.alacak)}
                      </TableCell>
                      <TableCell
                        className={cn('px-3 py-2 text-right', erpSignedBalanceClass(row.tarihSiraliTlBakiye))}
                      >
                        {formatNumber(row.tarihSiraliTlBakiye)}
                      </TableCell>
                      <TableCell
                        className={cn('px-3 py-2 text-right', erpSignedBalanceClass(row.vadeSiraliTlBakiye))}
                      >
                        {formatNumber(row.vadeSiraliTlBakiye)}
                      </TableCell>
                      <TableCell className={cn('px-3 py-2 text-right', erpDebitAmountClass(row.dovizBorc))}>
                        {formatNumber(row.dovizBorc)}
                      </TableCell>
                      <TableCell className={cn('px-3 py-2 text-right', erpCreditAmountClass(row.dovizAlacak))}>
                        {formatNumber(row.dovizAlacak)}
                      </TableCell>
                      <TableCell
                        className={cn('px-3 py-2 text-right', erpSignedBalanceClass(row.tarihSiraliDovizBakiye))}
                      >
                        {formatNumber(row.tarihSiraliDovizBakiye)}
                      </TableCell>
                      <TableCell
                        className={cn('px-3 py-2 text-right', erpSignedBalanceClass(row.vadeSiraliDovizBakiye))}
                      >
                        {formatNumber(row.vadeSiraliDovizBakiye)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function sanitizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned.length >= 7 ? cleaned : null;
}

function HeroChip({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }): ReactElement {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground/80">
      <Icon className="h-3.5 w-3.5 text-rose-500" />
      <span className="truncate">{children}</span>
    </span>
  );
}

function HeroInfoActionIcon({
  icon: Icon,
  href,
  onClick,
  label,
  tone,
}: {
  icon: React.ElementType;
  href?: string;
  onClick?: () => void;
  label: string;
  tone: 'whatsapp' | 'call' | 'email' | 'open';
}): ReactElement {
  const toneClass =
    tone === 'whatsapp'
      ? 'hover:bg-emerald-500/15 hover:text-emerald-600 dark:hover:text-emerald-400'
      : tone === 'call'
        ? 'hover:bg-sky-500/15 hover:text-sky-600 dark:hover:text-sky-400'
        : 'hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400';
  const cls = cn(
    'flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:scale-110 active:scale-95',
    toneClass
  );
  if (href) {
    return (
      <a
        href={href}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel="noreferrer"
        title={label}
        aria-label={label}
        className={cls}
      >
        <Icon className="h-3.5 w-3.5" />
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={cls}>
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function HeroInfoLine({
  icon: Icon,
  label,
  value,
  emptyLabel,
  valueHref,
  actions,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
  emptyLabel: string;
  valueHref?: string;
  actions?: React.ReactNode;
}): ReactElement {
  const hasValue = Boolean(value && value.trim());
  const fullValue = hasValue ? (value as string) : undefined;
  return (
    <div className="group flex items-center gap-2.5 rounded-xl border border-border bg-muted/20 px-2.5 py-1.5 shadow-xs transition-colors hover:border-rose-500/40 hover:bg-muted/40">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background text-rose-500">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        {hasValue && valueHref ? (
          <a
            href={valueHref}
            target={valueHref.startsWith('http') ? '_blank' : undefined}
            rel="noreferrer"
            title={fullValue}
            className="block truncate text-sm font-medium text-foreground hover:text-rose-500"
          >
            {value}
          </a>
        ) : (
          <p
            title={fullValue}
            className={cn('truncate text-sm font-medium', hasValue ? 'text-foreground' : 'text-muted-foreground/60 italic')}
          >
            {hasValue ? value : emptyLabel}
          </p>
        )}
      </div>
      {hasValue && actions ? <div className="flex shrink-0 items-center gap-0.5">{actions}</div> : null}
    </div>
  );
}

function HeroStatRow({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/40 py-2 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="truncate text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function HeroActionButton({
  icon: Icon,
  label,
  onClick,
  href,
  tone = 'default',
  disabled,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  href?: string;
  tone?: 'default' | 'whatsapp' | 'gradient';
  disabled?: boolean;
}): ReactElement {
  const toneClass =
    tone === 'gradient'
      ? 'cursor-pointer border-transparent bg-[image:var(--crm-brand-gradient)] shadow-[0_4px_14px_-6px_var(--crm-brand-shadow)] hover:shadow-[0_6px_20px_-6px_var(--crm-brand-shadow)] text-white shadow-sm shadow-rose-500/20 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-rose-500/30 hover:text-white active:translate-y-0 [&_.hero-action-icon]:bg-white/20 [&_.hero-action-icon]:text-white'
      : tone === 'whatsapp'
        ? 'border-emerald-500/30 bg-emerald-500/5 text-foreground hover:bg-emerald-500/10 [&_.hero-action-icon]:bg-emerald-500/15 [&_.hero-action-icon]:text-emerald-600 dark:[&_.hero-action-icon]:text-emerald-400'
        : 'border-border bg-background/70 text-foreground hover:bg-muted [&_.hero-action-icon]:bg-muted [&_.hero-action-icon]:text-rose-500';

  const className = cn(
    'group inline-flex h-10 items-center gap-2 rounded-xl border pl-1.5 pr-3.5 text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-40',
    toneClass
  );

  const inner = (
    <>
      <span className="hero-action-icon flex h-7 w-7 items-center justify-center rounded-lg transition-colors">
        <Icon className="h-4 w-4" />
      </span>
      {label}
    </>
  );

  if (href && !disabled) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {inner}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {inner}
    </button>
  );
}

function CustomerHeroCard({
  customer,
  fallbackName,
  fallbackCode,
  primaryContactLabel,
  onQuickActivity,
  onQuickQuote,
  onEdit,
  tc,
  i18nLanguage,
}: {
  customer?: CustomerDto;
  fallbackName: string;
  fallbackCode?: string | null;
  primaryContactLabel?: string | null;
  onQuickActivity: () => void;
  onQuickQuote: () => void;
  onEdit: () => void;
  tc: (key: string, opts?: Record<string, unknown>) => string;
  i18nLanguage: string;
}): ReactElement {
  const name = customer?.name ?? fallbackName;
  const code = customer?.customerCode ?? fallbackCode ?? null;
  const email = customer?.email ?? null;
  const website = customer?.website ?? null;
  const address = [customer?.address, customer?.districtName].filter(Boolean).join(', ') || null;
  const phone = sanitizePhone(customer?.phone) ?? sanitizePhone(customer?.phone2);
  const location = [customer?.cityName, customer?.countryName].filter(Boolean).join(', ');
  const createdYear = customer?.createdDate ? new Date(customer.createdDate).getFullYear() : null;
  const isIntegrated = Boolean(customer?.isERPIntegrated || customer?.isIntegrated);
  const noneLabel = tc('hero.none');
  const creditLimitLabel =
    customer?.creditLimit != null
      ? new Intl.NumberFormat(i18nLanguage, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(customer.creditLimit)
      : noneLabel;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-rose-600 via-rose-500 to-amber-500" />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-rose-500/[0.05] via-transparent to-amber-500/[0.03] dark:from-rose-500/[0.07] dark:to-amber-500/[0.04]" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-rose-500/[0.06] blur-3xl dark:bg-rose-500/10" />

      <div className="relative grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-5">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-start gap-3.5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-rose-500 via-rose-500 to-amber-500 text-lg font-bold text-white shadow-lg shadow-rose-500/20 sm:h-16 sm:w-16 sm:text-xl">
              {getInitials(name)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{name}</h1>
                <Badge
                  className={cn(
                    'gap-1.5 rounded-full border-0 px-2.5 py-0.5 text-xs font-semibold shadow-sm',
                    isIntegrated
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', isIntegrated ? 'bg-emerald-500' : 'bg-amber-500', 'animate-pulse')} />
                  {isIntegrated ? tc('hero.statusActive') : tc('hero.statusCrm')}
                </Badge>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {code && <HeroChip icon={BadgeCheck}>{code}</HeroChip>}
                {location && <HeroChip icon={MapPin}>{location}</HeroChip>}
                {createdYear && <HeroChip icon={CalendarDays}>{tc('hero.since', { year: createdYear })}</HeroChip>}
                {primaryContactLabel && <HeroChip icon={User}>{primaryContactLabel}</HeroChip>}
                {customer?.customerTypeName && <HeroChip icon={Building2}>{customer.customerTypeName}</HeroChip>}
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <HeroInfoLine
              icon={Mail}
              label={tc('hero.emailLabel')}
              value={email}
              emptyLabel={noneLabel}
              actions={
                <HeroInfoActionIcon icon={Send} href={`mailto:${email}`} label={tc('hero.email')} tone="email" />
              }
            />
            <HeroInfoLine
              icon={Phone}
              label={tc('hero.phoneLabel')}
              value={customer?.phone ?? customer?.phone2 ?? null}
              emptyLabel={noneLabel}
              actions={
                phone ? (
                  <>
                    <HeroInfoActionIcon icon={Phone} href={`tel:${phone}`} label={tc('hero.call')} tone="call" />
                    <HeroInfoActionIcon
                      icon={MessageCircle}
                      href={`https://wa.me/${phone.replace('+', '')}`}
                      label={tc('hero.whatsapp')}
                      tone="whatsapp"
                    />
                  </>
                ) : null
              }
            />
            <HeroInfoLine
              icon={Globe}
              label={tc('hero.websiteLabel')}
              value={website}
              emptyLabel={noneLabel}
              valueHref={website ? (website.startsWith('http') ? website : `https://${website}`) : undefined}
              actions={
                website ? (
                  <HeroInfoActionIcon
                    icon={ExternalLink}
                    href={website.startsWith('http') ? website : `https://${website}`}
                    label={tc('hero.websiteLabel')}
                    tone="open"
                  />
                ) : null
              }
            />
            <HeroInfoLine icon={MapPin} label={tc('hero.addressLabel')} value={address} emptyLabel={noneLabel} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <HeroActionButton icon={FileText} label={tc('hero.quickQuote')} tone="gradient" onClick={onQuickQuote} />
            <HeroActionButton icon={Activity} label={tc('quickActivity')} tone="gradient" onClick={onQuickActivity} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {tc('hero.editCustomer')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/50 p-4 backdrop-blur-sm">
          <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <BadgeCheck className="h-3.5 w-3.5 text-rose-500" />
            {tc('hero.infoTitle')}
          </p>
          <HeroStatRow label={tc('hero.taxNumber')} value={customer?.taxNumber || noneLabel} />
          <HeroStatRow label={tc('hero.customerType')} value={customer?.customerTypeName || noneLabel} />
          <HeroStatRow label={tc('hero.salesRep')} value={customer?.salesRepCode || noneLabel} />
          <HeroStatRow label={tc('hero.creditLimit')} value={creditLimitLabel} />
        </div>
      </div>
    </div>
  );
}

const ALL_CURRENCY = 'ALL';

export function Customer360Page(): ReactElement {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['customer-management', 'customer360', 'common']);
  const tc = useCallback(
    (key: string, opts?: Record<string, unknown>) => t(key, { ns: 'customer360', ...opts }),
    [t]
  );
  const { user } = useAuthStore();
  const canViewErpOrders = useCanViewCustomerErpOrders();
  const id = Number(customerId ?? 0);
  const [currency, setCurrency] = useState<string>(ALL_CURRENCY);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [quickActivityOpen, setQuickActivityOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [pendingDeleteImageId, setPendingDeleteImageId] = useState<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity();
  const { data: editingActivity, isFetching: isEditingActivityLoading } = useActivity(editingActivityId ?? 0);
  const updateCustomer = useUpdateCustomer();
  const uploadImagesMutation = useUploadCustomerImagesMutation(id);
  const deleteImageMutation = useDeleteCustomerImageMutation(id);
  const currencyParam = currency === ALL_CURRENCY ? undefined : currency;
  const { data: customerDetail } = useCustomer(id, id > 0);
  const { data, isLoading, isError, error, refetch } = useCustomer360OverviewQuery(id, currencyParam);
  const { data: analytics, isLoading: isAnalyticsLoading, isError: isAnalyticsError } =
    useCustomer360AnalyticsSummaryQuery(id, currencyParam, activeTab === 'analytics');
  const { data: chartsData, isLoading: isChartsLoading, isError: isChartsError } =
    useCustomer360AnalyticsChartsQuery(id, 12, currencyParam, activeTab === 'analytics');
  const { data: cohortData, isLoading: isCohortLoading } = useCustomer360CohortQuery(id, 12);
  const { data: customerImages = [], isLoading: isImagesLoading, isError: isImagesError } = useCustomerImagesQuery(id);
  const { data: quickQuotations = [], isLoading: isQuickQuotationsLoading, isError: isQuickQuotationsError } = useCustomer360QuickQuotationsQuery(id);
  const { data: erpMovements = [], isLoading: isErpMovementsLoading, isError: isErpMovementsError } = useCustomer360ErpMovementsQuery(id);
  const { data: erpBalance, isLoading: isErpBalanceLoading, isError: isErpBalanceError } = useCustomer360ErpBalanceQuery(id);
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
  const customerErpCode = customerDetail?.customerCode ?? profile.customerCode;
  const customerDisplayName = customerDetail?.name ?? profile.name;

  const customer360Tabs = useMemo(() => {
    const tabs = [
      { value: 'overview', icon: Clock, label: tc('tabs.overview') },
      { value: 'quotations', icon: FileText, label: tc('tabs.quotations') },
      { value: 'orders', icon: ShoppingCart, label: tc('tabs.orders') },
      ...(canViewErpOrders
        ? [{ value: 'erpOrders' as const, icon: Package, label: tc('tabs.erpOrders') }]
        : []),
      { value: 'activities', icon: Activity, label: tc('tabs.activities') },
      { value: 'analytics', icon: Activity, label: tc('tabs.analytics') },
      { value: 'quickQuotations', icon: FileText, label: tc('tabs.quickQuotations') },
      { value: 'erpMovements', icon: ClipboardList, label: tc('tabs.erpMovements') },
      { value: 'mailLogs', icon: Mail, label: tc('tabs.mailLogs') },
      { value: 'images', icon: ImageIcon, label: tc('tabs.images') },
    ];
    return tabs;
  }, [canViewErpOrders, tc]);
  const handleQuickActivitySubmit = useCallback(
    async (
      formData: ActivityFormSchema,
      pendingImages?: { file: File; description: string }[]
    ): Promise<void> => {
      const createdActivity = await createActivity.mutateAsync(
        buildCreateActivityPayload(formData, { assignedUserIdFallback: user?.id })
      );

      if (createdActivity && pendingImages && pendingImages.length > 0) {
        const files = pendingImages.map(img => img.file);
        const descriptions = pendingImages.map(img => img.description);
        await activityImageApi.upload(createdActivity.id, {
          files,
          resimAciklamalar: descriptions.some(d => d) ? descriptions : undefined,
        });
      }
      setQuickActivityOpen(false);
    },
    [createActivity, user?.id]
  );

  const handleEditActivitySubmit = useCallback(
    async (
      formData: ActivityFormSchema,
      pendingImages?: { file: File; description: string }[],
      pendingDeletedImageIds?: number[],
      pendingUpdatedImageDescriptions?: Record<number, string>
    ): Promise<void> => {
      if (!editingActivity) return;
      await updateActivity.mutateAsync({
        id: editingActivity.id,
        data: buildUpdateActivityPayload(formData, editingActivity.assignedUserId),
      });
      await persistActivityFormImages(editingActivity.id, {
        pendingImages,
        pendingDeletedImageIds,
        pendingUpdatedImageDescriptions,
      });
      await queryClient.invalidateQueries({ queryKey: ['customer360'], exact: false });
      setEditingActivityId(null);
    },
    [editingActivity, queryClient, updateActivity]
  );

  const handleQuickQuote = useCallback(() => {
    navigate('/quotations/create', {
      state: {
        prefillCustomer: {
          potentialCustomerId: customerDetail?.id ?? id,
          erpCustomerCode: customerDetail?.customerCode ?? data?.profile?.customerCode ?? null,
          customerName: customerDetail?.name ?? data?.profile?.name ?? null,
        },
        returnTo: `/customer-360/${id}`,
      },
    });
  }, [navigate, customerDetail, data?.profile, id]);

  const handleEditCustomer = useCallback(() => {
    setEditCustomerOpen(true);
  }, []);

  const handleEditCustomerSubmit = useCallback(
    async (formData: CustomerFormData): Promise<void> => {
      await updateCustomer.mutateAsync({ id, data: formData });
      setEditCustomerOpen(false);
    },
    [updateCustomer, id]
  );

  const handleImageFilesSelected = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (files.length > 0) {
        uploadImagesMutation.mutate({ files });
      }
      event.target.value = '';
    },
    [uploadImagesMutation]
  );

  const goToEntity = useCallback(
    (path: string) => {
      navigate(path);
    },
    [navigate]
  );

  if (id <= 0) {
    return (
      <div className="w-full py-2">
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-8 text-center">
          <p className="text-muted-foreground">{tc('notFound')}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
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
      <div className="w-full py-2">
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-8 text-center space-y-4">
          <p className="text-muted-foreground">
            {is404 ? tc('notFound') : tc('error')}
          </p>
          {!is404 && (
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {tc('retry')}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full py-2">
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-8 text-center">
          <p className="text-muted-foreground">{tc('notFound')}</p>
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

  const primaryContact = data.contacts?.[0];
  const primaryContactLabel = primaryContact
    ? [primaryContact.title, primaryContact.subtitle].filter(Boolean).join(' · ')
    : null;

  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={0}>
      <div className="w-full space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/customer-management', { state: { from360: true } })}
            className="h-9 gap-1.5 rounded-xl px-2.5 text-muted-foreground hover:text-foreground"
            title={t('back', { ns: 'common' })}
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back', { ns: 'common' })}
          </Button>
          <span className="text-sm font-medium text-muted-foreground">{tc('title')}</span>
        </div>

        <CustomerHeroCard
          customer={customerDetail}
          fallbackName={profile.name ?? ''}
          fallbackCode={profile.customerCode}
          primaryContactLabel={primaryContactLabel}
          onQuickActivity={() => setQuickActivityOpen(true)}
          onQuickQuote={handleQuickQuote}
          onEdit={handleEditCustomer}
          tc={tc}
          i18nLanguage={i18n.language}
        />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="sticky -top-4 z-30 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-background/95 px-4 pt-4 pb-2.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/85 md:-top-6 md:-mx-6 md:px-6 md:pt-6">
          <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
            {customer360Tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="group relative gap-2 rounded-lg border border-transparent px-3.5 py-2 text-sm font-medium text-muted-foreground transition-all data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <tab.icon className="h-4 w-4 transition-colors group-data-[state=active]:text-rose-500" />
                {tab.label}
                <span className="pointer-events-none absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-linear-to-r from-rose-600 to-amber-500 opacity-0 transition-opacity group-data-[state=active]:opacity-100" />
              </TabsTrigger>
            ))}
          </TabsList>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="h-9 w-[160px]" size="sm">
              <SelectValue placeholder={tc('currencyFilter.label')} />
            </SelectTrigger>
            <SelectContent>
              {currencyOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt === ALL_CURRENCY ? tc('currencyFilter.all') : opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {([
              { key: 'totalDemands', value: kpi.totalDemands ?? 0, icon: ClipboardList, tone: 'text-sky-500', chip: 'from-sky-500/20 to-sky-500/5 ring-sky-500/20' },
              { key: 'totalQuotations', value: kpi.totalQuotations ?? 0, icon: FileText, tone: 'text-violet-500', chip: 'from-violet-500/20 to-violet-500/5 ring-violet-500/20' },
              { key: 'totalOrders', value: kpi.totalOrders ?? 0, icon: ShoppingCart, tone: 'text-emerald-500', chip: 'from-emerald-500/20 to-emerald-500/5 ring-emerald-500/20' },
              { key: 'openQuotations', value: kpi.openQuotations ?? 0, icon: FileText, tone: 'text-amber-500', chip: 'from-amber-500/20 to-amber-500/5 ring-amber-500/20' },
              { key: 'openOrders', value: kpi.openOrders ?? 0, icon: ShoppingCart, tone: 'text-rose-500', chip: 'from-rose-500/20 to-rose-500/5 ring-rose-500/20' },
            ] as const).map((item) => (
              <Card
                key={item.key}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-500/30 hover:shadow-[0_12px_34px_-16px_rgba(236,72,153,0.4)]"
              >
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-rose-500/40 to-transparent opacity-60 transition-opacity group-hover:opacity-100" />
                <CardContent className="flex items-center justify-between gap-3 pt-6">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {tc(`kpi.${item.key}`)}
                    </p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">{item.value}</p>
                  </div>
                  <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br ring-1 ring-inset transition-transform group-hover:scale-105', item.chip, item.tone)}>
                    <item.icon className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            ))}
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
              title={tc('sections.contacts')}
              icon={User}
              items={data.contacts ?? []}
              emptyKey="common.noData"
              renderItem={(item) => <SimpleItemRow item={item as Customer360SimpleItemDto} />}
            />
            <SectionCard
              title={tc('sections.shippingAddresses')}
              icon={MapPin}
              items={data.shippingAddresses ?? []}
              emptyKey="common.noData"
              renderItem={(item) => <SimpleItemRow item={item as Customer360SimpleItemDto} />}
            />
            <SectionCard
              title={tc('sections.recentDemands')}
              icon={ClipboardList}
              items={data.recentDemands ?? []}
              emptyKey="common.noData"
              renderItem={(item) => {
                const row = item as Customer360SimpleItemDto;
                return (
                  <SimpleItemRow
                    item={row}
                    currencyFormatter={currencyFormatter}
                    onClick={() => goToEntity(`/demands/${row.id}`)}
                  />
                );
              }}
            />
            <SectionCard
              title={tc('sections.recentQuotations')}
              icon={FileText}
              items={data.recentQuotations ?? []}
              emptyKey="common.noData"
              renderItem={(item) => {
                const row = item as Customer360SimpleItemDto;
                return (
                  <SimpleItemRow
                    item={row}
                    currencyFormatter={currencyFormatter}
                    onClick={() => goToEntity(`/quotations/${row.id}`)}
                  />
                );
              }}
            />
            <SectionCard
              title={tc('sections.recentOrders')}
              icon={ShoppingCart}
              items={data.recentOrders ?? []}
              emptyKey="common.noData"
              renderItem={(item) => {
                const row = item as Customer360SimpleItemDto;
                return (
                  <SimpleItemRow
                    item={row}
                    currencyFormatter={currencyFormatter}
                    onClick={() => goToEntity(`/orders/${row.id}`)}
                  />
                );
              }}
            />
            <SectionCard
              title={tc('sections.recentActivities')}
              icon={Activity}
              items={data.recentActivities ?? []}
              emptyKey="common.noData"
              renderItem={(item) => (
                <SimpleItemRow item={item as Customer360SimpleItemDto} currencyFormatter={currencyFormatter} />
              )}
            />
          </div>

          <SectionCard
            title={tc('sections.timeline')}
            icon={Clock}
            items={timelineSorted}
            emptyKey="common.noData"
            renderItem={(item) => <TimelineRow item={item as Customer360TimelineItemDto} />}
          />
        </TabsContent>

        <TabsContent value="quotations" className="space-y-4">
          <CustomerQuotationsTab
            customerId={id}
            customerCode={customerDetail?.customerCode ?? profile.customerCode}
            customerName={customerDetail?.name ?? profile.name}
          />
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <CustomerOrdersTab
            customerId={id}
            customerCode={customerErpCode}
            customerName={customerDisplayName}
          />
        </TabsContent>

        {canViewErpOrders && (
          <TabsContent value="erpOrders" className="space-y-4">
            <CustomerErpOrdersTab customerCode={customerErpCode} />
          </TabsContent>
        )}

        <TabsContent value="activities" className="space-y-4">
          <CustomerActivitiesTab
            customerId={id}
            customerCode={customerErpCode}
            customerName={customerDisplayName}
            onNewActivity={() => setQuickActivityOpen(true)}
            onOpenActivity={setEditingActivityId}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {isAnalyticsError ? (
            <Card className="rounded-xl border border-dashed border-border">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                {tc('analytics.error')}
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
                <Card className="rounded-xl border border-dashed border-border">
                  <CardContent className="pt-6 text-sm text-muted-foreground">
                    {tc('analytics.error')}
                  </CardContent>
                </Card>
              ) : isChartsLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card className="rounded-xl border border-border">
                    <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
                    <CardContent><Skeleton className="h-64 w-full" /></CardContent>
                  </Card>
                  <Card className="rounded-xl border border-border">
                    <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
                    <CardContent><Skeleton className="h-64 w-full" /></CardContent>
                  </Card>
                  <Card className="rounded-xl border border-border">
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
                    tc={tc}
                    noDataKey="common.noData"
                    showAmountBar={!isAllCurrencies}
                    chartsEnabled={activeTab === 'analytics'}
                  />
                </>
              ) : null}
            </>
          )}
        </TabsContent>

        <TabsContent value="quickQuotations" className="space-y-4">
          {isQuickQuotationsLoading ? (
            <div className="grid gap-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <Card key={idx} className="rounded-xl border border-border">
                  <CardContent className="pt-6">
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : isQuickQuotationsError ? (
            <Card className="rounded-xl border border-dashed border-border">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                {tc('quickQuotations.error')}
              </CardContent>
            </Card>
          ) : quickQuotations.length === 0 ? (
            <Card className="rounded-xl border border-dashed border-border">
              <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <FileText className="h-6 w-6" />
                </div>
                <p className="text-sm text-muted-foreground">{tc('quickQuotations.empty')}</p>
                <Button
                  type="button"
                  onClick={handleQuickQuote}
                  className="gap-2 rounded-xl border-0 bg-[image:var(--crm-brand-gradient)] shadow-[0_4px_14px_-6px_var(--crm-brand-shadow)] hover:shadow-[0_6px_20px_-6px_var(--crm-brand-shadow)] text-white hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                  {tc('hero.quickQuote')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleQuickQuote}
                  variant="outline"
                  className="gap-2 rounded-xl"
                >
                  <Plus className="h-4 w-4" />
                  {tc('hero.quickQuote')}
                </Button>
              </div>
              <div className="grid gap-4">
                {quickQuotations.map((item) => (
                  <QuickQuotationRow
                    key={item.id}
                    item={item}
                    currencyFormatter={currencyFormatter}
                    tc={tc}
                    onOpenQuotation={(quotationId) => goToEntity(`/quotations/${quotationId}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="erpMovements" className="space-y-4">
          <ErpMovementsTabContent
            balance={erpBalance}
            movements={erpMovements}
            isLoading={isErpMovementsLoading || isErpBalanceLoading}
            isError={isErpMovementsError || isErpBalanceError}
            t={t}
            tc={tc}
          />
        </TabsContent>

        <TabsContent value="images" className="space-y-4">
          <Card className={MODERN_CARD_CLASS}>
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <CardTitle className="flex items-center gap-2.5 text-sm font-semibold">
                <span className={MODERN_ICON_CHIP_CLASS}>
                  <ImageIcon className="h-4 w-4" />
                </span>
                {tc('tabs.images')}
                {imageItems.length > 0 && (
                  <Badge variant="secondary" className="rounded-full">{imageItems.length}</Badge>
                )}
              </CardTitle>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageFilesSelected}
              />
              <Button
                type="button"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadImagesMutation.isPending}
                className="gap-2 rounded-xl border-0 bg-[image:var(--crm-brand-gradient)] shadow-[0_4px_14px_-6px_var(--crm-brand-shadow)] hover:shadow-[0_6px_20px_-6px_var(--crm-brand-shadow)] text-white hover:text-white"
              >
                <Upload className="h-4 w-4" />
                {tc('images.upload')}
              </Button>
            </CardHeader>
            <CardContent>
              {isImagesLoading ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <Skeleton key={idx} className="aspect-square w-full rounded-xl" />
                  ))}
                </div>
              ) : isImagesError ? (
                <p className="text-sm text-muted-foreground">{tc('analytics.error')}</p>
              ) : imageItems.length === 0 ? (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-border py-12 text-center transition-colors hover:border-rose-500/50 hover:bg-muted/40"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <Upload className="h-6 w-6" />
                  </div>
                  <span className="text-sm text-muted-foreground">{tc('images.emptyHint')}</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {imageItems.map((img, index) => (
                    <div
                      key={img.id}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted/40"
                    >
                      <img
                        src={img.src}
                        alt={img.imageDescription ?? `customer-image-${img.id}`}
                        className="h-full w-full cursor-zoom-in object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onClick={() => setLightboxIndex(index)}
                      />
                      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 via-black/0 to-black/0 opacity-0 transition-opacity group-hover:opacity-100" />
                      <p className="pointer-events-none absolute inset-x-0 bottom-0 line-clamp-2 p-2.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {img.imageDescription || tc('tabs.imagesDefaultDescription')}
                      </p>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteImageId(img.id)}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-black/55 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-rose-600 group-hover:opacity-100"
                        title={tc('images.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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
          initialPotentialCustomerId={customerDetail?.id ?? (profile.id || undefined)}
          initialErpCustomerCode={customerDetail?.customerCode ?? profile.customerCode ?? undefined}
          initialCustomerDisplayName={customerDetail?.name ?? profile.name ?? undefined}
          preservePrefilledCustomer
        />

        <ActivityForm
          open={editingActivityId != null}
          onOpenChange={(open) => {
            if (!open) setEditingActivityId(null);
          }}
          onSubmit={handleEditActivitySubmit}
          activity={editingActivity ?? null}
          isLoading={updateActivity.isPending || (editingActivityId != null && isEditingActivityLoading)}
        />

        {customerDetail && (
          <CustomerForm
            open={editCustomerOpen}
            onOpenChange={setEditCustomerOpen}
            onSubmit={handleEditCustomerSubmit}
            customer={customerDetail}
            isLoading={updateCustomer.isPending}
          />
        )}

        <Dialog open={lightboxIndex !== null} onOpenChange={(open) => !open && setLightboxIndex(null)}>
          <DialogContent className="max-w-3xl border-border bg-card p-0">
            {lightboxIndex !== null && imageItems[lightboxIndex] && (
              <>
                <DialogHeader className="sr-only">
                  <DialogTitle>{imageItems[lightboxIndex].imageDescription ?? tc('tabs.images')}</DialogTitle>
                  <DialogDescription>{tc('tabs.images')}</DialogDescription>
                </DialogHeader>
                <img
                  src={imageItems[lightboxIndex].src}
                  alt={imageItems[lightboxIndex].imageDescription ?? `customer-image-${imageItems[lightboxIndex].id}`}
                  className="max-h-[75vh] w-full rounded-t-lg object-contain bg-black/5 dark:bg-black/40"
                />
                <div className="flex items-center justify-between gap-3 p-4">
                  <p className="text-sm font-medium">
                    {imageItems[lightboxIndex].imageDescription || tc('tabs.imagesDefaultDescription')}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 text-rose-600 hover:text-rose-700"
                    onClick={() => {
                      const target = imageItems[lightboxIndex!];
                      setLightboxIndex(null);
                      setPendingDeleteImageId(target.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    {tc('images.delete')}
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={pendingDeleteImageId !== null} onOpenChange={(open) => !open && setPendingDeleteImageId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{tc('images.deleteConfirmTitle')}</DialogTitle>
              <DialogDescription>{tc('images.deleteConfirmDescription')}</DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPendingDeleteImageId(null)}>
                {t('cancel', { ns: 'common' })}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteImageMutation.isPending}
                onClick={() => {
                  if (pendingDeleteImageId !== null) {
                    deleteImageMutation.mutate(pendingDeleteImageId, {
                      onSuccess: () => setPendingDeleteImageId(null),
                    });
                  }
                }}
              >
                {tc('images.delete')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
