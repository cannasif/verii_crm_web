import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, CloudUpload, Eye, Heart, LayoutGrid, List } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import { rowsToBackendFilters, type FilterColumnConfig, type FilterRow } from '@/lib/advanced-filter-types';
import { fetchAllPagedData } from '@/lib/fetch-all-paged-data';
import { DataTableGrid, DataTableActionBar, ManagementDataTableChrome, ManagementListPageHeader, type DataTableGridColumn } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useStockList } from '../hooks/useStockList';
import { useStockListWithImages } from '../hooks/useStockListWithImages';
import { useToggleStockFavorite } from '../hooks/useToggleStockFavorite';
import { useCreateErpStock } from '../hooks/useCreateErpStock';
import { stockApi } from '../api/stock-api';
import { STOCK_QUERY_KEYS } from '../utils/query-keys';
import { getLocalizedStockName } from '../utils/localized-stock-name';
import type { StockGetDto, StockGetWithMainImageDto } from '../types';
import { StockGridCard } from './StockGridCard';
import { StockWarehouseBalanceBadge } from './StockWarehouseBalanceBadge';
import type { PagedFilter } from '@/types/api';
import { StockBulkImageImportDialog } from './StockBulkImageImportDialog';
import { StockMirrorCreateDialog } from './StockMirrorCreateDialog';
import { StockListCodeFilterPopover } from './StockListCodeFilterPopover';
import {
  EMPTY_SPECIAL_CODE_SELECTIONS,
  hasSpecialCodeSelection,
  type CatalogSpecialCodeSelections,
} from '@/components/shared/catalog-special-code-filter';
import { dedupeStocksByErpStockCode } from '../utils/dedupe-stocks-by-erp-code';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
  MANAGEMENT_LIST_ID_COLUMN_DEF,
} from '@/lib/management-list-layout';

import { arraysEqual, cn } from '@/lib/utils';
import { useMyPermissionsQuery } from '@/features/access-control/hooks/useMyPermissionsQuery';
import { hasPermission } from '@/features/access-control/utils/hasPermission';

const PAGE_KEY = 'stock-list';
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const LAYOUT_STORAGE_KEY = 'stock-list-layout';
const STOCK_CARD_CREATE_ENABLED = false;

function readStoredListLayout(): 'table' | 'grid' {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (raw === 'table' || raw === 'grid') {
      return raw;
    }
  } catch {
    return 'table';
  }
  return 'table';
}

