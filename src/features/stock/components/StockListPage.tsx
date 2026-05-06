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
import { DataTableGrid, DataTableActionBar, ManagementDataTableChrome, type DataTableGridColumn } from '@/components/shared';
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
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
} from '@/lib/management-list-layout';

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
          'py-3 text-[11px] font-bold uppercase tracking-[0.1em] px-4',
          col.key === 'unit' ? 'text-center w-[120px]' : ''
        ),
        cellClassName: cn(
          'py-2.5 transition-all duration-300 px-4',
          col.key === 'Id'
            ? 'font-medium text-slate-500 w-[80px]'
            : col.key === 'ErpStockCode'
              ? 'font-semibold text-slate-900 dark:text-white'
              : col.key === 'StockName'
                ? 'text-sm text-slate-600 dark:text-slate-300'
                : col.key === 'unit'
                  ? 'text-center'
                  : ''
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
    <div className="w-full space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('list.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('list.description')}
          </p>
        </div>
        <StockBulkImageImportDialog />
      </div>
      <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
          <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
            <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>
              {t('list.cardTitle', { defaultValue: 'Stok Yönetimi' })}
            </CardTitle>
            <DataTableActionBar
              pageKey={PAGE_KEY}
              userId={user?.id}
              columns={baseColumns}
              visibleColumns={visibleColumns}
              columnOrder={columnOrder}
              onVisibleColumnsChange={setVisibleColumns}
              onColumnOrderChange={(newVisibleOrder) => {
                setColumnOrder((currentOrder) => {
                  const hiddenCols = currentOrder.filter((k) => !newVisibleOrder.includes(k));
                  const finalOrder = [...newVisibleOrder, ...hiddenCols];
                  saveColumnPreferences(PAGE_KEY, user?.id, { visibleKeys: visibleColumns, order: finalOrder });
                  return finalOrder;
                });
              }}
              exportFileName="stock-list"
              exportColumns={exportColumns}
              exportRows={exportRows}
              getExportData={getExportData}
              filterColumns={filterColumns}
              defaultFilterColumn="StockName"
              draftFilterRows={draftFilterRows}
              onDraftFilterRowsChange={setDraftFilterRows}
              filterLogic={filterLogic}
              onFilterLogicChange={setFilterLogic}
              onApplyFilters={() => setAppliedFilterRows(draftFilterRows)}
              onClearFilters={() => {
                setDraftFilterRows([]);
                setAppliedFilterRows([]);
                setFilterLogic('and');
                setSearchResetKey((value) => value + 1);
              }}
              translationNamespace="stock"
              appliedFilterCount={appliedFilters.length}
              search={{
                onSearchChange: setSearchTerm,
                placeholder: t('common.search'),
                minLength: 1,
                resetKey: searchResetKey,
              }}
              refresh={{
                onRefresh: () => {
                  void handleGridRefresh();
                },
                isLoading: stockQuery.isFetching,
                cooldownSeconds: 60,
                label: resolveLabel(t, 'list.refresh', 'Yenile'),
              }}
            />
          </CardHeader>
          <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
            <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
              <ManagementDataTableChrome>
                <DataTableGrid<StockGetDto, StockColumnKey>
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
                  <div className="flex justify-end gap-2 opacity-100 transition-opacity pr-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(stock.id);
                      }}
                    >
                      <Eye size={16} />
                    </Button>
                  </div>
                )}
                rowClassName="group"
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
                centerColumnHeaders
                onColumnOrderChange={(newVisibleOrder) => {
                  setColumnOrder((currentOrder) => {
                    const hiddenCols = currentOrder.filter((k) => !(newVisibleOrder as string[]).includes(k));
                    const finalOrder = [...newVisibleOrder, ...hiddenCols];
                    saveColumnPreferences(PAGE_KEY, user?.id, { visibleKeys: visibleColumns, order: finalOrder });
                    return finalOrder;
                  });
                }}
              />
            </ManagementDataTableChrome>
          </div>
          </CardContent>
      </Card>
    </div>
  );
}
