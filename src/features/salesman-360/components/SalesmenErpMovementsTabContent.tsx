import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, ArrowUpDown, ClipboardList } from 'lucide-react';
import {
  DataTableActionBar,
  DataTableGrid,
  ManagementDataTableChrome,
  type DataTableGridColumn,
} from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';
import { loadColumnPreferences } from '@/lib/column-preferences';
import { MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME, MANAGEMENT_LIST_CARD_HEADER_CLASSNAME, MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME } from '@/lib/management-list-layout';
import { matchesSearchTerm } from '@/lib/search';
import { arraysEqual } from '@/lib/utils';
import type { Salesmen360ErpMovementDto } from '../types/salesmen360.types';
import {
  buildSalesmenErpMovementExportRows,
  buildSalesmenErpMovementGridColumns,
  buildSalesmenErpMovementGridRows,
  SALESMEN_ERP_MOVEMENT_NUMBER_COLUMN_KEYS,
  sortSalesmenErpMovementRows,
  type SalesmenErpMovementColumnKey,
  type SalesmenErpMovementGridRow,
} from '../utils/salesmen-erp-movements-grid';
import { sanitizeSalesmen360ExportFileName } from '../utils/salesmen-360-table-export';

const PAGE_KEY = 'salesmen-360-erp-movements';
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type SortDirection = 'asc' | 'desc';

interface SalesmenErpMovementsTabContentProps {
  movements: Salesmen360ErpMovementDto[];
  isLoading: boolean;
  isError: boolean;
  numberFormatter: Intl.NumberFormat;
  selectedUserId: number;
  locale: string;
}

