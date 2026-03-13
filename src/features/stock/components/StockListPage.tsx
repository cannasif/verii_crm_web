import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Loader2, RefreshCw } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { loadColumnPreferences } from '@/lib/column-preferences';
import { rowsToBackendFilters, type FilterColumnConfig, type FilterRow } from '@/lib/advanced-filter-types';
import { DataTableActionBar, type DataTableGridColumn } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StockTable } from './StockTable';
import { useStockList } from '../hooks/useStockList';
import { STOCK_QUERY_KEYS } from '../utils/query-keys';
import type { StockGetDto } from '../types';
import type { PagedFilter } from '@/types/api';

const PAGE_KEY = 'stock-list';
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type StockColumnKey = 'Id' | 'ErpStockCode' | 'StockName' | 'unit';
type SortDirection = 'asc' | 'desc';

type StockColumnConfig = {
  key: StockColumnKey;
  labelKey: string;
  fallbackLabel: string;
  filterType: FilterColumnConfig['type'];
};

const STOCK_COLUMN_CONFIG: readonly StockColumnConfig[] = [
  { key: 'Id', labelKey: 'stock.list.id', fallbackLabel: 'ID', filterType: 'number' },
  { key: 'ErpStockCode', labelKey: 'stock.list.erpStockCode', fallbackLabel: 'ERP Kodu', filterType: 'string' },
  { key: 'StockName', labelKey: 'stock.list.stockName', fallbackLabel: 'Stok Adı', filterType: 'string' },
  { key: 'unit', labelKey: 'stock.list.unit', fallbackLabel: 'Birim', filterType: 'string' },
];

function resolveLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  key: string,
  fallback: string
): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

