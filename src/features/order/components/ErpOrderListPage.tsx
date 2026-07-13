import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Loader2, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import { applyFilterRowsClient, type FilterColumnConfig, type FilterRow } from '@/lib/advanced-filter-types';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
  MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME,
} from '@/lib/management-list-layout';
import { arraysEqual, cn } from '@/lib/utils';
import { matchesSearchTerm } from '@/lib/search';
import { DataTableActionBar, DataTableGrid, ManagementDataTableChrome, type DataTableGridColumn } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ERP_ORDER_QUERY_KEYS, useErpOrderLines, useErpOrders } from '../hooks/useErpOrders';
import type { NetsisOrderHeader, NetsisOrderLine } from '../types/erp-order-types';

const PAGE_KEY = 'erp-order-list';
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type ErpOrderColumnKey = keyof NetsisOrderHeader;
type SortDirection = 'asc' | 'desc';

const ERP_ORDER_COLUMNS: Array<{
  key: ErpOrderColumnKey;
  labelKey: string;
  fallbackLabel: string;
  filterType: FilterColumnConfig['type'];
  className?: string;
}> = [
  { key: 'subeKodu', labelKey: 'erpOrder.table.branchCode', fallbackLabel: 'Şube', filterType: 'number', className: 'text-center font-medium' },
  { key: 'fatirsNo', labelKey: 'erpOrder.table.orderNo', fallbackLabel: 'Sipariş No', filterType: 'string', className: 'font-semibold whitespace-nowrap' },
  { key: 'cariKodu', labelKey: 'erpOrder.table.customerCode', fallbackLabel: 'Cari Kodu', filterType: 'string', className: 'whitespace-nowrap' },
  { key: 'cariIsim', labelKey: 'erpOrder.table.customerName', fallbackLabel: 'Cari Adı', filterType: 'string', className: 'min-w-[220px] font-medium' },
  { key: 'tarih', labelKey: 'erpOrder.table.date', fallbackLabel: 'Tarih', filterType: 'string', className: 'whitespace-nowrap' },
  { key: 'teslimTarihi', labelKey: 'erpOrder.table.deliveryDate', fallbackLabel: 'Teslim Tarihi', filterType: 'string', className: 'whitespace-nowrap' },
  { key: 'brutTutar', labelKey: 'erpOrder.table.grossTotal', fallbackLabel: 'Brüt Tutar', filterType: 'number', className: 'text-right font-medium' },
  { key: 'kdv', labelKey: 'erpOrder.table.vat', fallbackLabel: 'KDV', filterType: 'number', className: 'text-right font-medium' },
  { key: 'genelToplam', labelKey: 'erpOrder.table.grandTotal', fallbackLabel: 'Genel Toplam', filterType: 'number', className: 'text-right font-semibold' },
  { key: 'plasiyerKodu', labelKey: 'erpOrder.table.salesRepCode', fallbackLabel: 'Plasiyer', filterType: 'string', className: 'whitespace-nowrap' },
];

function resolveLabel(t: (key: string, options?: Record<string, unknown>) => string, key: string, fallback: string): string {
  const translated = t(key, { ns: 'order' });
  return !translated || translated === key || translated === 'Çeviri eksik' ? fallback : translated;
}

function formatNumber(value: number | null | undefined, locale: string, fractionDigits = 2): string {
  if (value == null || !Number.isFinite(Number(value))) {
    return '-';
  }

  return new Intl.NumberFormat(locale || 'tr-TR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number(value));
}

function normalize(value: unknown): string | number {
  if (typeof value === 'number') return value;
  if (value == null) return '';
  return String(value).toLocaleLowerCase('tr-TR');
}

function sortRows(rows: NetsisOrderHeader[], sortBy: ErpOrderColumnKey, sortDirection: SortDirection): NetsisOrderHeader[] {
  return [...rows].sort((a, b) => {
    const left = normalize(a[sortBy]);
    const right = normalize(b[sortBy]);
    const compare = typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left).localeCompare(String(right), 'tr-TR');
    return sortDirection === 'asc' ? compare : -compare;
  });
}

