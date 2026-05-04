import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Plus, RefreshCw } from 'lucide-react';
import { DataTableActionBar, type DataTableGridColumn } from '@/components/shared';
import type { FilterRow } from '@/lib/advanced-filter-types';
import { rowsToBackendFilters } from '@/lib/advanced-filter-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
  MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME,
} from '@/lib/management-list-layout';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { SalesRepMatchForm } from './SalesRepMatchForm';
import { SalesRepMatchTable } from './SalesRepMatchTable';
import { useCreateSalesRepMatch } from '../hooks/useCreateSalesRepMatch';
import { useSalesRepMatchList } from '../hooks/useSalesRepMatchList';
import type { SalesRepMatchFormSchema, SalesRepMatchGetDto } from '../types/sales-rep-match-types';
import { SALES_REP_MATCH_FILTER_COLUMNS } from '../types/sales-rep-match-filter.types';
import { queryKeys } from '../utils/query-keys';

const PAGE_KEY = 'sales-rep-match-management';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type SalesRepMatchColumnKey = keyof SalesRepMatchGetDto;

const TABLE_COLUMNS: Array<{ key: SalesRepMatchColumnKey; labelKey: string; className?: string }> = [
  { key: 'salesRepCode', labelKey: 'table.salesRepCode', className: 'w-[160px] font-medium' },
  { key: 'salesRepName', labelKey: 'table.salesRepName', className: 'min-w-[220px]' },
  { key: 'userFullName', labelKey: 'table.userFullName', className: 'min-w-[220px]' },
  { key: 'username', labelKey: 'table.username', className: 'w-[180px]' },
  { key: 'userEmail', labelKey: 'table.userEmail', className: 'min-w-[220px]' },
  { key: 'createdDate', labelKey: 'table.createdDate', className: 'w-[180px]' },
] as const;

function resolveLabel(t: (key: string) => string, key: string, fallback: string): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