export function StockListPage(): ReactElement {
  const { t } = useTranslation(['stock', 'common']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setPageTitle } = useUIStore();
  const { user } = useAuthStore();

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<StockColumnKey>('Id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const baseColumns = useMemo(
    () =>
      STOCK_COLUMN_CONFIG.map((col) => ({
        key: col.key,
        label: resolveLabel(t, col.labelKey, col.fallbackLabel),
      })),
    [t]
  );

  const columns = useMemo<DataTableGridColumn<StockColumnKey>[]>(
    () =>
      baseColumns.map((col) => ({
        ...col,
        headClassName:
          col.key === 'unit'
            ? 'py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 text-center w-[100px]'
            : 'group cursor-pointer select-none py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors',
        cellClassName:
          col.key === 'Id'
            ? 'font-mono text-xs text-zinc-400 group-hover:text-zinc-500'
            : col.key === 'ErpStockCode'
              ? 'font-semibold text-sm text-zinc-700 dark:text-zinc-200 group-hover:text-pink-700 dark:group-hover:text-pink-400 transition-colors'
              : col.key === 'StockName'
                ? 'text-sm text-zinc-600 dark:text-zinc-300 font-medium'
                : col.key === 'unit'
                  ? 'text-center'
                  : undefined,
        sortable: col.key !== 'unit',
      })),
    [baseColumns]
  );

  const defaultColumnKeys = useMemo(() => baseColumns.map((col) => col.key), [baseColumns]);
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultColumnKeys);

  useEffect(() => {
    setPageTitle(t('stock.list.title'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys, 'Id');
    setColumnOrder(prefs.order);
    setVisibleColumns(prefs.visibleKeys);
  }, [defaultColumnKeys, user?.id]);

  const appliedFilters = useMemo(() => rowsToBackendFilters(appliedFilterRows), [appliedFilterRows]);
  const filtersParam: { filters?: PagedFilter[] } =
    appliedFilters.length > 0 ? { filters: appliedFilters } : {};

  const stockQuery = useStockList({
    pageNumber,
    pageSize,
    sortBy,
    sortDirection,
    ...filtersParam,
  });
  const stockExportQuery = useStockList({
    pageNumber: 1,
    pageSize: 10000,
    sortBy,
    sortDirection,
    ...filtersParam,
  });

  const pagedData = stockQuery.data;
  const currentPageRows = useMemo(() => pagedData?.data ?? [], [pagedData?.data]);
  const totalCount = pagedData?.totalCount ?? 0;
  const hasNextPage = pagedData?.hasNextPage ?? false;
  const hasPreviousPage = pagedData?.hasPreviousPage ?? pageNumber > 1;
  const totalPages = pagedData?.totalPages ?? 1;
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);
  const orderedVisibleColumns = columnOrder.filter((key) => visibleColumns.includes(key)) as StockColumnKey[];

  const filterColumns = useMemo<FilterColumnConfig[]>(
    () =>
      STOCK_COLUMN_CONFIG.map((col) => ({
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

  const exportRows = useMemo<Record<string, unknown>[]>(
    () =>
      (stockExportQuery.data?.data ?? currentPageRows).map((stock) => ({
        Id: `#${stock.id}`,
        ErpStockCode: stock.erpStockCode ?? '-',
        StockName: stock.stockName ?? '-',
        unit: stock.unit ?? '-',
      })),
    [currentPageRows, stockExportQuery.data?.data]
  );

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, sortBy, sortDirection, appliedFilters]);

  const onSort = (column: StockColumnKey): void => {
    if (column === 'unit') return;
    if (sortBy === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortDirection('asc');
  };

  const renderSortIcon = (column: StockColumnKey): ReactElement => {
    if (column === 'unit') return <></>;
    if (sortBy !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-foreground" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-foreground" />
    );
  };

  const renderCell = (stock: StockGetDto, key: StockColumnKey): ReactElement | string => {
    if (key === 'Id') return `#${stock.id}`;
    if (key === 'ErpStockCode') return stock.erpStockCode || '-';
    if (key === 'StockName') return stock.stockName || '-';
    if (key === 'unit') {
      return (
        <Badge
          variant="secondary"
          className="bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 border-zinc-200 dark:border-white/10"
        >
          {stock.unit || '-'}
        </Badge>
      );
    }
    return '-';
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: [STOCK_QUERY_KEYS.LIST] });
    await queryClient.invalidateQueries({ queryKey: [STOCK_QUERY_KEYS.LIST_WITH_IMAGES] });
  };

  const handleRowClick = (stockId: number): void => {
    navigate(`/stocks/${stockId}`);
  };

  return (
    <div className="relative space-y-6 p-4 md:p-6 overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/10 blur-[120px] pointer-events-none dark:block hidden" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 blur-[120px] pointer-events-none dark:block hidden" />

      <div className="relative z-10 space-y-1 pb-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-foreground">
          {t('stock.list.title')}
        </h1>
        <p className="text-zinc-500 dark:text-muted-foreground text-sm flex items-center gap-2 font-medium">
          <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
          {t('stock.list.description')}
        </p>
      </div>

      <div className="relative z-10 bg-white/50 dark:bg-card/30 backdrop-blur-xl border border-white/20 dark:border-border/50 rounded-2xl shadow-sm dark:shadow-2xl overflow-hidden">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="space-y-4">
            <CardTitle>{t('stock.list.cardTitle', { defaultValue: 'Stok listesi' })}</CardTitle>
            <DataTableActionBar
              pageKey={PAGE_KEY}
              userId={user?.id}
              columns={baseColumns}
              visibleColumns={visibleColumns}
              columnOrder={columnOrder}
              onVisibleColumnsChange={setVisibleColumns}
              onColumnOrderChange={setColumnOrder}
              exportFileName="stock-list"
              exportColumns={exportColumns}
              exportRows={exportRows}
              filterColumns={filterColumns}
              defaultFilterColumn="StockName"
              draftFilterRows={draftFilterRows}
              onDraftFilterRowsChange={setDraftFilterRows}
              onApplyFilters={() => setAppliedFilterRows(draftFilterRows)}
              onClearFilters={() => {
                setDraftFilterRows([]);
                setAppliedFilterRows([]);
              }}
              translationNamespace="stock"
              appliedFilterCount={appliedFilters.length}
              leftSlot={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRefresh()}
                  disabled={stockQuery.isFetching}
                >
                  {stockQuery.isFetching ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {t('stock.list.refresh', { defaultValue: 'Yenile' })}
                </Button>
              }
            />
          </CardHeader>
          <CardContent>
            <StockTable
              columns={columns}
              visibleColumnKeys={orderedVisibleColumns}
              rows={currentPageRows}
              rowKey={(row) => row.id}
              renderCell={renderCell}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={onSort}
              renderSortIcon={renderSortIcon}
              isLoading={stockQuery.isLoading}
              isError={stockQuery.isError}
              loadingText={t('stock.list.loading', { defaultValue: 'Yükleniyor...' })}
              errorText={t('stock.list.loadError', { defaultValue: 'Veriler yüklenirken hata oluştu.' })}
              emptyText={t('stock.list.noData', { defaultValue: 'Kayıt bulunamadı.' })}
              minTableWidthClassName="min-w-[900px]"
              showActionsColumn
              actionsHeaderLabel={t('stock.list.actions')}
              renderActionsCell={(stock) => (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-zinc-400 hover:text-pink-600 hover:bg-pink-100/50 dark:hover:bg-pink-900/30 opacity-70 group-hover:opacity-100 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRowClick(stock.id);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              rowClassName="group cursor-pointer border-b border-zinc-100 dark:border-white/5 last:border-0 hover:bg-pink-50/60 dark:hover:bg-pink-900/10 transition-colors duration-200"
              onRowClick={(stock) => handleRowClick(stock.id)}
              onRowDoubleClick={(stock) => handleRowClick(stock.id)}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={setPageSize}
              pageNumber={pageNumber}
              totalPages={totalPages}
              hasPreviousPage={hasPreviousPage}
              hasNextPage={hasNextPage}
              onPreviousPage={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
              onNextPage={() => setPageNumber((prev) => prev + 1)}
              previousLabel={t('stock.list.previous')}
              nextLabel={t('stock.list.next')}
              paginationInfoText={t('common.paginationInfo', {
                start: startRow,
                end: endRow,
                total: totalCount,
                ns: 'common',
              })}
              disablePaginationButtons={stockQuery.isFetching}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