function DetailLineTable({
  rows,
  isLoading,
  emptyText,
  loadingText,
  locale,
}: {
  rows: NetsisOrderLine[];
  isLoading: boolean;
  emptyText: string;
  loadingText: string;
  locale: string;
}): ReactElement {
  const { t } = useTranslation('order');

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow>
            <TableHead>{t('erpOrder.lines.rowNo')}</TableHead>
            <TableHead>{t('erpOrder.lines.stockCode')}</TableHead>
            <TableHead>{t('erpOrder.lines.stockName')}</TableHead>
            <TableHead className="text-right">{t('erpOrder.lines.quantity')}</TableHead>
            <TableHead>{t('erpOrder.lines.unit')}</TableHead>
            <TableHead className="text-right">{t('erpOrder.lines.netPrice')}</TableHead>
            <TableHead className="text-right">{t('erpOrder.lines.vatRate')}</TableHead>
            <TableHead className="text-center">{t('erpOrder.lines.warehouseCode')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                {loadingText}
              </TableCell>
            </TableRow>
          )}
          {!isLoading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                {emptyText}
              </TableCell>
            </TableRow>
          )}
          {!isLoading && rows.map((line) => (
            <TableRow key={`${line.fatirsNo}-${line.sira}-${line.stokKodu}`}>
              <TableCell className="font-medium">{line.sira || '-'}</TableCell>
              <TableCell className="font-mono text-xs">{line.stokKodu || '-'}</TableCell>
              <TableCell className="min-w-[220px] font-medium">{line.stokAdi || '-'}</TableCell>
              <TableCell className="text-right">{formatNumber(line.miktar, locale)}</TableCell>
              <TableCell>{line.olcuBr1 || '-'}</TableCell>
              <TableCell className="text-right">{formatNumber(line.netFiyat, locale)}</TableCell>
              <TableCell className="text-right">{formatNumber(line.kdvOrani, locale)}</TableCell>
              <TableCell className="text-center">{line.depoKodu || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function ErpOrderListPage(): ReactElement {
  const { t, i18n } = useTranslation(['order', 'common']);
  const { setPageTitle } = useUIStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<ErpOrderColumnKey>('tarih');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedOrder, setSelectedOrder] = useState<NetsisOrderHeader | null>(null);
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const baseColumns = useMemo(
    () =>
      ERP_ORDER_COLUMNS.map((column) => ({
        key: column.key,
        label: resolveLabel(t, column.labelKey, column.fallbackLabel),
      })),
    [t]
  );
  const defaultColumnKeys = useMemo(() => baseColumns.map((column) => column.key), [baseColumns]);
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultColumnKeys);

  const orderQuery = useErpOrders();
  const lineQuery = useErpOrderLines(selectedOrder?.fatirsNo);

  useEffect(() => {
    setPageTitle(t('erpOrder.title'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys, 'fatirsNo');
    setColumnOrder((current) => arraysEqual(current, prefs.order) ? current : prefs.order);
    setVisibleColumns((current) => arraysEqual(current, prefs.visibleKeys) ? current : prefs.visibleKeys);
  }, [defaultColumnKeys, user?.id]);

  const columns = useMemo<DataTableGridColumn<ErpOrderColumnKey>[]>(
    () =>
      ERP_ORDER_COLUMNS.map((column) => ({
        key: column.key,
        label: resolveLabel(t, column.labelKey, column.fallbackLabel),
        sortable: true,
        headClassName: column.className?.includes('text-right')
          ? 'text-right'
          : column.className?.includes('text-center')
            ? 'text-center'
            : undefined,
        cellClassName: column.className,
      })),
    [t]
  );

  const sourceRows = useMemo(() => orderQuery.data ?? [], [orderQuery.data]);
  const filteredRows = useMemo(() => {
    const advancedFilteredRows = applyFilterRowsClient(sourceRows, appliedFilterRows, ERP_ORDER_COLUMNS.map((column) => ({
      value: column.key,
      type: column.filterType,
      labelKey: column.labelKey,
    })));
    if (!searchTerm.trim()) return advancedFilteredRows;

    return advancedFilteredRows.filter((row) => matchesSearchTerm(searchTerm, [
        row.fatirsNo,
        row.cariKodu,
        row.cariIsim,
        row.plasiyerKodu,
        row.tarih,
        row.teslimTarihi,
      ]));
  }, [appliedFilterRows, searchTerm, sourceRows]);

  const filterColumns = useMemo<FilterColumnConfig[]>(
    () => ERP_ORDER_COLUMNS.map((column) => ({
      value: column.key,
      type: column.filterType,
      labelKey: column.labelKey,
    })),
    []
  );
  const appliedFilterCount = useMemo(
    () => appliedFilterRows.filter((row) => row.value.trim()).length,
    [appliedFilterRows]
  );

  const sortedRows = useMemo(() => sortRows(filteredRows, sortBy, sortDirection), [filteredRows, sortBy, sortDirection]);
  const orderedVisibleColumns = columnOrder.filter((key) => visibleColumns.includes(key)) as ErpOrderColumnKey[];

  const totalCount = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);
  const currentPageRows = useMemo(
    () => sortedRows.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
    [sortedRows, pageNumber, pageSize]
  );

  useEffect(() => {
    setPageNumber((current) => current === 1 ? current : 1);
  }, [pageSize, searchTerm, appliedFilterRows, sortBy, sortDirection]);

  const exportColumns = useMemo(
    () =>
      orderedVisibleColumns.map((key) => {
        const column = columns.find((item) => item.key === key);
        return { key, label: column?.label ?? key };
      }),
    [columns, orderedVisibleColumns]
  );
  const exportRows = useMemo<Record<string, unknown>[]>(
    () =>
      currentPageRows.map((row) => {
        const exportRow: Record<string, unknown> = {};
        orderedVisibleColumns.forEach((key) => {
          exportRow[key] = row[key] ?? '';
        });
        return exportRow;
      }),
    [orderedVisibleColumns, currentPageRows]
  );

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ERP_ORDER_QUERY_KEYS.all });
    if (selectedOrder?.fatirsNo) {
      await queryClient.invalidateQueries({ queryKey: ERP_ORDER_QUERY_KEYS.lines(selectedOrder.fatirsNo) });
    }
  };

  const renderCell = useCallback(
    (row: NetsisOrderHeader, key: ErpOrderColumnKey): React.ReactNode => {
      const value = row[key];
      if (key === 'brutTutar' || key === 'kdv' || key === 'genelToplam') {
        return formatNumber(Number(value), i18n.language);
      }
      if (key === 'fatirsNo') {
        return <span className="font-mono text-xs">{row.fatirsNo || '-'}</span>;
      }
      return value == null || value === '' ? '-' : String(value);
    },
    [i18n.language]
  );

  const renderSortIcon = (key: ErpOrderColumnKey): React.ReactNode => {
    if (sortBy !== key) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3.5 w-3.5 text-foreground" />
      : <ArrowDown className="h-3.5 w-3.5 text-foreground" />;
  };

  const selectedLines = lineQuery.data ?? [];

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-3 pt-2 pb-2 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 transition-colors dark:text-white">
            {t('erpOrder.title')}
          </h1>
          <p className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            {t('erpOrder.description')}
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {t('erpOrder.currentUserScope')}
        </Badge>
      </div>

      <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
        <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
          <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>
            {t('erpOrder.table.title')}
          </CardTitle>
          <DataTableActionBar
            pageKey={PAGE_KEY}
            userId={user?.id}
            columns={baseColumns}
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            onVisibleColumnsChange={setVisibleColumns}
            onColumnOrderChange={setColumnOrder}
            exportFileName="erp-orders"
            exportColumns={exportColumns}
            exportRows={exportRows}
            filterColumns={filterColumns}
            defaultFilterColumn="fatirsNo"
            draftFilterRows={draftFilterRows}
            onDraftFilterRowsChange={setDraftFilterRows}
            onApplyFilters={() => setAppliedFilterRows(draftFilterRows)}
            onClearFilters={() => {
              setDraftFilterRows([]);
              setAppliedFilterRows([]);
            }}
            translationNamespace="order"
            appliedFilterCount={appliedFilterCount}
            searchValue={searchTerm}
            searchPlaceholder={t('erpOrder.searchPlaceholder')}
            onSearchChange={setSearchTerm}
            leftSlot={
              <Button
                variant="outline"
                size="sm"
                className={MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME}
                onClick={() => void handleRefresh()}
                disabled={orderQuery.isLoading || lineQuery.isLoading}
              >
                {orderQuery.isFetching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {t('refresh', { ns: 'common' })}
              </Button>
            }
          />
        </CardHeader>
        <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
          <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
            <ManagementDataTableChrome>
              <DataTableGrid<NetsisOrderHeader, ErpOrderColumnKey>
                columns={columns}
                visibleColumnKeys={orderedVisibleColumns}
                rows={currentPageRows}
                rowKey={(row) => row.fatirsNo}
                renderCell={renderCell}
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSort={(key) => {
                  if (sortBy === key) {
                    setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy(key);
                    setSortDirection('asc');
                  }
                }}
                renderSortIcon={renderSortIcon}
                isLoading={orderQuery.isLoading}
                isError={orderQuery.isError}
                loadingText={t('erpOrder.loading')}
                errorText={orderQuery.error instanceof Error ? orderQuery.error.message : t('erpOrder.loadError')}
                emptyText={t('erpOrder.noData')}
                minTableWidthClassName="min-w-[1100px] lg:min-w-[1400px]"
                showActionsColumn
                iconOnlyActions={false}
                actionsHeaderLabel={t('actions', { ns: 'common' })}
                actionsCellClassName="text-right align-middle min-w-[120px]"
                renderActionsCell={(row) => (
                  <Button
                    variant={selectedOrder?.fatirsNo === row.fatirsNo ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 gap-2"
                    onClick={() => setSelectedOrder(row)}
                  >
                    <Eye className="h-4 w-4" />
                    <span>{t('erpOrder.detailAction')}</span>
                  </Button>
                )}
                onRowClick={setSelectedOrder}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPageNumber(1);
                }}
                pageNumber={pageNumber}
                totalPages={totalPages}
                hasPreviousPage={pageNumber > 1}
                hasNextPage={pageNumber < totalPages}
                onPreviousPage={() => setPageNumber((page) => Math.max(1, page - 1))}
                onNextPage={() => setPageNumber((page) => Math.min(totalPages, page + 1))}
                previousLabel={t('previous', { ns: 'common' })}
                nextLabel={t('next', { ns: 'common' })}
                paginationInfoText={t('common.table.showing', {
                  ns: 'common',
                  from: startRow,
                  to: endRow,
                  total: totalCount,
                })}
                disablePaginationButtons={false}
                rowClassName={(row) => cn(
                  'group cursor-pointer',
                  selectedOrder?.fatirsNo === row.fatirsNo && 'bg-emerald-50/70 dark:bg-emerald-500/10'
                )}
                onColumnOrderChange={(newVisibleOrder) => {
                  setColumnOrder((currentOrder) => {
                    const hiddenColumns = currentOrder.filter((key) => !newVisibleOrder.includes(key as ErpOrderColumnKey));
                    const finalOrder = [...newVisibleOrder, ...hiddenColumns];
                    saveColumnPreferences(PAGE_KEY, user?.id, { visibleKeys: visibleColumns, order: finalOrder });
                    return finalOrder;
                  });
                }}
              />
            </ManagementDataTableChrome>
          </div>
        </CardContent>
      </Card>

      {selectedOrder && (
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0f0a18]">
          <CardHeader className="border-b border-slate-100 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-xl font-bold">
                  {t('erpOrder.detailTitle', { orderNo: selectedOrder.fatirsNo })}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedOrder.cariKodu} - {selectedOrder.cariIsim || t('erpOrder.unknownCustomer')}
                </p>
              </div>
              <Badge className="w-fit bg-slate-900 text-white dark:bg-white dark:text-slate-950">
                {t('erpOrder.lineCount', { count: selectedLines.length })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-4 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                [t('erpOrder.table.branchCode'), selectedOrder.subeKodu],
                [t('erpOrder.table.date'), selectedOrder.tarih || '-'],
                [t('erpOrder.table.deliveryDate'), selectedOrder.teslimTarihi || '-'],
                [t('erpOrder.table.salesRepCode'), selectedOrder.plasiyerKodu || '-'],
                [t('erpOrder.table.grandTotal'), formatNumber(selectedOrder.genelToplam, i18n.language)],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
                  <div className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">{value}</div>
                </div>
              ))}
            </div>

            <DetailLineTable
              rows={selectedLines}
              isLoading={lineQuery.isLoading || lineQuery.isFetching}
              emptyText={lineQuery.isError ? t('erpOrder.lineLoadError') : t('erpOrder.noLines')}
              loadingText={t('erpOrder.linesLoading')}
              locale={i18n.language}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
