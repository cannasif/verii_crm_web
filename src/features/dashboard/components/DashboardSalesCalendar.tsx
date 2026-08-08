import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  addMonths,
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
} from 'date-fns';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDotDashed,
  ExternalLink,
  FileCheck2,
  Loader2,
  PackageOpen,
  Search,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
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

const ROUTES: Record<DashboardSalesDocumentType, string> = {
  Demand: '/demands',
  Quotation: '/quotations',
  Order: '/orders',
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
  const { t, i18n } = useTranslation('dashboard');
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | 'all'>('all');
  const [ownerSearch, setOwnerSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<DashboardSalesCalendarItem | null>(null);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const startDate = toQueryDate(gridStart);
  const endDate = toQueryDate(new Date(gridEnd.getFullYear(), gridEnd.getMonth(), gridEnd.getDate() + 1));
  const { data, isLoading, isFetching, isError, refetch } = useDashboardSalesCalendar(documentType, startDate, endDate);
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

  const days = useMemo(() => eachDayOfInterval({ start: gridStart, end: gridEnd }), [gridStart, gridEnd]);
  const selectedOwner = data?.owners.find((owner) => owner.id === selectedOwnerId);
  const showOwnerOnCalendar = data?.isSystemAdmin === true && selectedOwnerId === 'all';
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
  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(i18n.language, { weekday: 'short' }).format(
      new Date(2026, 0, 5 + index),
    ),
  );

  const openDocument = (item: DashboardSalesCalendarItem) => {
    navigate(`${ROUTES[documentType]}/${item.id}`);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#130d1b]">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><CalendarDays size={18} /></span>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">{t(`salesCalendar.${titleKey}.title`)}</h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {data?.isSystemAdmin ? t('salesCalendar.descriptionAdmin') : t('salesCalendar.descriptionSelf')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setCursor(subMonths(cursor, 1))} aria-label={t('salesCalendar.previous')}><ChevronLeft size={15} /></Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setCursor(new Date())}>{t('salesCalendar.today')}</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setCursor(addMonths(cursor, 1))} aria-label={t('salesCalendar.next')}><ChevronRight size={15} /></Button>
          <span className="min-w-28 text-center text-sm font-black capitalize text-slate-800 dark:text-slate-100">
            {new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(cursor)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 border-b border-slate-200 sm:grid-cols-4 dark:border-white/10">
        {[
          { label: t('salesCalendar.summary.period'), value: summary.total, icon: CalendarDays, tone: 'text-blue-600' },
          { label: t('salesCalendar.summary.today'), value: summary.today, icon: FileCheck2, tone: 'text-fuchsia-600' },
          { label: t('salesCalendar.summary.erp'), value: summary.erp, icon: CheckCircle2, tone: 'text-emerald-600' },
          { label: t('salesCalendar.summary.waiting'), value: summary.waiting, icon: CircleDotDashed, tone: 'text-amber-600' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="flex items-center gap-2 border-b border-r border-slate-100 px-4 py-3 last:border-r-0 sm:border-b-0 dark:border-white/5">
            <Icon size={17} className={tone} />
            <div><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className="text-xl font-black text-slate-900 dark:text-white">{isLoading ? '-' : value}</p></div>
          </div>
        ))}
      </div>

      {data?.isSystemAdmin && (
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/60 px-4 py-3 dark:border-white/10 dark:bg-white/[0.02]">
          <Users size={15} className="text-primary" />
          <span className="text-xs font-bold text-slate-500">{t('salesCalendar.ownerLabel')}</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="min-w-44 justify-between">
                <span className="truncate">{selectedOwner?.name ?? t('salesCalendar.allOwners')}</span><ChevronDown size={14} />
              </Button>
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
          {isFetching && <Loader2 size={14} className="animate-spin text-primary" />}
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-96 items-center justify-center gap-2 text-sm font-bold text-slate-500"><Loader2 size={18} className="animate-spin text-primary" />{t('loading')}</div>
      ) : isError ? (
        <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-sm font-bold text-rose-600">
          {t('salesCalendar.loadError')}<Button type="button" variant="outline" onClick={() => void refetch()}>{t('refresh')}</Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[840px]">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]">
              {weekdayLabels.map((label) => <div key={label} className="px-2 py-2 text-center text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const dayItems = visibleItems.filter((item) => isSameDay(new Date(item.documentDate), day));
                return (
                  <div key={day.toISOString()} className={cn('min-h-28 border-b border-r border-slate-100 p-1.5 dark:border-white/5', !isSameMonth(day, cursor) && 'bg-slate-50/70 opacity-60 dark:bg-white/[0.02]', isToday(day) && 'bg-primary/[0.03]')}>
                    <div className={cn('mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black text-slate-500', isToday(day) && 'bg-primary text-white')}>{format(day, 'd')}</div>
                    <div className="space-y-1">
                      {dayItems.slice(0, 4).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          data-testid="sales-calendar-event"
                          aria-label={showOwnerOnCalendar ? `${item.representativeName || t('salesCalendar.unassignedOwner')} ${item.documentNumber}` : item.documentNumber}
                          onClick={() => setSelectedItem(item)}
                          className={cn('w-full rounded-md border-l-4 px-1.5 py-1 text-left transition hover:-translate-y-px hover:shadow-sm', statusTone(item))}
                        >
                          {showOwnerOnCalendar ? (
                            <>
                              <span className="block truncate text-[10px] font-black">{item.representativeName || t('salesCalendar.unassignedOwner')}</span>
                              <span className="block truncate text-[9px] font-semibold opacity-70">{item.documentNumber}</span>
                            </>
                          ) : (
                            <span className="block truncate text-[10px] font-black">{item.documentNumber}</span>
                          )}
                        </button>
                      ))}
                      {dayItems.length > 4 && <span className="block px-1 text-[9px] font-bold text-primary">+{dayItems.length - 4} {t('salesCalendar.more')}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
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
    </section>
  );
}