type StockColumnKey = 'Id' | 'ErpStockCode' | 'StockName' | 'unit' | 'WarehouseBalance';
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
  const { t, i18n } = useTranslation(['stock', 'common']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setPageTitle } = useUIStore();
  const { user } = useAuthStore();

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<StockColumnKey>('Id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResetKey, setSearchResetKey] = useState(0);
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);
  const [filterLogic, setFilterLogic] = useState<'and' | 'or'>('and');
  const [draftSpecialCodeSelections, setDraftSpecialCodeSelections] =
    useState<CatalogSpecialCodeSelections>(EMPTY_SPECIAL_CODE_SELECTIONS);
  const [appliedSpecialCodeSelections, setAppliedSpecialCodeSelections] =
    useState<CatalogSpecialCodeSelections>(EMPTY_SPECIAL_CODE_SELECTIONS);
  const [listLayout, setListLayout] = useState<'table' | 'grid'>(readStoredListLayout);

  const persistListLayout = useCallback((mode: 'table' | 'grid'): void => {
    setListLayout(mode);
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, mode);
    } catch {
      return;
    }
  }, []);

  const baseColumns = useMemo(
    () =>
      STOCK_COLUMN_CONFIG.map((col) => ({
        key: col.key,
        label: resolveLabel(t, col.labelKey, col.fallbackLabel),
      })),
    [t]
  );

  const columns = useMemo<DataTableGridColumn<StockColumnKey>[]>(
    () => [
      ...baseColumns.map((col) => ({
        ...col,
        headClassName: cn(
          'py-3 text-[11px] font-bold uppercase tracking-[0.1em] px-4',
          col.key === 'Id' ? MANAGEMENT_LIST_ID_COLUMN_DEF.headClassName : '',
          col.key === 'unit' ? 'text-center w-[120px]' : '',
        ),
        cellClassName: cn(
          'py-2.5 transition-all duration-300 px-4',
          col.key === 'Id'
            ? MANAGEMENT_LIST_ID_COLUMN_DEF.className
            : col.key === 'ErpStockCode'
              ? 'font-semibold text-slate-900 dark:text-white'
              : col.key === 'StockName'
                ? 'text-sm text-slate-600 dark:text-slate-300'
                : col.key === 'unit'
                  ? 'text-center'
                  : '',
        ),
        sortable: col.key !== 'unit',
      })),
      {
        key: 'WarehouseBalance' as StockColumnKey,
        label: resolveLabel(t, 'list.warehouseBalance', 'Depo bakiyesi'),
        headClassName: 'py-3 text-[11px] font-bold uppercase tracking-[0.1em] px-4 text-center w-[120px]',
        cellClassName: 'py-2.5 px-4 text-center',
        sortable: false,
      },
    ],
    [baseColumns, t],
  );

  const defaultColumnKeys = useMemo(
    () => [...baseColumns.map((col) => col.key), 'WarehouseBalance' as StockColumnKey],
    [baseColumns],
  );
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultColumnKeys);

  useEffect(() => {
    setPageTitle(t('list.title'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys, 'Id');
    const mergedVisibleKeys = [
      ...prefs.visibleKeys,
      ...defaultColumnKeys.filter((key) => !prefs.visibleKeys.includes(key)),
    ];
    setColumnOrder((current) => arraysEqual(current, prefs.order) ? current : prefs.order);
    setVisibleColumns((current) => arraysEqual(current, mergedVisibleKeys) ? current : mergedVisibleKeys);
  }, [defaultColumnKeys, user?.id]);

  const appliedFilters = useMemo(() => rowsToBackendFilters(appliedFilterRows), [appliedFilterRows]);
  const hasCodeFilterSelection = hasSpecialCodeSelection(appliedSpecialCodeSelections);
  const filtersParam = useMemo<{ filters?: PagedFilter[]; filterLogic?: 'and' | 'or' }>(
    () =>
      appliedFilters.length > 0 && !hasCodeFilterSelection
        ? { filters: appliedFilters, filterLogic }
        : {},
    [appliedFilters, filterLogic, hasCodeFilterSelection]
  );

  const listQueryParams = useMemo(
    () => ({
      pageNumber,
      pageSize,
      search: searchTerm || undefined,
      sortBy,
      sortDirection,
      ...filtersParam,
    }),
    [pageNumber, pageSize, searchTerm, sortBy, sortDirection, filtersParam]
  );

  const stockTableQuery = useStockList(listQueryParams, {
    enabled: listLayout === 'table' && !hasCodeFilterSelection,
  });
  const stockGridQuery = useStockListWithImages(listQueryParams, {
    enabled: listLayout === 'grid' && !hasCodeFilterSelection,
  });

  const stockCodeFilterQuery = useQuery({
    queryKey: [
      STOCK_QUERY_KEYS.LIST,
      'code-filters',
      listLayout,
      pageNumber,
      pageSize,
      searchTerm,
      sortBy,
      sortDirection,
      appliedSpecialCodeSelections,
      appliedFilters,
      filterLogic,
    ] as const,
    queryFn: async (): Promise<{ data: StockGetDto[]; totalCount: number; hasNextPage: boolean; hasPreviousPage: boolean; totalPages: number }> => {
      const request = {
        pageNumber,
        pageSize,
        search: searchTerm || undefined,
        sortBy,
        sortDirection,
        filterLogic,
        filters: appliedFilters,
        codeFilters: appliedSpecialCodeSelections,
      };
      const result =
        listLayout === 'grid'
          ? await stockApi.getListWithImagesByCodeFilters(request)
          : await stockApi.getListByCodeFilters(request);
      const totalPages =
        result.totalPages ?? Math.max(1, Math.ceil((result.totalCount ?? 0) / pageSize));
      return {
        data: result.data ?? [],
        totalCount: result.totalCount ?? 0,
        hasNextPage: result.hasNextPage ?? pageNumber < totalPages,
        hasPreviousPage: result.hasPreviousPage ?? pageNumber > 1,
        totalPages,
      };
    },
    enabled: hasCodeFilterSelection,
    staleTime: 30_000,
  });

  const stockQuery = hasCodeFilterSelection
    ? stockCodeFilterQuery
    : listLayout === 'table'
      ? stockTableQuery
      : stockGridQuery;
  const toggleStockFavorite = useToggleStockFavorite();
  const createErpStock = useCreateErpStock();
  const { data: permissions } = useMyPermissionsQuery();
  const canCreateMirrorStock = STOCK_CARD_CREATE_ENABLED && hasPermission(permissions, 'stocks.mirror-create');
  const canCreateErpStock = STOCK_CARD_CREATE_ENABLED && hasPermission(permissions, 'stocks.erp-create');
  const pagedData = stockQuery.data;
  const currentPageRows = useMemo(() => {
    const rawRows =
      hasCodeFilterSelection && stockCodeFilterQuery.data
        ? stockCodeFilterQuery.data.data
        : (pagedData?.data ?? []);
    return dedupeStocksByErpStockCode(rawRows);
  }, [hasCodeFilterSelection, pagedData?.data, stockCodeFilterQuery.data]);
  const totalCount = hasCodeFilterSelection
    ? (stockCodeFilterQuery.data?.totalCount ?? 0)
    : (pagedData?.totalCount ?? 0);
  const hasNextPage = hasCodeFilterSelection
    ? (stockCodeFilterQuery.data?.hasNextPage ?? false)
    : (pagedData?.hasNextPage ?? false);
  const hasPreviousPage = hasCodeFilterSelection
    ? (stockCodeFilterQuery.data?.hasPreviousPage ?? pageNumber > 1)
    : (pagedData?.hasPreviousPage ?? pageNumber > 1);
  const totalPages = hasCodeFilterSelection
    ? (stockCodeFilterQuery.data?.totalPages ?? 1)
    : (pagedData?.totalPages ?? 1);
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);
  const hasActiveSearch = searchTerm.trim().length > 0;
  const hasApproximateSearchTotal = hasActiveSearch && hasNextPage;
  const paginationInfoText = t(
    hasApproximateSearchTotal ? 'common.paginationInfoApprox' : 'common.paginationInfo',
    {
      start: startRow,
      end: endRow,
      total: totalCount,
      ns: 'common',
    }
  );
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
        StockName: getLocalizedStockName(stock, i18n.language) || '-',
        unit: stock.unit ?? '-',
      })),
    [currentPageRows, i18n.language]
  );

  const getExportData = useCallback(async (): Promise<{ columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }> => {
    const list = hasCodeFilterSelection
      ? await fetchAllPagedData({
        fetchPage: (exportPageNumber, exportPageSize) =>
          stockApi.getListByCodeFilters({
            pageNumber: exportPageNumber,
            pageSize: exportPageSize,
            search: searchTerm || undefined,
            sortBy,
            sortDirection,
            filterLogic,
            filters: appliedFilters,
            codeFilters: appliedSpecialCodeSelections,
          }),
      })
      : await fetchAllPagedData({
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
        StockName: getLocalizedStockName(stock, i18n.language) || '-',
        unit: stock.unit ?? '-',
      })),
    };
  }, [
    exportColumns,
    searchTerm,
    sortBy,
    sortDirection,
    filtersParam,
    hasCodeFilterSelection,
    appliedSpecialCodeSelections,
    appliedFilters,
    filterLogic,
    i18n.language,
  ]);

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, sortBy, sortDirection, appliedFilters, filterLogic, searchTerm, appliedSpecialCodeSelections]);

  const onSort = (column: StockColumnKey): void => {
    if (column === 'unit' || column === 'WarehouseBalance') return;
    if (sortBy === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortDirection('asc');
  };

  const renderSortIcon = (column: StockColumnKey): ReactElement => {
    if (column === 'unit' || column === 'WarehouseBalance') return <></>;
    if (sortBy !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-foreground" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-foreground" />
    );
  };

  const navigateToStockDetail = (stockId: number): void => {
    navigate(`/stocks/${stockId}`);
  };

  const renderCell = (stock: StockGetDto, key: StockColumnKey): ReactElement | string => {
    if (key === 'Id') return `#${stock.id}`;
    if (key === 'ErpStockCode') {
      const text = stock.erpStockCode || '-';
      return (
        <span
          data-no-drag-scroll="true"
          className="block min-w-0 w-full cursor-pointer select-text py-0.5 -my-0.5"
          onDoubleClick={(e) => {
            e.stopPropagation();
            navigateToStockDetail(stock.id);
          }}
        >
          {text}
        </span>
      );
    }
    if (key === 'StockName') {
      const text = getLocalizedStockName(stock, i18n.language) || '-';
      return (
        <span
          data-no-drag-scroll="true"
          className="block min-w-0 w-full cursor-pointer select-text py-0.5 -my-0.5"
          onDoubleClick={(e) => {
            e.stopPropagation();
            navigateToStockDetail(stock.id);
          }}
        >
          {text}
        </span>
      );
    }
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
    if (key === 'WarehouseBalance') {
      return (
        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
          <StockWarehouseBalanceBadge
            stockId={stock.id}
            unit={stock.unit}
            balance={stock.balance}
            balanceText={stock.balanceText}
          />
        </div>
      );
    }
    return '-';
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: [STOCK_QUERY_KEYS.LIST] });
    await queryClient.invalidateQueries({ queryKey: [STOCK_QUERY_KEYS.LIST_WITH_IMAGES] });
    await queryClient.invalidateQueries({ queryKey: [STOCK_QUERY_KEYS.WAREHOUSE_BALANCES] });
    await queryClient.invalidateQueries({ queryKey: ['stock-list-code-filter-options'] });
  };

  const handleGridRefresh = async (): Promise<void> => {
    setSearchTerm('');
    setSearchResetKey((value) => value + 1);
    setDraftFilterRows([]);
    setAppliedFilterRows([]);
    setFilterLogic('and');
    setDraftSpecialCodeSelections(EMPTY_SPECIAL_CODE_SELECTIONS);
    setAppliedSpecialCodeSelections(EMPTY_SPECIAL_CODE_SELECTIONS);
    setPageNumber(1);
    await handleRefresh();
  };

  const handleApplySpecialCodeFilters = (): void => {
    setAppliedSpecialCodeSelections(draftSpecialCodeSelections);
    setPageNumber(1);
  };

  const handleClearSpecialCodeFilters = (): void => {
    setDraftSpecialCodeSelections(EMPTY_SPECIAL_CODE_SELECTIONS);
    setAppliedSpecialCodeSelections(EMPTY_SPECIAL_CODE_SELECTIONS);
    setPageNumber(1);
  };

  return (
    <div className="w-full space-y-6 relative">
      <ManagementListPageHeader
        title={t('list.title')}
        description={t('list.description')}
        backLabel={t('common.back', { ns: 'common', defaultValue: 'Geri' })}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canCreateMirrorStock ? <StockMirrorCreateDialog /> : null}
            <StockBulkImageImportDialog />
          </div>
        }
      />
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
            additionalFilterActions={
              <StockListCodeFilterPopover
                draftSelections={draftSpecialCodeSelections}
                onDraftSelectionsChange={setDraftSpecialCodeSelections}
                appliedSelections={appliedSpecialCodeSelections}
                onApply={handleApplySpecialCodeFilters}
                onClearApplied={handleClearSpecialCodeFilters}
              />
            }
            translationNamespace="stock"
            appliedFilterCount={appliedFilters.length}
            search={{
              onSearchChange: setSearchTerm,
              placeholder: t('common.search'),
              minLength: 1,
              resetKey: searchResetKey,
              className: 'max-w-[110px] sm:max-w-none',
              wrapperClassName: 'max-sm:flex-none',
            }}
            refresh={{
              onRefresh: () => {
                void handleGridRefresh();
              },
              isLoading: stockQuery.isFetching,
              cooldownSeconds: 60,
              label: resolveLabel(t, 'list.refresh', 'Yenile'),
            }}
            leftSlot={
              <div
                className="flex shrink-0 gap-0.5 rounded-lg border border-slate-300/90 bg-slate-50 p-0.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none"
                role="group"
                aria-label={t('list.viewModeGroupLabel')}
              >
                <Button
                  type="button"
                  variant={listLayout === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-8 rounded-md px-2 text-slate-600 dark:text-slate-300 sm:h-8 sm:rounded-lg sm:px-2.5',
                    listLayout === 'table' &&
                    'border border-pink-500/30 bg-pink-500/15 text-pink-700 shadow-[0_0_14px_rgba(236,72,153,0.2)] dark:text-pink-100'
                  )}
                  onClick={() => persistListLayout('table')}
                  aria-pressed={listLayout === 'table'}
                  title={t('list.viewModeTable')}
                >
                  <List className="h-4 w-4" />
                  <span className="ml-1.5 hidden text-xs font-medium sm:inline">{t('list.viewModeTable')}</span>
                </Button>
                <Button
                  type="button"
                  variant={listLayout === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-8 rounded-md px-2 text-slate-600 dark:text-slate-300 sm:h-8 sm:rounded-lg sm:px-2.5',
                    listLayout === 'grid' &&
                    'border border-pink-500/30 bg-pink-500/15 text-pink-700 shadow-[0_0_14px_rgba(236,72,153,0.2)] dark:text-pink-100'
                  )}
                  onClick={() => persistListLayout('grid')}
                  aria-pressed={listLayout === 'grid'}
                  title={t('list.viewModeGrid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="ml-1.5 hidden text-xs font-medium sm:inline">{t('list.viewModeGrid')}</span>
                </Button>
              </div>
            }
          />
        </CardHeader>
        <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
          {listLayout === 'table' ? (
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
                  minTableWidthClassName="min-w-[1020px]"
                  showActionsColumn
                  actionsHeaderLabel={t('list.actions')}
                  renderActionsCell={(stock) => (
                    <div className="flex justify-end gap-2 opacity-100 transition-opacity pr-4">
                      {canCreateErpStock && !stock.isERPIntegrated ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                          disabled={createErpStock.isPending}
                          aria-label={t('list.createErpStock')}
                          title={t('list.createErpStock')}
                          onClick={(e) => {
                            e.stopPropagation();
                            createErpStock.mutate(stock.id);
                          }}
                        >
                          <CloudUpload className="h-4 w-4" />
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-8 w-8 text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/10',
                          stock.isFavorite && 'text-pink-600 dark:text-pink-400'
                        )}
                        disabled={toggleStockFavorite.isPending}
                        aria-label={stock.isFavorite ? t('list.removeFavorite') : t('list.addFavorite')}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStockFavorite.mutate({
                            stockId: stock.id,
                            data: { isFavorite: !stock.isFavorite },
                          });
                        }}
                      >
                        <Heart className={cn('h-4 w-4', stock.isFavorite && 'fill-current')} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToStockDetail(stock.id);
                        }}
                      >
                        <Eye size={16} />
                      </Button>
                    </div>
                  )}
                  rowClassName="group"
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
                  paginationInfoText={paginationInfoText}
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
          ) : (
            <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
              <div className="relative overflow-hidden rounded-md">
                <div
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(244,63,94,0.06),transparent_55%),radial-gradient(ellipse_60%_40%_at_100%_100%,rgba(148,163,184,0.08),transparent_60%)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(244,63,94,0.08),transparent_55%)]"
                  aria-hidden
                />
                <div className="relative max-h-[min(70vh,calc(100svh-16rem))] overflow-y-auto px-1 pt-1.5 sm:px-2 sm:pt-2">
                  {stockQuery.isLoading ? (
                    <div className="grid grid-cols-1 gap-2.5 pb-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 2xl:gap-3">
                      {Array.from({ length: Math.min(pageSize, 10) }).map((_, i) => (
                        <div
                          key={`grid-skel-${i}`}
                          className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
                        >
                          <Skeleton className="aspect-[16/9] w-full rounded-none bg-slate-200/70 dark:bg-white/10" />
                          <div className="space-y-2 p-2.5">
                            <Skeleton className="h-3 w-2/3 bg-slate-200/70 dark:bg-white/10" />
                            <Skeleton className="h-4 w-full bg-slate-200/70 dark:bg-white/10" />
                            <Skeleton className="h-3 w-1/2 bg-slate-200/70 dark:bg-white/10" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {!stockQuery.isLoading && stockQuery.isError ? (
                    <div className="py-12 text-center text-sm text-red-600 dark:text-red-400">
                      {t('list.loadError', { defaultValue: 'Veriler yüklenirken hata oluştu.' })}
                    </div>
                  ) : null}
                  {!stockQuery.isLoading && !stockQuery.isError && currentPageRows.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      {t('list.noData', { defaultValue: 'Kayıt bulunamadı.' })}
                    </div>
                  ) : null}
                  {!stockQuery.isLoading && !stockQuery.isError && currentPageRows.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2.5 pb-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 2xl:gap-3">
                      {(currentPageRows as StockGetWithMainImageDto[]).map((stock) => (
                        <StockGridCard
                          key={stock.id}
                          stock={stock}
                          onNavigateDetail={navigateToStockDetail}
                          onToggleFavorite={(stockId, next) => {
                            toggleStockFavorite.mutate({ stockId, data: { isFavorite: next } });
                          }}
                          isFavoritePending={toggleStockFavorite.isPending}
                          favoriteLabelOn={t('list.removeFavorite')}
                          favoriteLabelOff={t('list.addFavorite')}
                          detailLabel={t('list.viewDetail')}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/90 px-3 pb-6 pt-3 sm:px-4 dark:border-white/10">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-slate-300 bg-white px-3 shadow-sm hover:bg-stone-50 dark:border-white/15 dark:bg-transparent dark:shadow-none"
                      >
                        <span>{pageSize}</span>
                        <ChevronDown className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-24">
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <DropdownMenuItem key={size} onClick={() => setPageSize(size)}>
                          {size}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="text-xs text-muted-foreground">
                    {paginationInfoText}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-300 bg-white shadow-sm hover:bg-stone-50 dark:border-white/15 dark:bg-transparent dark:shadow-none"
                    onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
                    disabled={!hasPreviousPage || stockQuery.isFetching}
                  >
                    {t('list.previous')}
                  </Button>
                  <span className="px-2 text-xs text-muted-foreground">
                    {pageNumber} / {Math.max(totalPages, 1)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-300 bg-white shadow-sm hover:bg-stone-50 dark:border-white/15 dark:bg-transparent dark:shadow-none"
                    onClick={() => setPageNumber((prev) => prev + 1)}
                    disabled={!hasNextPage || stockQuery.isFetching}
                  >
                    {t('list.next')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
