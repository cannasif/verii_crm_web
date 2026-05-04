import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import { rowsToBackendFilters, type FilterColumnConfig, type FilterRow } from '@/lib/advanced-filter-types';
import { fetchAllPagedData } from '@/lib/fetch-all-paged-data';
import { DataTableGrid, type DataTableActionBarProps, type DataTableGridColumn } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStockList } from '../hooks/useStockList';
import { stockApi } from '../api/stock-api';
import { STOCK_QUERY_KEYS } from '../utils/query-keys';
import type { StockGetDto } from '../types';
import type { PagedFilter } from '@/types/api';
import { StockBulkImageImportDialog } from './StockBulkImageImportDialog';
import {
  MANAGEMENT_DATA_GRID_CLASSNAME,
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME
} from '@/lib/management-list-layout';

const idColumnSurface = 'bg-slate-200/70 dark:bg-white/[0.07] border-r border-slate-300/90 dark:border-white/10';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResetKey, setSearchResetKey] = useState(0);
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);
  const [filterLogic, setFilterLogic] = useState<'and' | 'or'>('and');

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
        headClassName: cn(
          'py-5 text-[11px] font-bold uppercase tracking-[0.1em]',
          col.key === 'Id' ? idColumnSurface : '',
          col.key === 'unit' ? 'text-center w-[120px]' : 'px-4'
        ),
        cellClassName: cn(
          'py-4 transition-all duration-300',
          col.key === 'Id'
            ? cn('font-mono text-[11px] text-zinc-400 group-hover:text-pink-500/70 px-4 text-center w-[60px]', 'bg-slate-100/80 dark:bg-white/[0.04] border-r border-slate-200/90 dark:border-white/[0.08]')
            : col.key === 'ErpStockCode'
              ? 'font-bold text-sm text-zinc-700 dark:text-zinc-200 group-hover:text-pink-600 dark:group-hover:text-pink-400 px-4'
              : col.key === 'StockName'
                ? 'text-sm text-zinc-600 dark:text-zinc-300 font-medium px-4'
                : col.key === 'unit'
                  ? 'text-center'
                  : 'px-4'
        ),
        sortable: col.key !== 'unit',
      })),
    [baseColumns]
  );

  const defaultColumnKeys = useMemo(() => baseColumns.map((col) => col.key), [baseColumns]);
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultColumnKeys);

  useEffect(() => {
    setPageTitle(t('list.title'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys, 'Id');
    setColumnOrder(prefs.order);
    setVisibleColumns(prefs.visibleKeys);
  }, [defaultColumnKeys, user?.id]);

  const appliedFilters = useMemo(() => rowsToBackendFilters(appliedFilterRows), [appliedFilterRows]);
  const filtersParam: { filters?: PagedFilter[]; filterLogic?: 'and' | 'or' } =
    appliedFilters.length > 0 ? { filters: appliedFilters, filterLogic } : {};

  const stockQuery = useStockList({
    pageNumber,
    pageSize,
    search: searchTerm || undefined,
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
      currentPageRows.map((stock) => ({
        Id: `#${stock.id}`,
        ErpStockCode: stock.erpStockCode ?? '-',
        StockName: stock.stockName ?? '-',
        unit: stock.unit ?? '-',
      })),
    [currentPageRows]
  );

  const getExportData = useCallback(async (): Promise<{ columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }> => {
    const list = await fetchAllPagedData({
      fetchPage: (exportPageNumber, exportPageSize) =>
        stockApi.getList({
          pageNumber: exportPageNumber,
          pageSize: exportPageSize,
          search: searchTerm || undefined,
          sortBy,
          sortDirection,
          ...filtersParam,
        }),
    });
    return {
      columns: exportColumns,
      rows: list.map((stock: StockGetDto) => ({
        Id: `#${stock.id}`,
        ErpStockCode: stock.erpStockCode ?? '-',
        StockName: stock.stockName ?? '-',
        unit: stock.unit ?? '-',
      })),
    };
  }, [exportColumns, searchTerm, sortBy, sortDirection, filtersParam]);

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, sortBy, sortDirection, appliedFilters, filterLogic, searchTerm]);

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
          className="h-7 px-3 rounded-lg bg-zinc-100/80 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 font-bold text-[10px] uppercase tracking-wider border-zinc-200/50 dark:border-white/5 transition-all group-hover:bg-pink-500 group-hover:text-white group-hover:border-pink-400/50 shadow-xs"
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

  const handleGridRefresh = async (): Promise<void> => {
    setSearchTerm('');
    setSearchResetKey((value) => value + 1);
    setDraftFilterRows([]);
    setAppliedFilterRows([]);
    setFilterLogic('and');
    setPageNumber(1);
    await handleRefresh();
  };

  return (
    <div className="relative space-y-6 overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/10 blur-[120px] pointer-events-none dark:block hidden" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 blur-[120px] pointer-events-none dark:block hidden" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2 pb-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-foreground transition-colors">
            {t('list.title')}
          </h1>
          <p className="text-zinc-500 dark:text-muted-foreground text-sm flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
            {t('list.description')}
          </p>
        </div>
        <StockBulkImageImportDialog />
      </div>
      <div className={cn("relative z-10", MANAGEMENT_LIST_CARD_CLASSNAME)}>
        <Card className="border-2 bg-transparent shadow-none">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <CardTitle className={cn("text-xl font-bold flex items-center gap-3", MANAGEMENT_LIST_CARD_TITLE_CLASSNAME)}>
                  <div className="w-10 h-10 rounded-xl bg-linear-to-br from-pink-500/10 to-orange-500/10 flex items-center justify-center text-pink-600 dark:text-pink-400">
                    <Package size={20} />
                  </div>
                  {t('list.cardTitle', { defaultValue: 'Stok Yönetimi' })}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-2">
            <div className={MANAGEMENT_DATA_GRID_CLASSNAME}>
              <DataTableGrid<StockGetDto, StockColumnKey>
                actionBar={{
                  pageKey: PAGE_KEY,
                  userId: user?.id,
                  columns: baseColumns,
                  visibleColumns,
                  columnOrder,
                  onVisibleColumnsChange: setVisibleColumns,
                  onColumnOrderChange: (newVisibleOrder) => {
                    setColumnOrder((currentOrder) => {
                      const hiddenCols = currentOrder.filter((k) => !newVisibleOrder.includes(k));
                      const finalOrder = [...newVisibleOrder, ...hiddenCols];
                      saveColumnPreferences(PAGE_KEY, user?.id, { visibleKeys: visibleColumns, order: finalOrder });
                      return finalOrder;
                    });
                  },
                  exportFileName: 'stock-list',
                  exportColumns,
                  exportRows,
                  getExportData,
                  filterColumns,
                  defaultFilterColumn: 'StockName',
                  draftFilterRows,
                  onDraftFilterRowsChange: setDraftFilterRows,
                  filterLogic,
                  onFilterLogicChange: setFilterLogic,
                  onApplyFilters: () => setAppliedFilterRows(draftFilterRows),
                  onClearFilters: () => {
                    setDraftFilterRows([]);
                    setAppliedFilterRows([]);
                    setFilterLogic('and');
                  },
                  translationNamespace: 'stock',
                  appliedFilterCount: appliedFilters.length,
                  search: {
                    onSearchChange: setSearchTerm,
                    placeholder: t('common.search'),
                    minLength: 1,
                    resetKey: searchResetKey,
                  },
                  refresh: {
                    onRefresh: () => {
                      void handleGridRefresh();
                    },
                    isLoading: stockQuery.isFetching,
                    cooldownSeconds: 60,
                    label: t('list.refresh', { defaultValue: 'Yenile' }),
                  },
                } satisfies DataTableActionBarProps}
                columns={columns}
                visibleColumnKeys={orderedVisibleColumns}
                rows={currentPageRows}
                rowKey={(row) => row.id}
                renderCell={renderCell}
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSort={onSort}
                renderSortIcon={renderSortIcon}
                isLoading={stockQuery.isLoading || stockQuery.isFetching}
                isError={stockQuery.isError}
                loadingText={t('list.loading', { defaultValue: 'Yükleniyor...' })}
                errorText={t('list.loadError', { defaultValue: 'Veriler yüklenirken hata oluştu.' })}
                emptyText={t('list.noData', { defaultValue: 'Kayıt bulunamadı.' })}
                minTableWidthClassName="min-w-[900px]"
                showActionsColumn
                actionsHeaderLabel={t('list.actions')}
                renderActionsCell={(stock) => (
                  <div className="flex justify-end pr-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-xl text-zinc-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/10 transition-all duration-300 active:scale-95"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(stock.id);
                      }}
                    >
                      <Eye className="h-5 w-5" />
                    </Button>
                  </div>
                )}
                rowClassName="group cursor-pointer border-b border-zinc-50 dark:border-white/5 last:border-0 hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition-all duration-300"
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
                previousLabel={t('list.previous')}
                nextLabel={t('list.next')}
                paginationInfoText={t('common.paginationInfo', {
                  start: startRow,
                  end: endRow,
                  total: totalCount,
                  ns: 'common',
                })}
                disablePaginationButtons={stockQuery.isFetching}
                onColumnOrderChange={(newVisibleOrder) => {
                  setColumnOrder((currentOrder) => {
                    const hiddenCols = currentOrder.filter((k) => !(newVisibleOrder as string[]).includes(k));
                    const finalOrder = [...newVisibleOrder, ...hiddenCols];
                    saveColumnPreferences(PAGE_KEY, user?.id, { visibleKeys: visibleColumns, order: finalOrder });
                    return finalOrder;
                  });
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
