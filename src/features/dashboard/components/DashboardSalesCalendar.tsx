import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import {
  Ban,
  Building2,
  CalendarDays,
  CalendarRange,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDotDashed,
  ExternalLink,
  FileCheck2,
  Eye,
  LayoutGrid,
  List,
  Loader2,
  PackageOpen,
  Pencil,
  RotateCw,
  Search,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CustomerCancellationDialog } from '@/components/shared/CustomerCancellationDialog';
import { useCrudPermissions } from '@/features/access-control/hooks/useCrudPermissions';
import { canCustomerCancelDocument } from '@/features/approval/utils/resolve-document-status';
import { useCancelDemandByCustomer } from '@/features/demand/hooks/useCancelDemandByCustomer';
import { useCancelQuotationByCustomer } from '@/features/quotation/hooks/useCancelQuotationByCustomer';
import { useCancelOrderByCustomer } from '@/features/order/hooks/useCancelOrderByCustomer';
import { useDashboardSalesCalendar } from '../hooks/useDashboardSalesCalendar';
import { useDashboardSalesDocumentDetail } from '../hooks/useDashboardSalesDocumentDetail';
import type {
  DashboardSalesCalendarItem,
  DashboardSalesDocumentType,
} from '../types/dashboard-sales-calendar';
import type { DashboardSalesDocumentDetail } from '../types/dashboard-sales-document-detail';

interface DashboardSalesCalendarProps {
  documentType: DashboardSalesDocumentType;
}

type CalendarView = 'month' | 'week' | 'agenda';

const MONTH_CALENDAR_DAY_PREVIEW_LIMIT = 2;
const WEEK_CALENDAR_DAY_PREVIEW_LIMIT = 3;

interface SalesCalendarEventButtonProps {
  item: DashboardSalesCalendarItem;
  showOwner: boolean;
  compact?: boolean;
  unassignedOwnerLabel: string;
  canUpdate: boolean;
  canOpenCustomer: boolean;
  canOpenCustomer360: boolean;
  onSelect: (item: DashboardSalesCalendarItem) => void;
  onEdit: (item: DashboardSalesCalendarItem) => void;
  onCancel: (item: DashboardSalesCalendarItem) => void;
  onOpenCustomer: (item: DashboardSalesCalendarItem) => void;
  onOpenCustomer360: (item: DashboardSalesCalendarItem) => void;
}

interface SalesCalendarDayContextMenuProps {
  day: Date;
  itemCount: number;
  locale: string;
  showAllLabel: string;
  onShowAll: () => void;
  children: ReactElement;
}

