import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown, Plus } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { loadColumnPreferences } from '@/lib/column-preferences';
import { rowsToBackendFilters, type FilterColumnConfig, type FilterRow } from '@/lib/advanced-filter-types';
import { DataTableActionBar, type DataTableGridColumn } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OrderTable } from './OrderTable';
import { useOrderList } from '../hooks/useOrderList';
import { QUOTATION_QUERY_KEYS } from '../utils/query-keys';
import type { OrderGetDto } from '../types/order-types';
import type { PagedFilter } from '@/types/api';
import { formatCurrency } from '../utils/format-currency';
import { ApprovalStatusBadge } from '@/features/approval/components/ApprovalStatusBadge';
import type { ApprovalStatus } from '@/features/approval/types/approval-types';
import { Loader2, RefreshCw } from 'lucide-react';

const PAGE_KEY = 'order-list';
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type OrderColumnKey =
  | 'Id'
  | 'OfferNo'
  | 'PotentialCustomerName'
  | 'RepresentativeName'
  | 'OfferDate'
  | 'Currency'
  | 'GrandTotal'
  | 'Status';
type SortDirection = 'asc' | 'desc';

type OrderColumnConfig = {
  key: OrderColumnKey;
  labelKey: string;
  fallbackLabel: string;
  filterType: FilterColumnConfig['type'];
};

const ORDER_COLUMN_CONFIG: readonly OrderColumnConfig[] = [
  { key: 'Id', labelKey: 'order.list.id', fallbackLabel: 'ID', filterType: 'number' },
  { key: 'OfferNo', labelKey: 'order.list.offerNo', fallbackLabel: 'Teklif No', filterType: 'string' },
  { key: 'PotentialCustomerName', labelKey: 'order.list.customer', fallbackLabel: 'Müşteri', filterType: 'string' },
  { key: 'RepresentativeName', labelKey: 'order.list.representative', fallbackLabel: 'Temsilci', filterType: 'string' },
  { key: 'OfferDate', labelKey: 'order.list.offerDate', fallbackLabel: 'Tarih', filterType: 'date' },
  { key: 'Currency', labelKey: 'order.list.currency', fallbackLabel: 'Para Birimi', filterType: 'string' },
  { key: 'GrandTotal', labelKey: 'order.list.grandTotal', fallbackLabel: 'Toplam', filterType: 'number' },
  { key: 'Status', labelKey: 'order.list.status', fallbackLabel: 'Durum', filterType: 'number' },
];

function resolveLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  key: string,
  fallback: string
): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

