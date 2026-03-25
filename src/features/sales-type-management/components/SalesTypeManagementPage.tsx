import { type ReactElement, useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Plus, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DataTableActionBar, type DataTableGridColumn } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loadColumnPreferences } from '@/lib/column-preferences';
import { queryKeys } from '../utils/query-keys';
import { SalesTypeTable, getColumnsConfig } from './SalesTypeTable';
import { SalesTypeForm } from './SalesTypeForm';
import type { SalesTypeGetDto, SalesTypeFormSchema } from '../types/sales-type-types';
import { useSalesTypeList } from '../hooks/useSalesTypeList';
import { useCreateSalesType } from '../hooks/useCreateSalesType';
import { useUpdateSalesType } from '../hooks/useUpdateSalesType';
import { applySalesTypeFilters, SALES_TYPE_FILTER_COLUMNS } from '../types/sales-type-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';
import { OfferType } from '@/types/offer-type';
import { salesTypeApi } from '../api/sales-type-api';

const EMPTY_SALES_TYPES: SalesTypeGetDto[] = [];
const PAGE_KEY = 'sales-type-management';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type SalesTypeColumnKey = keyof SalesTypeGetDto;

function resolveLabel(
  t: (key: string) => string,
  key: string,
  fallback: string
): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

export function SalesTypeManagementPage(): ReactElement {
  const { t, i18n } = useTranslation(['sales-type-management', 'common']);
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SalesTypeGetDto | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<SalesTypeColumnKey>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const queryClient = useQueryClient();
  const createSalesType = useCreateSalesType();
  const updateSalesType = useUpdateSalesType();

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);
  const baseColumns = useMemo(
    () =>
      tableColumns.map((c) => ({
        key: c.key as string,
        label: c.label,
      })),
    [tableColumns]
  );
  const defaultColumnKeys = useMemo(() => tableColumns.map((c) => c.key as string), [tableColumns]);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => defaultColumnKeys);

  useEffect(() => {
    setPageTitle(t('menu'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [user?.id, defaultColumnKeys]);

  const salesTypeLabel = useCallback((value: string): string => {
    if (value === OfferType.YURTICI) return t('common.offerType.yurtici', { ns: 'common' });
    if (value === OfferType.YURTDISI) return t('common.offerType.yurtdisi', { ns: 'common' });
    return value;
  }, [t]);

  const { data: apiResponse, isLoading } = useSalesTypeList({
    pageNumber: 1,
    pageSize: 10000,
  });

  const items = useMemo<SalesTypeGetDto[]>(
    () => apiResponse?.data ?? EMPTY_SALES_TYPES,
    [apiResponse?.data]
  );

  const filteredItems = useMemo<SalesTypeGetDto[]>(() => {
    if (!items.length) return [];
    let result = [...items];
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((item) => {
        const nameMatch = item.name && item.name.toLowerCase().includes(lowerSearch);
        const typeLabel = salesTypeLabel(item.salesType);
        const typeMatch = typeLabel && typeLabel.toLowerCase().includes(lowerSearch);
        return nameMatch || typeMatch;
      });
    }
    result = applySalesTypeFilters(result, appliedFilterRows);
    return result;
  }, [items, searchTerm, appliedFilterRows, salesTypeLabel]);

  const sortedItems = useMemo(() => {
    const result = [...filteredItems];
    result.sort((a, b) => {
      let aVal: string;
      let bVal: string;
      if (sortBy === 'salesType') {
        aVal = salesTypeLabel(a.salesType).toLowerCase();
        bVal = salesTypeLabel(b.salesType).toLowerCase();
      } else {
        const aRaw = a[sortBy];
        const bRaw = b[sortBy];
        aVal = aRaw != null ? String(aRaw).toLowerCase() : '';
        bVal = bRaw != null ? String(bRaw).toLowerCase() : '';
      }
      const cmp = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [filteredItems, sortBy, sortDirection, salesTypeLabel]);

  const totalCount = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);
  const currentPageRows = useMemo(
    () => sortedItems.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
    [sortedItems, pageNumber, pageSize]
  );

  const orderedVisibleColumns = columnOrder.filter((k) => visibleColumns.includes(k)) as SalesTypeColumnKey[];

  const filterColumns = useMemo(
    () =>
      SALES_TYPE_FILTER_COLUMNS.map((col) => ({
        value: col.value,
        type: col.type,
        labelKey: col.labelKey,
      })),
    []
  );

  const exportColumns = useMemo(
    () =>
      orderedVisibleColumns.map((key) => {
        const col = tableColumns.find((c) => c.key === key);
        return { key, label: col?.label ?? key };
      }),
    [tableColumns, orderedVisibleColumns]
  );

  const exportRows = useMemo<Record<string, unknown>[]>(
    () =>
      currentPageRows.map((c) => {
        const row: Record<string, unknown> = {};
        orderedVisibleColumns.forEach((key) => {
          const val = c[key];
          if (key === 'salesType') {
            row[key] = salesTypeLabel(val as string);
          } else if (key === 'createdDate' && val) {
            row[key] = new Date(String(val)).toLocaleDateString(i18n.language);
          } else {
            row[key] = val ?? '';
          }
        });
        return row;
      }),
    [currentPageRows, orderedVisibleColumns, i18n.language, salesTypeLabel]
  );

  const getExportData = useCallback(async (): Promise<{ columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }> => {
    const response = await salesTypeApi.getList({ pageNumber: 1, pageSize: 10000 });
    const list = response?.data ?? [];
    return {
      columns: exportColumns,
      rows: list.map((c: SalesTypeGetDto) => {
        const row: Record<string, unknown> = {};
        orderedVisibleColumns.forEach((key) => {
          const val = c[key];
          if (key === 'salesType') {
            row[key] = salesTypeLabel(val as string);
          } else if (key === 'createdDate' && val) {
            row[key] = new Date(String(val)).toLocaleDateString(i18n.language);
          } else {
            row[key] = val ?? '';
          }
        });
        return row;
      }),
    };
  }, [exportColumns, orderedVisibleColumns, i18n.language, salesTypeLabel]);

  const appliedFilterCount = useMemo(
    () => appliedFilterRows.filter((r) => r.value.trim()).length,
    [appliedFilterRows]
  );

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, searchTerm, appliedFilterRows, sortBy, sortDirection]);

  const handleAddClick = (): void => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: SalesTypeGetDto): void => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean): void => {
    setFormOpen(open);
    if (!open) setEditingItem(null);
  };

  const handleFormSubmit = async (data: SalesTypeFormSchema): Promise<void> => {
    if (editingItem) {
      await updateSalesType.mutateAsync({
        id: editingItem.id,
        data: { salesType: data.salesType, name: data.name.trim() },
      });
    } else {
      await createSalesType.mutateAsync({ salesType: data.salesType, name: data.name.trim() });
    }
    setFormOpen(false);
    setEditingItem(null);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.list({ pageNumber: 1, pageSize: 10000 }),
    });
  };

  const columns = useMemo<DataTableGridColumn<SalesTypeColumnKey>[]>(
    () =>
      tableColumns.map((c) => ({
        key: c.key as SalesTypeColumnKey,
        label: c.label,
        cellClassName: c.className,
      })),
    [tableColumns]
  );

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
          onClick={handleAddClick}
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white h-11"
        >
          <Plus size={18} className="mr-2" />
          {t('addButton')}
        </Button>
      </div>

      <Card className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm">
        <CardHeader className="space-y-4">
          <CardTitle>{t('table.title')}</CardTitle>
          <DataTableActionBar
            pageKey={PAGE_KEY}
            userId={user?.id}
            columns={baseColumns}
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            onVisibleColumnsChange={setVisibleColumns}
            onColumnOrderChange={setColumnOrder}
            exportFileName="sales-types"
            exportColumns={exportColumns}
            exportRows={exportRows}
            getExportData={getExportData}
            filterColumns={filterColumns}
            defaultFilterColumn="name"
            draftFilterRows={draftFilterRows}
            onDraftFilterRowsChange={setDraftFilterRows}
            onApplyFilters={() => setAppliedFilterRows(draftFilterRows)}
            onClearFilters={() => {
              setDraftFilterRows([]);
              setAppliedFilterRows([]);
            }}
            translationNamespace="sales-type-management"
            appliedFilterCount={appliedFilterCount}
            searchValue={searchTerm}
            searchPlaceholder={t('searchPlaceholder')}
            onSearchChange={setSearchTerm}
            leftSlot={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRefresh()}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {resolveLabel(t, 'common.refresh', 'Yenile')}
                </Button>
              </>
            }
          />
        </CardHeader>
        <CardContent>
          <SalesTypeTable
            columns={columns}
            visibleColumnKeys={orderedVisibleColumns}
            rows={currentPageRows}
            rowKey={(r) => r.id}
            renderCell={(row, key) => {
              const val = row[key];
              if (key === 'salesType') {
                return <span className="font-medium">{salesTypeLabel(val as string)}</span>;
              }
              if (val == null) return '-';
              if (key === 'createdDate') return new Date(String(val)).toLocaleDateString(i18n.language);
              return String(val);
            }}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSort={(k) => {
              if (sortBy === k) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
              else {
                setSortBy(k);
                setSortDirection('asc');
              }
            }}
            renderSortIcon={(k) => {
              if (sortBy !== k) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
              return sortDirection === 'asc' ? (
                <ArrowUp className="h-3.5 w-3.5 text-foreground" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5 text-foreground" />
              );
            }}
            isLoading={isLoading}
            loadingText={t('common.loading', { ns: 'common' })}
            errorText={t('error', { defaultValue: t('common.error', { ns: 'common' }) })}
            emptyText={t('common.noData', { ns: 'common' })}
            minTableWidthClassName="min-w-[800px] lg:min-w-[1000px]"
            showActionsColumn
            actionsHeaderLabel={t('common.actions', { ns: 'common' })}
            onEdit={handleEdit}
            rowClassName="group"
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPageNumber(1);
            }}
            pageNumber={pageNumber}
            totalPages={totalPages}
            hasPreviousPage={pageNumber > 1}
            hasNextPage={pageNumber < totalPages}
            onPreviousPage={() => setPageNumber((p) => Math.max(1, p - 1))}
            onNextPage={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
            previousLabel={t('common.previous', { ns: 'common' })}
            nextLabel={t('common.next', { ns: 'common' })}
            paginationInfoText={t('common.table.showing', {
              from: startRow,
              to: endRow,
              total: totalCount,
            })}
            disablePaginationButtons={false}
          />
        </CardContent>
      </Card>

      <SalesTypeForm
        open={formOpen}
        onOpenChange={handleFormClose}
        onSubmit={handleFormSubmit}
        salesType={editingItem}
        isLoading={createSalesType.isPending || updateSalesType.isPending}
      />
    </div>
  );
}