function SalesCalendarDayContextMenu({
  day,
  itemCount,
  locale,
  showAllLabel,
  onShowAll,
  children,
}: SalesCalendarDayContextMenuProps): ReactElement {
  if (itemCount === 0) return children;

  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(day);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuLabel className="truncate capitalize text-xs font-bold text-slate-500 dark:text-slate-400">
          {dateLabel}
        </ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem data-testid="sales-calendar-show-day" onSelect={onShowAll} className="gap-2">
          <List size={15} className="text-primary" />
          {showAllLabel}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
function SalesCalendarEventButton({
  item,
  showOwner,
  compact = false,
  unassignedOwnerLabel,
  canUpdate,
  canOpenCustomer,
  canOpenCustomer360,
  onSelect,
  onEdit,
  onCancel,
  onOpenCustomer,
  onOpenCustomer360,
}: SalesCalendarEventButtonProps): ReactElement {
  const { t } = useTranslation('dashboard');
  const documentLabel = item.documentNumber?.trim() || `#${item.id}`;
  const visibleLabel = showOwner
    ? `${item.representativeName || unassignedOwnerLabel} / ${documentLabel}`
    : documentLabel;
  const hasCustomer = Boolean(item.customerId && item.customerId > 0);
  const canCancel = canUpdate && canCustomerCancelDocument(item.status ?? null, item.isErpIntegrated);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          data-testid="sales-calendar-event"
          aria-label={visibleLabel}
          onClick={() => onSelect(item)}
          onContextMenu={(event) => {
            event.stopPropagation();
            event.nativeEvent.stopImmediatePropagation();
          }}
          className={cn(
            'w-full rounded-md border-l-4 px-1.5 text-left transition hover:-translate-y-px hover:shadow-sm',
            compact ? 'h-5 py-0.5' : 'py-1',
            statusTone(item),
          )}
        >
          <span className={cn('block truncate text-[10px] leading-tight', compact ? 'font-bold' : 'font-black')}>
            {visibleLabel}
          </span>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuLabel className="truncate text-xs font-bold text-slate-500 dark:text-slate-400">
          {documentLabel}
        </ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem data-testid="sales-calendar-open-detail" onSelect={() => onSelect(item)} className="gap-2">
          <Eye size={15} className="text-primary" />
          {t('contextActions.viewDetails')}
        </ContextMenuItem>
        {canUpdate && (
          <ContextMenuItem data-testid="sales-calendar-edit" onSelect={() => onEdit(item)} className="gap-2">
            <Pencil size={15} className="text-blue-500" />
            {t('contextActions.edit')}
          </ContextMenuItem>
        )}
        {hasCustomer && (canOpenCustomer || canOpenCustomer360) && <ContextMenuSeparator />}
        {hasCustomer && canOpenCustomer && (
          <ContextMenuItem data-testid="sales-calendar-customer-info" onSelect={() => onOpenCustomer(item)} className="gap-2">
            <Building2 size={15} className="text-indigo-500" />
            {t('contextActions.customerInfo')}
          </ContextMenuItem>
        )}
        {hasCustomer && canOpenCustomer360 && (
          <ContextMenuItem data-testid="sales-calendar-customer-360" onSelect={() => onOpenCustomer360(item)} className="gap-2">
            <ChartNoAxesCombined size={15} className="text-emerald-500" />
            {t('contextActions.customer360')}
          </ContextMenuItem>
        )}
        {canCancel && <ContextMenuSeparator />}
        {canCancel && (
          <ContextMenuItem data-testid="sales-calendar-cancel" onSelect={() => onCancel(item)} className="gap-2 text-rose-600 focus:text-rose-600">
            <Ban size={15} />
            {t('contextActions.cancelDocument')}
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

const ROUTES: Record<DashboardSalesDocumentType, string> = {
  Demand: '/demands',
  Quotation: '/quotations',
  Order: '/orders',
};

const PERMISSIONS: Record<DashboardSalesDocumentType, string> = {
  Demand: 'sales.demands.view',
  Quotation: 'sales.quotations.view',
  Order: 'sales.orders.view',
};

function toQueryDate(value: Date): string {
  return format(value, 'yyyy-MM-dd');
}

function statusTone(item: DashboardSalesCalendarItem): string {
  if (item.isErpIntegrated) {
    return 'border-l-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200';
  }
  if (item.status === 1) {
    return 'border-l-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200';
  }
  if ([3, 4, 5, 6, 7].includes(item.status ?? -1)) {
    return 'border-l-slate-300 bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400';
  }
  return 'border-l-blue-400 bg-blue-50 text-blue-800 dark:bg-blue-500/10 dark:text-blue-200';
}

function formatCurrency(value: number, currency: string | null | undefined, locale: string): string {
  const normalizedCurrency = currency?.trim() || 'TRY';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: normalizedCurrency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)} ${normalizedCurrency}`;
  }
}

function SalesDocumentDetailReport({
  detail,
  summary,
  onOpenDocument,
}: {
  detail: DashboardSalesDocumentDetail;
  summary: DashboardSalesCalendarItem;
  onOpenDocument: () => void;
}): ReactElement {
  const { t, i18n } = useTranslation('dashboard');
  const locale = i18n.language;
  const customerName = detail.customerName || summary.customerName || summary.customerCode || t('salesCalendar.customerUnknown');
  const documentDate = detail.documentDate || summary.documentDate;

  return (
    <div className="min-w-0">
      <div className="grid gap-3 border-b border-slate-200 p-5 sm:grid-cols-2 lg:grid-cols-4 dark:border-white/10">
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-white/5">
          <p className="text-[10px] font-black uppercase text-slate-400">{t('salesCalendar.detail.customer')}</p>
          <p className="mt-1 break-words text-sm font-black text-slate-900 dark:text-white">{customerName}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{detail.customerCode || summary.customerCode || '-'}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-white/5">
          <p className="text-[10px] font-black uppercase text-slate-400">{t('salesCalendar.detail.owner')}</p>
          <p className="mt-1 break-words text-sm font-black text-slate-900 dark:text-white">{detail.representativeName || summary.representativeName || t('salesCalendar.unassignedOwner')}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-white/5">
          <p className="text-[10px] font-black uppercase text-slate-400">{t('salesCalendar.detail.date')}</p>
          <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(documentDate))}</p>
          {detail.deliveryDate ? <p className="mt-1 text-xs font-semibold text-slate-500">{t('salesCalendar.detail.deliveryDate')}: {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(detail.deliveryDate))}</p> : null}
        </div>
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-white/5">
          <p className="text-[10px] font-black uppercase text-slate-400">{t('salesCalendar.detail.amount')}</p>
          <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{formatCurrency(detail.grandTotal, detail.currency, locale)}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{detail.erpIntegrationNumber || (detail.isErpIntegrated ? t('salesCalendar.erpYes') : t('salesCalendar.erpNo'))}</p>
        </div>
      </div>

      <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PackageOpen size={17} className="text-primary" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">{t('salesCalendar.detail.lines')}</h3>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">
            {t('salesCalendar.detail.lineCount', { count: detail.lines.length })}
          </span>
        </div>

        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
          <table className="w-full min-w-[780px] border-collapse text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2.5">{t('salesCalendar.detail.productCode')}</th>
                <th className="px-3 py-2.5">{t('salesCalendar.detail.productName')}</th>
                <th className="px-3 py-2.5 text-right">{t('salesCalendar.detail.quantity')}</th>
                <th className="px-3 py-2.5 text-right">{t('salesCalendar.detail.unitPrice')}</th>
                <th className="px-3 py-2.5 text-right">{t('salesCalendar.detail.discount')}</th>
                <th className="px-3 py-2.5 text-right">{t('salesCalendar.detail.vat')}</th>
                <th className="px-3 py-2.5 text-right">{t('salesCalendar.detail.lineTotal')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {detail.lines.length > 0 ? detail.lines.map((line) => (
                <tr key={line.id} data-testid="sales-document-line" className="align-top">
                  <td className="whitespace-nowrap px-3 py-3 font-mono font-bold text-slate-600 dark:text-slate-300">{line.productCode || '-'}</td>
                  <td className="px-3 py-3">
                    <p className="font-bold text-slate-900 dark:text-white">{line.productName || '-'}</p>
                    {line.description ? <p className="mt-1 max-w-72 text-[10px] leading-relaxed text-slate-500">{line.description}</p> : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-bold">{new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(line.quantity)} {line.unit || ''}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold">{formatCurrency(line.unitPrice, detail.currency, locale)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold">{formatCurrency(line.discountAmount, detail.currency, locale)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold">%{new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(line.vatRate)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-black">{formatCurrency(line.lineGrandTotal, detail.currency, locale)}</td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="px-4 py-10 text-center font-semibold text-slate-500">{t('salesCalendar.detail.noLines')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:bg-white/[0.03]">
        <div className="min-w-0">
          {detail.description ? <p className="line-clamp-2 text-xs font-semibold text-slate-600 dark:text-slate-300">{detail.description}</p> : null}
          <p className="mt-1 text-xs font-bold text-slate-500">
            {[detail.paymentTypeName, detail.deliveryMethod].filter(Boolean).join(' / ') || detail.documentNumber}
          </p>
        </div>
        <Button type="button" className="shrink-0" onClick={onOpenDocument}>{t('salesCalendar.openDocument')}<ExternalLink size={15} className="ml-2" /></Button>
      </div>
    </div>
  );
}

export function DashboardSalesCalendar({ documentType }: DashboardSalesCalendarProps): ReactElement {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const { canUpdate } = useCrudPermissions(PERMISSIONS[documentType]);
  const { canView: canViewCustomer } = useCrudPermissions('customers.customer-management.view');
  const { canView: canViewCustomer360 } = useCrudPermissions('customer360.overview.view');
  const cancelDemand = useCancelDemandByCustomer();
  const cancelQuotation = useCancelQuotationByCustomer();
  const cancelOrder = useCancelOrderByCustomer();
  const [view, setView] = useState<CalendarView>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | 'all'>('all');
  const [ownerSearch, setOwnerSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<DashboardSalesCalendarItem | null>(null);
  const [dayPopover, setDayPopover] = useState<{ day: Date; items: DashboardSalesCalendarItem[] } | null>(null);
  const [cancellationItem, setCancellationItem] = useState<DashboardSalesCalendarItem | null>(null);

  const weekStartsOn = 1 as const;
  const visibleRange = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(cursor, { weekStartsOn });
      return { start, end: addDays(endOfWeek(cursor, { weekStartsOn }), 1) };
    }
    const monthStart = startOfMonth(cursor);
    return {
      start: startOfWeek(monthStart, { weekStartsOn }),
      end: addDays(endOfWeek(endOfMonth(cursor), { weekStartsOn }), 1),
    };
  }, [cursor, view]);

  const startDate = toQueryDate(visibleRange.start);
  const endDate = toQueryDate(visibleRange.end);
  const { data, isLoading, isFetching, isError, error, refetch } = useDashboardSalesCalendar(documentType, startDate, endDate);
  const detailQuery = useDashboardSalesDocumentDetail(documentType, selectedItem?.id ?? null);

  useEffect(() => {
    if (selectedOwnerId !== 'all' && data && !data.owners.some((owner) => owner.id === selectedOwnerId)) {
      setSelectedOwnerId('all');
    }
  }, [data, selectedOwnerId]);

  const visibleItems = useMemo(() => {
    if (!data) return [];
    if (!data.isSystemAdmin || selectedOwnerId === 'all') return data.items;
    return data.items.filter((item) => item.representativeId === selectedOwnerId);
  }, [data, selectedOwnerId]);

  const filteredOwners = useMemo(() => {
    const search = ownerSearch.trim().toLocaleLowerCase(i18n.language);
    if (!data || !search) return data?.owners ?? [];
    return data.owners.filter((owner) => owner.name.toLocaleLowerCase(i18n.language).includes(search));
  }, [data, ownerSearch, i18n.language]);

  const days = useMemo(
    () => eachDayOfInterval({ start: visibleRange.start, end: addDays(visibleRange.end, -1) }),
    [visibleRange],
  );
  const itemsByDay = useMemo(() => {
    const map = new Map<string, DashboardSalesCalendarItem[]>();
    days.forEach((day) => {
      map.set(
        day.toISOString(),
        visibleItems.filter((item) => isSameDay(new Date(item.documentDate), day)),
      );
    });
    return map;
  }, [days, visibleItems]);
  const selectedOwner = data?.owners.find((owner) => owner.id === selectedOwnerId);
  const showOwnerOnCalendar = data?.isSystemAdmin === true && selectedOwnerId === 'all';
  const viewIcons: Record<CalendarView, LucideIcon> = { month: LayoutGrid, week: CalendarRange, agenda: List };
  const locale = i18n.language;
  const title = new Intl.DateTimeFormat(locale, view === 'week'
    ? { day: 'numeric', month: 'long', year: 'numeric' }
    : { month: 'long', year: 'numeric' }).format(cursor);
  const summary = useMemo(() => {
    if (!data || selectedOwnerId === 'all') {
      return {
        total: data?.totalCount ?? 0,
        today: data?.createdTodayCount ?? 0,
        erp: data?.erpIntegratedCount ?? 0,
        waiting: data?.waitingApprovalCount ?? 0,
      };
    }

    return {
      total: visibleItems.length,
      today: visibleItems.filter((item) => isToday(new Date(item.createdDate))).length,
      erp: visibleItems.filter((item) => isToday(new Date(item.createdDate)) && item.isErpIntegrated).length,
      waiting: visibleItems.filter((item) => item.status === 1).length,
    };
  }, [data, selectedOwnerId, visibleItems]);
  const titleKey = documentType.toLocaleLowerCase() as 'demand' | 'quotation' | 'order';

  const move = (direction: -1 | 1): void => {
    setCursor((current) => view === 'week'
      ? (direction < 0 ? subWeeks(current, 1) : addWeeks(current, 1))
      : (direction < 0 ? subMonths(current, 1) : addMonths(current, 1)));
  };

  const openDocument = (item: DashboardSalesCalendarItem) => {
    navigate(`${ROUTES[documentType]}/${item.id}`);
  };

  const openCustomer = (item: DashboardSalesCalendarItem): void => {
    if (!item.customerId) return;
    navigate(`/customer-management?customerId=${item.customerId}`);
  };

  const openCustomer360 = (item: DashboardSalesCalendarItem): void => {
    if (!item.customerId) return;
    navigate(`/customer-360/${item.customerId}`);
  };

  const requestCancellation = (item: DashboardSalesCalendarItem): void => {
    setDayPopover(null);
    setCancellationItem(item);
  };

  const cancelMutation = documentType === 'Demand'
    ? cancelDemand
    : documentType === 'Quotation'
      ? cancelQuotation
      : cancelOrder;

  const confirmCancellation = async (reason: string): Promise<void> => {
    if (!cancellationItem) return;
    await cancelMutation.mutateAsync({ id: cancellationItem.id, reason: reason || null });
    if (selectedItem?.id === cancellationItem.id) setSelectedItem(null);
    setCancellationItem(null);
    await refetch();
  };

  const renderCalendarEvent = (
    item: DashboardSalesCalendarItem,
    options?: { compact?: boolean; onSelect?: (selected: DashboardSalesCalendarItem) => void },
  ): ReactElement => (
    <SalesCalendarEventButton
      key={item.id}
      item={item}
      compact={options?.compact}
      showOwner={showOwnerOnCalendar}
      unassignedOwnerLabel={t('salesCalendar.unassignedOwner')}
      canUpdate={canUpdate}
      canOpenCustomer={canViewCustomer}
      canOpenCustomer360={canViewCustomer360}
      onSelect={options?.onSelect ?? setSelectedItem}
      onEdit={openDocument}
      onCancel={requestCancellation}
      onOpenCustomer={openCustomer}
      onOpenCustomer360={openCustomer360}
    />
  );

  const summaryToneClasses = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
    fuchsia: 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/15 dark:text-fuchsia-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  } as const;
  const summaryCards = [
    { key: 'period', label: t('salesCalendar.summary.period'), value: summary.total, icon: CalendarDays, tone: 'blue' },
    { key: 'today', label: t('salesCalendar.summary.today'), value: summary.today, icon: FileCheck2, tone: 'fuchsia' },
    { key: 'erp', label: t('salesCalendar.summary.erp'), value: summary.erp, icon: CheckCircle2, tone: 'emerald' },
    { key: 'waiting', label: t('salesCalendar.summary.waiting'), value: summary.waiting, icon: CircleDotDashed, tone: 'amber' },
  ] satisfies Array<{
    key: string;
    label: string;
    value: number;
    icon: LucideIcon;
    tone: keyof typeof summaryToneClasses;
  }>;

  return (
    <section
      data-testid="sales-calendar-context-boundary"
      onContextMenu={(event) => event.preventDefault()}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#130d1b]"
    >
      <div className="relative overflow-hidden border-b border-slate-200 px-4 py-3 dark:border-white/10 md:px-5">
        <div className="pointer-events-none absolute -right-16 -top-24 h-52 w-52 rounded-full bg-[image:var(--crm-brand-gradient)] opacity-[0.07] blur-2xl" aria-hidden />
        <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[image:var(--crm-brand-gradient)] text-white shadow-sm shadow-primary/25">
              <CalendarDays size={18} />
            </div>
            <h2
              className="whitespace-nowrap text-base font-black text-slate-900 dark:text-white"
              title={data?.isSystemAdmin ? t('salesCalendar.descriptionAdmin') : t('salesCalendar.descriptionSelf')}
            >
              {t(`salesCalendar.${titleKey}.title`)}
            </h2>
          </div>

          <div className="flex items-center gap-1">
            {summaryCards.map(({ key, label, value, icon: Icon, tone }) => {
              const displayValue = isLoading ? '-' : value;

              return (
                <span
                  key={key}
                  data-testid={`sales-calendar-summary-${key}`}
                  title={`${label}: ${displayValue}`}
                  aria-label={`${label}: ${displayValue}`}
                  className={cn(
                    'inline-flex h-7 min-w-11 items-center justify-center gap-1 rounded-lg px-1.5',
                    summaryToneClasses[tone],
                  )}
                >
                  <Icon size={12} className="shrink-0" aria-hidden />
                  <span className="text-xs font-black leading-none tabular-nums" aria-hidden>
                    {displayValue}
                  </span>
                </span>
              );
            })}
          </div>

          <div className="ms-auto flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-white/10 dark:bg-white/5">
              {(['month', 'week', 'agenda'] as const).map((item) => {
                const ViewIcon = viewIcons[item];
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setView(item)}
                    title={t(`calendar.views.${item}`)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold transition',
                      view === item
                        ? 'bg-[image:var(--crm-brand-gradient)] text-white shadow-sm shadow-primary/20'
                        : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-white/10',
                    )}
                  >
                    <ViewIcon size={14} />
                    <span className="hidden sm:inline">{t(`calendar.views.${item}`)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-b border-slate-200 bg-slate-50/60 px-4 py-2 dark:border-white/10 dark:bg-white/[0.02] md:px-5">
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => move(-1)} aria-label={t('calendar.previous')}><ChevronLeft size={16} /></Button>
        <Button variant="outline" size="sm" className="h-8 rounded-lg px-2.5 text-xs font-bold" onClick={() => setCursor(new Date())}>{t('salesCalendar.today')}</Button>
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => move(1)} aria-label={t('calendar.next')}><ChevronRight size={16} /></Button>
        <h3 className="ml-1 whitespace-nowrap capitalize text-sm font-black text-slate-900 dark:text-white md:text-base">{title}</h3>

        {data?.isSystemAdmin && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition',
                  selectedOwnerId === 'all'
                    ? 'border-slate-200 bg-white text-slate-700 hover:border-primary/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'
                    : 'border-primary bg-primary/10 text-primary',
                )}
                title={t('salesCalendar.ownerLabel')}
              >
                <Users size={14} className="shrink-0" />
                <span className="max-w-32 truncate">{selectedOwner?.name ?? t('salesCalendar.allOwners')}</span>
                <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-black tabular-nums text-slate-600 dark:bg-white/10 dark:text-slate-300">
                  {selectedOwnerId === 'all' ? data.totalCount : selectedOwner?.documentCount}
                </span>
                <ChevronDown size={13} className="shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-2">
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-slate-200 px-2 dark:border-white/10">
                <Search size={14} className="text-slate-400" />
                <input value={ownerSearch} onChange={(event) => setOwnerSearch(event.target.value)} placeholder={t('salesCalendar.ownerSearch')} className="h-9 w-full bg-transparent text-sm outline-none" />
              </div>
              <div className="max-h-60 space-y-1 overflow-y-auto">
                <button type="button" data-testid="sales-calendar-owner-all" onClick={() => setSelectedOwnerId('all')} className={cn('flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold hover:bg-slate-100 dark:hover:bg-white/5', selectedOwnerId === 'all' && 'bg-primary/10 text-primary')}>
                  {t('salesCalendar.allOwners')}<span>{data.totalCount}</span>
                </button>
                {filteredOwners.map((owner) => (
                  <button key={owner.id} type="button" data-testid="sales-calendar-owner-option" onClick={() => setSelectedOwnerId(owner.id)} className={cn('flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-slate-100 dark:hover:bg-white/5', selectedOwnerId === owner.id && 'bg-primary/10 text-primary')}>
                    <span className="truncate">{owner.name}</span><span>{owner.documentCount}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        <Button variant="ghost" size="sm" className="ms-auto h-8 px-2.5 text-xs" disabled={isFetching} onClick={() => void refetch()}>
          <RotateCw size={14} className={cn('sm:mr-1.5', isFetching && 'animate-spin')} />
          <span className="hidden sm:inline">{t('refresh')}</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex min-h-96 items-center justify-center gap-2 text-sm font-bold text-slate-500"><Loader2 size={18} className="animate-spin text-primary" />{t('loading')}</div>
      ) : isError ? (
        <div className="flex min-h-80 flex-col items-center justify-center gap-3 px-6 text-center text-sm font-bold text-rose-600">
          <p>{t('salesCalendar.loadError')}</p>
          {error instanceof Error && error.message ? (
            <p className="max-w-2xl text-xs font-semibold text-slate-500 dark:text-slate-400">{error.message}</p>
          ) : null}
          <Button type="button" variant="outline" onClick={() => void refetch()}>{t('refresh')}</Button>
        </div>
      ) : view === 'agenda' ? (
        <div className="h-[calc(100vh-410px)] min-h-[380px] overflow-y-auto p-4 md:p-5">
          {days.map((day) => {
            const dayItems = itemsByDay.get(day.toISOString()) ?? [];
            if (dayItems.length === 0) return null;
            return (
              <div key={day.toISOString()} className="mb-5 grid gap-3 md:grid-cols-[180px_1fr]">
                <div className="flex items-center gap-2 md:flex-col md:items-start md:gap-1">
                  <div className="font-black text-slate-900 dark:text-white">
                    {new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(day)}
                  </div>
                  {isToday(day) && (
                    <span className="rounded-full bg-[image:var(--crm-brand-gradient)] px-2 py-0.5 text-[10px] font-black text-white">
                      {t('salesCalendar.today')}
                    </span>
                  )}
                </div>
                <div className="space-y-2 border-l-2 border-dashed border-slate-200 pl-3 dark:border-white/10 md:pl-4">
                  {dayItems.map((item) => renderCalendarEvent(item))}
                </div>
              </div>
            );
          })}
          {visibleItems.length === 0 && (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-slate-400">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5">
                <List size={26} />
              </div>
              <span className="font-semibold">{t('salesCalendar.empty')}</span>
            </div>
          )}
        </div>
      ) : (
        <div className={cn(
          'overflow-x-auto overflow-y-clip',
          view === 'week' && 'h-[calc(100vh-410px)] min-h-[380px]',
        )}>
          <div
            className={cn('min-w-[840px] grid grid-cols-7', view === 'week' ? 'h-full' : 'h-auto')}
            style={{
              gridTemplateRows: view === 'month'
                ? `auto repeat(${Math.max(1, days.length / 7)}, 104px)`
                : 'auto minmax(320px, 1fr)',
            }}
          >
            {days.slice(0, 7).map((day) => (
              <div key={`header-${day.toISOString()}`} className="border-b border-r border-slate-200 bg-slate-50 px-2 py-2 text-center text-[10px] font-black uppercase tracking-wider text-slate-400 last:border-r-0 dark:border-white/10 dark:bg-white/[0.03]">
                {new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day)}
              </div>
            ))}
            {days.map((day) => {
              const dayItems = itemsByDay.get(day.toISOString()) ?? [];
              const visibleLimit = view === 'month'
                ? MONTH_CALENDAR_DAY_PREVIEW_LIMIT
                : WEEK_CALENDAR_DAY_PREVIEW_LIMIT;
              const openDayPopover = (): void => {
                if (dayItems.length === 0) return;
                setDayPopover({ day, items: dayItems });
              };
              return (
                <SalesCalendarDayContextMenu
                  key={day.toISOString()}
                  day={day}
                  itemCount={dayItems.length}
                  locale={locale}
                  showAllLabel={t('salesCalendar.showDayDocuments', { count: dayItems.length })}
                  onShowAll={openDayPopover}
                >
                  <div
                    data-testid="sales-calendar-day"
                    data-calendar-date={format(day, 'yyyy-MM-dd')}
                    data-document-count={dayItems.length}
                    className={cn(
                      'flex min-h-0 flex-col overflow-clip border-b border-r border-slate-100 p-1.5 dark:border-white/5',
                      !isSameMonth(day, cursor) && view === 'month' && 'bg-slate-50/70 opacity-60 dark:bg-white/[0.02]',
                      isToday(day) && 'bg-primary/[0.03]',
                    )}
                  >
                    <div className={cn('mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black text-slate-500', isToday(day) && 'bg-primary text-white')}>
                      {format(day, 'd')}
                    </div>
                    <div className="min-h-0 space-y-1 overflow-clip">
                      {dayItems.slice(0, visibleLimit).map((item) => renderCalendarEvent(item, { compact: view === 'month' }))}
                      {dayItems.length > visibleLimit && (
                        <button
                          type="button"
                          data-testid="sales-calendar-more"
                          title={t('salesCalendar.more')}
                          className="block h-5 w-full rounded-md px-1 py-0.5 text-left text-[9px] font-bold leading-none text-primary hover:bg-primary/5 hover:underline"
                          onClick={openDayPopover}
                        >
                          +{dayItems.length - visibleLimit} {t('salesCalendar.more')}
                        </button>
                      )}
                    </div>
                  </div>
                </SalesCalendarDayContextMenu>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={selectedItem !== null} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent data-testid="sales-document-detail-dialog" className="max-h-[92vh] w-[calc(100%-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-5xl lg:max-w-5xl">
          {selectedItem && (
            <>
              <DialogHeader className="border-b border-slate-200 p-5 pr-12 text-left dark:border-white/10">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle>{selectedItem.documentNumber}</DialogTitle>
                  {selectedItem.revisionNumber ? <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">{selectedItem.revisionNumber}</span> : null}
                </div>
                <DialogDescription>{t(`salesCalendar.${titleKey}.title`)} / {selectedItem.customerName || selectedItem.customerCode || t('salesCalendar.customerUnknown')}</DialogDescription>
              </DialogHeader>
              {detailQuery.isLoading || detailQuery.isFetching ? (
                <div className="flex min-h-72 items-center justify-center gap-2 text-sm font-bold text-slate-500">
                  <Loader2 size={18} className="animate-spin text-primary" />{t('salesCalendar.detail.loading')}
                </div>
              ) : detailQuery.isError || !detailQuery.data ? (
                <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-5 text-center text-sm font-bold text-rose-600">
                  <span>{t('salesCalendar.detail.loadError')}</span>
                  <Button type="button" variant="outline" onClick={() => void detailQuery.refetch()}>{t('refresh')}</Button>
                </div>
              ) : (
                <SalesDocumentDetailReport
                  detail={detailQuery.data}
                  summary={selectedItem}
                  onOpenDocument={() => openDocument(selectedItem)}
                />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dayPopover !== null} onOpenChange={(open) => !open && setDayPopover(null)}>
        <DialogContent data-testid="sales-calendar-day-dialog" className="max-h-[80vh] overflow-hidden p-0 sm:max-w-md">
          {dayPopover && (
            <>
              <DialogHeader className="border-b border-slate-200 p-4 text-left dark:border-white/10">
                <DialogTitle className="capitalize">
                  {new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(dayPopover.day)}
                </DialogTitle>
                <DialogDescription>{t(`salesCalendar.${titleKey}.title`)} · {dayPopover.items.length}</DialogDescription>
              </DialogHeader>
              <div className="max-h-[60vh] space-y-1.5 overflow-y-auto p-3">
                {dayPopover.items.map((item) => renderCalendarEvent(item, {
                  onSelect: (selected) => {
                    setSelectedItem(selected);
                    setDayPopover(null);
                  },
                }))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <CustomerCancellationDialog
        open={cancellationItem !== null}
        title={t('contextActions.cancelDocumentTitle')}
        description={t('contextActions.cancelDocumentDescription', {
          number: cancellationItem?.documentNumber ?? '',
        })}
        reasonLabel={t('contextActions.cancellationReason')}
        reasonPlaceholder={t('contextActions.cancellationReasonPlaceholder')}
        cancelLabel={t('cancel', { ns: 'common' })}
        confirmLabel={t('contextActions.cancelDocument')}
        isPending={cancelMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setCancellationItem(null);
        }}
        onConfirm={confirmCancellation}
      />
    </section>
  );
}