export function OrderListPage(): ReactElement {
  const { t, i18n } = useTranslation(['order', 'common', 'approval', 'google-integration']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setPageTitle } = useUIStore();
  const { user } = useAuthStore();

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<OrderColumnKey>('Id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<string>('all');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const baseColumns = useMemo(
    () =>
      ORDER_COLUMN_CONFIG.map((col) => ({
        key: col.key,
        label: resolveLabel(t, col.labelKey, col.fallbackLabel),
      })),
    [t]
  );

  const columns = useMemo<DataTableGridColumn<OrderColumnKey>[]>(
    () =>
      baseColumns.map((col) => ({
        ...col,
        headClassName:
          col.key === 'GrandTotal'
            ? 'text-right'
            : undefined,
        cellClassName:
          col.key === 'GrandTotal'
            ? 'text-right font-semibold'
            : col.key === 'Id'
              ? 'font-medium'
              : undefined,
        sortable: true,
      })),
    [baseColumns]
  );

  const defaultColumnKeys = useMemo(() => baseColumns.map((col) => col.key), [baseColumns]);
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultColumnKeys);

  useEffect(() => {
    setPageTitle(t('order.list.title'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys, 'Id');
    setColumnOrder(prefs.order);
    setVisibleColumns(prefs.visibleKeys);
  }, [defaultColumnKeys, user?.id]);

  const appliedFilters = useMemo(() => {
    const fromRows = rowsToBackendFilters(appliedFilterRows);
    if (approvalStatusFilter !== 'all') {
      return [...fromRows, { column: 'Status', operator: 'equals', value: approvalStatusFilter }];
    }
    return fromRows;
  }, [appliedFilterRows, approvalStatusFilter]);

  const filtersParam: { filters?: PagedFilter[] } =
    appliedFilters.length > 0 ? { filters: appliedFilters } : {};

  const orderQuery = useOrderList({
    pageNumber,
    pageSize,
    sortBy,
    sortDirection,
    ...filtersParam,
  });
  const orderExportQuery = useOrderList({
    pageNumber: 1,
    pageSize: 10000,
    sortBy,
    sortDirection,
    ...filtersParam,
  });

  const pagedData = orderQuery.data;
  const currentPageRows = useMemo(() => pagedData?.data ?? [], [pagedData?.data]);
  const totalCount = pagedData?.totalCount ?? 0;
  const hasNextPage = pagedData?.hasNextPage ?? false;
  const hasPreviousPage = pagedData?.hasPreviousPage ?? pageNumber > 1;
  const totalPages = pagedData?.totalPages ?? 1;
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);
  const orderedVisibleColumns = columnOrder.filter((key) => visibleColumns.includes(key)) as OrderColumnKey[];

  const filterColumns = useMemo<FilterColumnConfig[]>(
    () =>
      ORDER_COLUMN_CONFIG.map((col) => ({
        value: col.key,
        type: col.filterType,
        labelKey: col.labelKey,
      })),
    []
  );

  const exportColumns = useMemo(
    () =>
      orderedVisibleColumns.map((key) => {
        const column = baseColumns.find((item) => item.key === key);
        return { key, label: column?.label ?? key };
      }),
    [baseColumns, orderedVisibleColumns]
  );

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(i18n.language);
  };

  const exportRows = useMemo<Record<string, unknown>[]>(
    () =>
      (orderExportQuery.data?.data ?? currentPageRows).map((order) => ({
        Id: order.id,
        OfferNo: order.offerNo ?? '-',
        PotentialCustomerName: order.potentialCustomerName ?? '-',
        RepresentativeName: order.representativeName ?? '-',
        OfferDate: order.offerDate ? new Date(order.offerDate).toLocaleDateString(i18n.language) : '-',
        Currency: order.currency ?? '-',
        GrandTotal: formatCurrency(order.grandTotal, order.currency ?? 'TRY'),
        Status: typeof order.status === 'number' && order.status >= 0 && order.status <= 4
          ? t(`approval.status.${['notRequired', 'waiting', 'approved', 'rejected', 'closed'][order.status]}`)
          : '-',
      })),
    [currentPageRows, orderExportQuery.data?.data, t, i18n.language]
  );

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, sortBy, sortDirection, approvalStatusFilter, appliedFilters]);

  const onSort = (column: OrderColumnKey): void => {
    if (sortBy === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortDirection('asc');
  };

  const renderSortIcon = (column: OrderColumnKey): ReactElement => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-foreground" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-foreground" />
    );
  };

  const renderCell = (order: OrderGetDto, key: OrderColumnKey): ReactElement | string | number => {
    if (key === 'Id') return order.id;
    if (key === 'OfferNo') return order.offerNo || '-';
    if (key === 'PotentialCustomerName') return order.potentialCustomerName || '-';
    if (key === 'RepresentativeName') return order.representativeName || '-';
    if (key === 'OfferDate') return formatDate(order.offerDate);
    if (key === 'Currency') return order.currency || '-';
    if (key === 'GrandTotal') return formatCurrency(order.grandTotal, order.currency || 'TRY');
    if (key === 'Status') {
      return typeof order.status === 'number' && order.status >= 0 && order.status <= 4 ? (
        <ApprovalStatusBadge status={order.status as ApprovalStatus} />
      ) : (
        <span className="text-muted-foreground text-sm">-</span>
      );
    }
    return '-';
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: [QUOTATION_QUERY_KEYS.QUOTATIONS] });
  };

  const handleRowClick = (orderId: number): void => {
    navigate(`/orders/${orderId}`);
  };

  return (
    <div className="relative min-h-screen space-y-6 p-3 md:p-8 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/10 blur-[120px] pointer-events-none dark:block hidden" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 blur-[120px] pointer-events-none dark:block hidden" />

      <div className="relative z-10 space-y-8 max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-2">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              {t('order.list.title')}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
              {t('order.list.description')}
            </p>
          </div>
          <Button
            onClick={() => navigate('/orders/create')}
            className="h-11 px-6 rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-bold shadow-lg shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all duration-300 border-0 hover:text-white group"
          >
            <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            {t('order.list.createNew')}
          </Button>
        </div>

        <div className="relative z-10 bg-white/80 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-xl shadow-zinc-200/50 dark:shadow-none overflow-hidden p-3 sm:p-6">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader className="space-y-4">
              <CardTitle>{t('order.list.cardTitle', { defaultValue: 'Sipariş listesi' })}</CardTitle>
              <DataTableActionBar
                pageKey={PAGE_KEY}
                userId={user?.id}
                columns={baseColumns}
                visibleColumns={visibleColumns}
                columnOrder={columnOrder}
                onVisibleColumnsChange={setVisibleColumns}
                onColumnOrderChange={setColumnOrder}
                exportFileName="order-list"
                exportColumns={exportColumns}
                exportRows={exportRows}
                filterColumns={filterColumns}
                defaultFilterColumn="OfferNo"
                draftFilterRows={draftFilterRows}
                onDraftFilterRowsChange={setDraftFilterRows}
                onApplyFilters={() => setAppliedFilterRows(draftFilterRows)}
                onClearFilters={() => {
                  setDraftFilterRows([]);
                  setAppliedFilterRows([]);
                }}
                translationNamespace="order"
                appliedFilterCount={appliedFilters.length}
                leftSlot={
                  <>
                    <Select value={approvalStatusFilter} onValueChange={setApprovalStatusFilter}>
                      <SelectTrigger className="w-[180px] h-9">
                        <SelectValue placeholder={t('approval.statusFilterLabel')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('common.all')}</SelectItem>
                        <SelectItem value="0">{t('approval.status.notRequired')}</SelectItem>
                        <SelectItem value="1">{t('approval.status.waiting')}</SelectItem>
                        <SelectItem value="2">{t('approval.status.approved')}</SelectItem>
                        <SelectItem value="3">{t('approval.status.rejected')}</SelectItem>
                        <SelectItem value="4">{t('approval.status.closed')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefresh()}
                      disabled={orderQuery.isFetching}
                    >
                      {orderQuery.isFetching ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      {t('order.list.refresh', { defaultValue: 'Yenile' })}
                    </Button>
                  </>
                }
              />
            </CardHeader>
            <CardContent>
              <OrderTable
                columns={columns}
                visibleColumnKeys={orderedVisibleColumns}
                rows={currentPageRows}
                rowKey={(row: OrderGetDto) => String(row.id)}
                renderCell={renderCell}
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSort={onSort}
                renderSortIcon={renderSortIcon}
                isLoading={orderQuery.isLoading}
                isError={orderQuery.isError}
                loadingText={t('order.loading')}
                errorText={t('order.loadError', { defaultValue: 'Veriler yüklenirken hata oluştu.' })}
                emptyText={t('order.noData')}
                minTableWidthClassName="min-w-[920px] lg:min-w-[1100px]"
                showActionsColumn
                actionsHeaderLabel={t('order.list.actions')}
                rowClassName="cursor-pointer hover:bg-muted/50 transition-colors"
                onRowClick={(order: OrderGetDto) => handleRowClick(order.id)}
                onRowDoubleClick={(order: OrderGetDto) => handleRowClick(order.id)}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageSizeChange={setPageSize}
                pageNumber={pageNumber}
                totalPages={totalPages}
                hasPreviousPage={hasPreviousPage}
                hasNextPage={hasNextPage}
                onPreviousPage={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
                onNextPage={() => setPageNumber((prev) => prev + 1)}
                previousLabel={t('order.previous')}
                nextLabel={t('order.next')}
                paginationInfoText={t('common.paginationInfo', {
                  start: startRow,
                  end: endRow,
                  total: totalCount,
                  ns: 'common',
                })}
                disablePaginationButtons={orderQuery.isFetching}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