export function SalesmenErpMovementsTabContent({
  movements,
  isLoading,
  isError,
  numberFormatter,
  selectedUserId,
  locale,
}: SalesmenErpMovementsTabContentProps): ReactElement {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [sortBy, setSortBy] = useState<SalesmenErpMovementColumnKey>('tarih');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  const baseColumns = useMemo(
    () => buildSalesmenErpMovementGridColumns(t),
    [t]
  );

  const defaultColumnKeys = useMemo(
    () => baseColumns.map((column) => column.key),
    [baseColumns]
  );

  const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultColumnKeys);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys);
    setColumnOrder((current) => (arraysEqual(current, prefs.order) ? current : prefs.order));
    setVisibleColumns((current) => (arraysEqual(current, prefs.visibleKeys) ? current : prefs.visibleKeys));
  }, [defaultColumnKeys, user?.id]);

  const columns = useMemo<DataTableGridColumn<SalesmenErpMovementColumnKey>[]>(
    () => baseColumns,
    [baseColumns]
  );

  const formatDate = useCallback(
    (value?: string | null): string => {
      if (!value) {
        return '-';
      }

      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale);
    },
    [locale]
  );

  const sourceRows = useMemo(() => buildSalesmenErpMovementGridRows(movements), [movements]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) {
      return sourceRows;
    }

    return sourceRows.filter((row) => matchesSearchTerm(searchTerm, [
        formatDate(row.tarih),
        formatDate(row.vadeTarihi),
        row.belgeNo,
        row.cariKod,
        row.aciklama,
        row.paraBirimi,
        row.dovizTuru,
        row.borc,
        row.alacak,
        row.tarihSiraliTlBakiye,
        row.vadeSiraliTlBakiye,
        row.dovizBorc,
        row.dovizAlacak,
        row.tarihSiraliDovizBakiye,
        row.vadeSiraliDovizBakiye,
      ]));
  }, [formatDate, searchTerm, sourceRows]);

  const sortedRows = useMemo(
    () => sortSalesmenErpMovementRows(filteredRows, sortBy, sortDirection),
    [filteredRows, sortBy, sortDirection]
  );

  const orderedVisibleColumns = columnOrder.filter((key) =>
    visibleColumns.includes(key)
  ) as SalesmenErpMovementColumnKey[];

  const totalCount = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);

  const currentPageRows = useMemo(
    () => sortedRows.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
    [pageNumber, pageSize, sortedRows]
  );

  useEffect(() => {
    setPageNumber((current) => (current === 1 ? current : 1));
  }, [pageSize, searchTerm, sortBy, sortDirection]);

  useEffect(() => {
    if (pageNumber > totalPages) {
      setPageNumber(totalPages);
    }
  }, [pageNumber, totalPages]);

  const exportColumns = useMemo(
    () =>
      orderedVisibleColumns.map((key) => {
        const column = columns.find((item) => item.key === key);
        return {
          key,
          label: column?.label ?? key,
        };
      }),
    [columns, orderedVisibleColumns]
  );

  const exportRows = useMemo(
    () =>
      buildSalesmenErpMovementExportRows(currentPageRows, formatDate).map((row) => {
        const scopedRow: Record<string, unknown> = {};
        orderedVisibleColumns.forEach((key) => {
          scopedRow[key] = row[key];
        });
        return scopedRow;
      }),
    [currentPageRows, formatDate, orderedVisibleColumns]
  );

  const onSort = (column: SalesmenErpMovementColumnKey): void => {
    if (sortBy === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortBy(column);
    setSortDirection('asc');
  };

  const renderSortIcon = (column: SalesmenErpMovementColumnKey): ReactElement => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
    }

    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-primary" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-primary" />
    );
  };

  const renderCell = useCallback(
    (row: SalesmenErpMovementGridRow, key: SalesmenErpMovementColumnKey): ReactElement | string => {
      if (key === 'tarih') {
        return formatDate(row.tarih);
      }
      if (key === 'vadeTarihi') {
        return formatDate(row.vadeTarihi);
      }
      if (key === 'belgeNo') {
        return row.belgeNo ?? '-';
      }
      if (key === 'cariKod') {
        return row.cariKod ?? '-';
      }
      if (key === 'aciklama') {
        return row.aciklama ?? '-';
      }
      if (key === 'paraBirimi') {
        return row.paraBirimi ?? (row.dovizTuru != null ? String(row.dovizTuru) : '-');
      }
      if (SALESMEN_ERP_MOVEMENT_NUMBER_COLUMN_KEYS.has(key)) {
        return numberFormatter.format(row[key] ?? 0);
      }

      return '-';
    },
    [formatDate, numberFormatter]
  );

  return (
    <Card className="gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white/80 p-0 shadow-sm dark:border-white/10 dark:bg-white/3">
      <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-600 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
            <ClipboardList className="size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
              {t('salesman360.erpMovements.title')}
            </CardTitle>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
              {t('salesman360.erpMovements.description')}
            </p>
          </div>
        </div>

        <DataTableActionBar
          pageKey={PAGE_KEY}
          userId={user?.id}
          columns={baseColumns}
          visibleColumns={visibleColumns}
          columnOrder={columnOrder}
          onVisibleColumnsChange={setVisibleColumns}
          onColumnOrderChange={setColumnOrder}
          exportFileName={sanitizeSalesmen360ExportFileName(
            t('salesman360.erpMovements.exportFileName'),
            selectedUserId
          )}
          exportColumns={exportColumns}
          exportRows={exportRows}
          pdfRightAlignedColumnKeys={Array.from(SALESMEN_ERP_MOVEMENT_NUMBER_COLUMN_KEYS)}
          searchValue={searchTerm}
          searchPlaceholder={t('common.search', { ns: 'common' })}
          onSearchChange={setSearchTerm}
        />
      </CardHeader>

      <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
        <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
          <ManagementDataTableChrome>
            <DataTableGrid<SalesmenErpMovementGridRow, SalesmenErpMovementColumnKey>
              columns={columns}
              visibleColumnKeys={orderedVisibleColumns}
              rows={currentPageRows}
              rowKey={(row) => row.gridRowId}
              renderCell={renderCell}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={onSort}
              renderSortIcon={renderSortIcon}
              isLoading={isLoading}
              isError={isError}
              loadingText={t('common.loading', { ns: 'common' })}
              errorText={t('salesman360.erpMovements.error')}
              emptyText={t('salesman360.erpMovements.empty')}
              minTableWidthClassName="min-w-[1800px]"
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={setPageSize}
              pageNumber={pageNumber}
              totalPages={totalPages}
              hasPreviousPage={pageNumber > 1}
              hasNextPage={pageNumber < totalPages}
              onPreviousPage={() => setPageNumber((prev) => Math.max(1, prev - 1))}
              onNextPage={() => setPageNumber((prev) => Math.min(totalPages, prev + 1))}
              previousLabel={t('common.previous', { ns: 'common' })}
              nextLabel={t('common.next', { ns: 'common' })}
              paginationInfoText={t('common.paginationInfo', {
                start: startRow,
                end: endRow,
                total: totalCount,
                ns: 'common',
              })}
            />
          </ManagementDataTableChrome>
        </div>
      </CardContent>
    </Card>
  );
}