export function SalesRepMatchManagementPage(): ReactElement {
  const { t, i18n } = useTranslation(['sales-rep-match-management', 'common']);
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<SalesRepMatchColumnKey>('salesRepCode');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const defaultColumnKeys = useMemo(() => TABLE_COLUMNS.map((column) => column.key as string), []);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => defaultColumnKeys);

  const createSalesRepMatch = useCreateSalesRepMatch();

  useEffect(() => {
    setPageTitle(t('menu'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [defaultColumnKeys, user?.id]);

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, searchTerm, appliedFilterRows, sortBy, sortDirection]);

  const apiFilters = useMemo(
    () => rowsToBackendFilters(appliedFilterRows),
    [appliedFilterRows]
  );

  const { data: apiResponse, isLoading, isFetching } = useSalesRepMatchList({
    pageNumber,
    pageSize,
    search: searchTerm.trim() || undefined,
    sortBy,
    sortDirection,
    filters: apiFilters.length > 0 ? apiFilters : undefined,
  });

  const items = useMemo(() => apiResponse?.data ?? [], [apiResponse?.data]);
  const totalCount = apiResponse?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);
  const orderedVisibleColumns = columnOrder.filter((key) => visibleColumns.includes(key)) as SalesRepMatchColumnKey[];

  const columns = useMemo<DataTableGridColumn<SalesRepMatchColumnKey>[]>(
    () =>
      TABLE_COLUMNS.map((column) => ({
        key: column.key,
        label: t(column.labelKey),
        cellClassName: column.className,
      })),
    [t]
  );

  const baseColumns = useMemo(
    () =>
      columns.map((column) => ({
        key: column.key as string,
        label: column.label,
      })),
    [columns]
  );

  const filterColumns = useMemo(
    () =>
      SALES_REP_MATCH_FILTER_COLUMNS.map((column) => ({
        value: column.value,
        type: column.type,
        labelKey: column.labelKey,
      })),
    []
  );

  const exportColumns = useMemo(
    () =>
      orderedVisibleColumns.map((key) => {
        const column = columns.find((item) => item.key === key);
        return { key, label: column?.label ?? key };
      }),
    [columns, orderedVisibleColumns]
  );

  const mapRow = useCallback(
    (item: SalesRepMatchGetDto): Record<string, unknown> => {
      const row: Record<string, unknown> = {};
      orderedVisibleColumns.forEach((key) => {
        const value = item[key];
        row[key] =
          key === 'createdDate' && value
            ? new Date(String(value)).toLocaleDateString(i18n.language)
            : (value ?? '');
      });
      return row;
    },
    [i18n.language, orderedVisibleColumns]
  );

  const exportRows = useMemo<Record<string, unknown>[]>(
    () => items.map(mapRow),
    [items, mapRow]
  );

  const getExportData = useCallback(async (): Promise<{ columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }> => {
    return {
      columns: exportColumns,
      rows: items.map(mapRow),
    };
  }, [exportColumns, items, mapRow]);

  const appliedFilterCount = useMemo(
    () => appliedFilterRows.filter((row) => row.value.trim()).length,
    [appliedFilterRows]
  );

  const handleSubmit = async (data: SalesRepMatchFormSchema): Promise<void> => {
    await createSalesRepMatch.mutateAsync({
      salesRepCodeId: Number(data.salesRepCodeId),
      userId: Number(data.userId),
    });
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.list({
        pageNumber,
        pageSize,
        search: searchTerm.trim() || undefined,
        sortBy,
        sortDirection,
        filters: apiFilters,
      } as Record<string, unknown>),
    });
  };

  return (
    <div className="w-full space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('menu')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('description')}
          </p>
        </div>
        <Button
          onClick={() => setFormOpen(true)}
          className="h-11 bg-linear-to-r from-pink-600 to-orange-600 px-8 font-bold text-white shadow-lg shadow-pink-500/20 ring-1 ring-pink-400/30 transition-all duration-300 hover:scale-[1.05] hover:from-pink-500 hover:to-orange-500 active:scale-[0.98] rounded-xl opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
        >
          <Plus size={18} className="mr-2" />
          {t('addButton')}
        </Button>
      </div>

      <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
        <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
          <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>{t('table.title')}</CardTitle>
          <DataTableActionBar
            pageKey={PAGE_KEY}
            userId={user?.id}
            columns={baseColumns}
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            onVisibleColumnsChange={setVisibleColumns}
            onColumnOrderChange={setColumnOrder}
            exportFileName="sales-rep-matches"
            exportColumns={exportColumns}
            exportRows={exportRows}
            getExportData={getExportData}
            filterColumns={filterColumns}
            defaultFilterColumn="salesRepCode"
            draftFilterRows={draftFilterRows}
            onDraftFilterRowsChange={setDraftFilterRows}
            onApplyFilters={() => setAppliedFilterRows(draftFilterRows)}
            onClearFilters={() => {
              setDraftFilterRows([]);
              setAppliedFilterRows([]);
            }}
            translationNamespace="sales-rep-match-management"
            appliedFilterCount={appliedFilterCount}
            searchValue={searchTerm}
            searchPlaceholder={t('searchPlaceholder')}
            onSearchChange={setSearchTerm}
            leftSlot={
              <Button
                variant="outline"
                size="sm"
                className={MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME}
                onClick={() => void handleRefresh()}
                disabled={isLoading || isFetching}
              >
                {isLoading || isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {resolveLabel(t, 'common.refresh', 'Yenile')}
              </Button>
            }
          />
        </CardHeader>
        <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
          <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
            <SalesRepMatchTable
              columns={columns}
              visibleColumnKeys={orderedVisibleColumns}
              rows={items}
              rowKey={(row) => row.id}
              renderCell={(row, key) => {
                const value = row[key];
                if (value == null || value === '') return '-';
                if (key === 'createdDate') return new Date(String(value)).toLocaleDateString(i18n.language);
                return String(value);
              }}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={(key) => {
                if (sortBy === key) {
                  setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
                  return;
                }
                setSortBy(key);
                setSortDirection('asc');
              }}
              renderSortIcon={(key) => {
                if (sortBy !== key) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
                return sortDirection === 'asc' ? (
                  <ArrowUp className="h-3.5 w-3.5 text-foreground" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5 text-foreground" />
                );
              }}
              isLoading={isLoading || isFetching}
              loadingText={t('common.loading', { ns: 'common' })}
              emptyText={t('empty')}
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
              onPreviousPage={() => setPageNumber((current) => Math.max(1, current - 1))}
              onNextPage={() => setPageNumber((current) => Math.min(totalPages, current + 1))}
              previousLabel={t('common.previous', { ns: 'common' })}
              nextLabel={t('common.next', { ns: 'common' })}
              paginationInfoText={t('common.table.showing', {
                ns: 'common',
                from: startRow,
                to: endRow,
                total: totalCount,
              })}
              onColumnOrderChange={(newVisibleOrder) => {
                setColumnOrder((currentOrder) => {
                  const hiddenCols = currentOrder.filter(k => !newVisibleOrder.includes(k));
                  const finalOrder = [...newVisibleOrder, ...hiddenCols];
                  saveColumnPreferences(PAGE_KEY, user?.id, { visibleKeys: visibleColumns, order: finalOrder });
                  return finalOrder;
                });
              }}
            />
          </div>
        </CardContent>
      </Card>

      <SalesRepMatchForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        isLoading={createSalesRepMatch.isPending}
      />
    </div>
  );
}
