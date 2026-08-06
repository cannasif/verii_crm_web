import { type ReactElement, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ExternalLink, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useSalesmenPerformanceWorkFeedQuery } from '../../../hooks/useSalesmen360';
import type { Salesmen360AttentionItemDto, Salesmen360PeriodParams, Salesmen360WorkItemDto } from '../../../types/salesmen360.types';
import { PerformanceAttentionTable } from '../PerformanceAttentionTable';
import { formatPerformanceAmount, formatPerformanceDate } from '../performanceFormatters';

const WORK_KIND_FILTERS = ['all', 'demand', 'quotation', 'order', 'activity', 'customer'] as const;

interface SalesWorkFeedTabProps {
  userId: number;
  userIds?: number[];
  locale: string;
  currency?: string;
  periodParams?: Salesmen360PeriodParams;
  attentionItems: Salesmen360AttentionItemDto[];
  enabled: boolean;
  tabValue?: string;
  fixedKind?: Exclude<(typeof WORK_KIND_FILTERS)[number], 'all' | 'customer'>;
}

function getWorkItemRoute(item: Salesmen360WorkItemDto): string | null {
  switch (item.kind) {
    case 'demand':
      return `/demands/${item.entityId}`;
    case 'quotation':
      return `/quotations/${item.entityId}`;
    case 'order':
      return `/orders/${item.entityId}`;
    case 'customer':
      return `/customer-360/${item.customerId ?? item.entityId}`;
    default:
      return null;
  }
}

export function SalesWorkFeedTab({
  userId,
  userIds,
  locale,
  currency,
  periodParams,
  attentionItems,
  enabled,
  tabValue = 'work',
  fixedKind,
}: SalesWorkFeedTabProps): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [kind, setKind] = useState<(typeof WORK_KIND_FILTERS)[number]>(fixedKind ?? 'all');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [page, setPage] = useState(1);
  const userIdsKey = userIds?.join(',') ?? '';
  const workFeedQuery = useSalesmenPerformanceWorkFeedQuery({
    userId,
    userIds,
    page,
    pageSize: 20,
    kind: fixedKind ?? (kind === 'all' ? undefined : kind),
    search: deferredSearch || undefined,
    searchFields: deferredSearch ? ['Title', 'SalesmanName', 'CustomerName', 'TypeName'] : undefined,
    currency,
    periodParams,
    enabled,
  });

  useEffect(() => {
    setPage(1);
  }, [userId, userIdsKey, kind, deferredSearch, currency, periodParams?.period, periodParams?.startDate, periodParams?.endDate]);

  const feed = workFeedQuery.data;
  const items = feed?.items ?? [];

  const filteredAttentionItems = useMemo(() => {
    if (!fixedKind) return attentionItems;
    return attentionItems.filter((item) => {
      if (fixedKind === 'activity') return item.kind === 'overdueActivity';
      if (fixedKind === 'quotation') return item.kind === 'expiredQuotation';
      if (fixedKind === 'order') return item.kind === 'stalePendingOrder';
      return false;
    });
  }, [attentionItems, fixedKind]);

  return (
    <TabsContent value={tabValue} className="space-y-5 outline-none">
      <Card className="rounded-2xl border-slate-200/90 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/3">
        <CardHeader className="gap-4 pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-base">{t('salesman360.performance.detail.work.title')}</CardTitle>
            <p className="mt-1 text-xs font-medium text-slate-500">{t('salesman360.performance.detail.work.description')}</p>
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('salesman360.performance.detail.work.search')}
              className="rounded-xl pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-0">
          {!fixedKind ? (
            <div className="flex gap-2 overflow-x-auto px-5">
              {WORK_KIND_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setKind(filter)}
                  className={cn(
                    'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
                    kind === filter
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40 dark:border-white/10 dark:bg-white/3 dark:text-slate-300',
                  )}
                >
                  {t(`salesman360.performance.detail.work.kind.${filter}`)}
                </button>
              ))}
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 dark:bg-white/3">
                  <TableHead>{t('salesman360.performance.detail.work.record')}</TableHead>
                  <TableHead>{t('salesman360.performance.salesman')}</TableHead>
                  <TableHead>{t('salesman360.performance.detail.work.customer')}</TableHead>
                  <TableHead>{t('salesman360.performance.detail.work.status')}</TableHead>
                  <TableHead>{t('salesman360.performance.detail.work.date')}</TableHead>
                  <TableHead className="text-right">{t('salesman360.performance.detail.work.amount')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workFeedQuery.isLoading
                  ? Array.from({ length: 5 }, (_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-10 rounded-xl" />
                        </TableCell>
                      </TableRow>
                    ))
                  : null}
                {!workFeedQuery.isLoading && workFeedQuery.isError ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <span className="text-sm font-semibold text-red-500">{t('salesman360.performance.detail.work.loadError')}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          onClick={() => void workFeedQuery.refetch()}
                        >
                          {t('salesman360.retry')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
                {!workFeedQuery.isLoading && !workFeedQuery.isError
                  ? items.map((item) => {
                      const route = getWorkItemRoute(item);
                      return (
                        <TableRow
                          key={`${item.kind}-${item.entityId}`}
                          className={cn(route && 'cursor-pointer hover:bg-primary/5')}
                          onClick={route ? () => navigate(route) : undefined}
                          onKeyDown={
                            route
                              ? (event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    navigate(route);
                                  }
                                }
                              : undefined
                          }
                          role={route ? 'link' : undefined}
                          tabIndex={route ? 0 : undefined}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-500 dark:bg-white/8 dark:text-slate-300">
                                {t(`salesman360.performance.detail.work.kind.${item.kind}`)}
                              </span>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">{item.title}</p>
                                {item.typeName ? <p className="text-[11px] text-slate-400">{item.typeName}</p> : null}
                              </div>
                              {route ? <ExternalLink className="size-3.5 text-slate-300" /> : null}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">{item.salesmanName}</TableCell>
                          <TableCell>{item.customerName || '-'}</TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                'inline-flex rounded-full px-2 py-1 text-[10px] font-black',
                                item.isErpIntegrated
                                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'
                                  : item.isOverdue
                                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300'
                                    : 'bg-slate-100 text-slate-600 dark:bg-white/8 dark:text-slate-300',
                              )}
                            >
                              {item.isErpIntegrated
                                ? t('salesman360.performance.detail.status.erpIntegrated')
                                : t(`salesman360.performance.detail.status.${item.status}`)}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">{formatPerformanceDate(item.date, locale)}</TableCell>
                          <TableCell className="text-right font-bold tabular-nums">
                            {item.amount != null && item.currency ? formatPerformanceAmount(item.amount, item.currency, locale) : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  : null}
                {!workFeedQuery.isLoading && !workFeedQuery.isError && items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-slate-400">
                      {t('common.noData')}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          {!workFeedQuery.isLoading && !workFeedQuery.isError && feed ? (
            <div className="flex flex-col gap-3 border-t border-slate-200/80 px-5 py-4 dark:border-white/8 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t('salesman360.performance.detail.work.pageSummary', {
                  total: feed.totalCount,
                  page: feed.totalPages === 0 ? 0 : feed.page,
                  totalPages: feed.totalPages,
                })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={feed.page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="mr-1 size-4" />
                  {t('common.previous')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={feed.totalPages === 0 || feed.page >= feed.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  {t('common.next')}
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200/90 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('salesman360.performance.detail.attention.allTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <PerformanceAttentionTable
            items={filteredAttentionItems}
            locale={locale}
          />
        </CardContent>
      </Card>
    </TabsContent>
  );
}
