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
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
  MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME,
} from '@/lib/management-list-layout';

import { rowsToBackendFilters } from '@/lib/advanced-filter-types';
import type { FilterRow } from '@/lib/advanced-filter-types';
import { UserDiscountLimitTable, getColumnsConfig } from './UserDiscountLimitTable';
import { UserDiscountLimitForm } from './UserDiscountLimitForm';
import { useCreateUserDiscountLimit } from '../hooks/useCreateUserDiscountLimit';
import { useUpdateUserDiscountLimit } from '../hooks/useUpdateUserDiscountLimit';
import { useUserDiscountLimits } from '../hooks/useUserDiscountLimits';
import type { UserDiscountLimitDto } from '../types/user-discount-limit-types';
import type { UserDiscountLimitFormSchema } from '../types/user-discount-limit-types';
import { USER_DISCOUNT_LIMIT_FILTER_COLUMNS } from '../types/user-discount-limit-filter.types';
import { queryKeys } from '../utils/query-keys';

const PAGE_KEY = 'user-discount-limit-management';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type UserDiscountLimitColumnKey = keyof UserDiscountLimitDto;

function resolveLabel(
  t: (key: string) => string,
  key: string,
  fallback: string
): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

export function UserDiscountLimitManagementPage(): ReactElement {
  const { t, i18n } = useTranslation(['user-discount-limit-management', 'common']);
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UserDiscountLimitDto | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<UserDiscountLimitColumnKey>('salespersonName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const queryClient = useQueryClient();
  const createUserDiscountLimit = useCreateUserDiscountLimit();
  const updateUserDiscountLimit = useUpdateUserDiscountLimit();

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
    setPageTitle(t('title'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [user?.id, defaultColumnKeys]);

  const simpleFilters = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return [];
    return [{ column: 'SalespersonName', operator: 'Contains', value: trimmed }];
  }, [searchQuery]);

  const apiFilters = useMemo(
    () => [...simpleFilters, ...rowsToBackendFilters(appliedFilterRows)],
    [simpleFilters, appliedFilterRows]
  );

  const { data: apiResponse, isLoading } = useUserDiscountLimits({
    pageNumber,
    pageSize,
    filters: apiFilters,
  });

  const items = useMemo(() => apiResponse?.data ?? [], [apiResponse?.data]);
  const totalCount = apiResponse?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);

  const orderedVisibleColumns = columnOrder.filter((k) => visibleColumns.includes(k)) as UserDiscountLimitColumnKey[];

  const filterColumns = useMemo(
    () =>
      USER_DISCOUNT_LIMIT_FILTER_COLUMNS.map((col) => ({
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

  const mapUserDiscountLimitRow = useCallback((item: UserDiscountLimitDto): Record<string, unknown> => {
    const row: Record<string, unknown> = {};
    orderedVisibleColumns.forEach((key) => {
      const val = item[key];
      if ((key === 'createdDate' || key === 'updatedDate') && val) {
        row[key] = new Date(String(val)).toLocaleDateString(i18n.language);
      } else {
        row[key] = val ?? '';
      }
    });
    return row;
  }, [orderedVisibleColumns, i18n.language]);

  const exportRows = useMemo<Record<string, unknown>[]>(
    () => items.map(mapUserDiscountLimitRow),
    [items, mapUserDiscountLimitRow]
  );

  const getExportData = useCallback(async (): Promise<{ columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }> => {
    return {
      columns: exportColumns,
      rows: items.map(mapUserDiscountLimitRow),
    };
  }, [exportColumns, items, mapUserDiscountLimitRow]);

  const appliedFilterCount = useMemo(
    () => appliedFilterRows.filter((r) => r.value.trim()).length,
    [appliedFilterRows]
  );

  useEffect(() => {
    setPageNumber(1);
  }, [searchQuery, appliedFilterRows, pageSize]);

  const handleAddClick = (): void => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: UserDiscountLimitDto): void => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean): void => {
    setFormOpen(open);
    if (!open) setEditingItem(null);
  };

  const handleFormSubmit = async (data: UserDiscountLimitFormSchema): Promise<void> => {
    if (editingItem) {
      await updateUserDiscountLimit.mutateAsync({
        id: editingItem.id,
        data: {
          erpProductGroupCode: data.erpProductGroupCode,
          salespersonId: data.salespersonId,
          maxDiscount1: data.maxDiscount1,
          maxDiscount2: data.maxDiscount2 || undefined,
          maxDiscount3: data.maxDiscount3 || undefined,
        },
      });
    } else {
      await createUserDiscountLimit.mutateAsync({
        erpProductGroupCode: data.erpProductGroupCode,
        salespersonId: data.salespersonId,
        maxDiscount1: data.maxDiscount1,
        maxDiscount2: data.maxDiscount2 || undefined,
        maxDiscount3: data.maxDiscount3 || undefined,
      });
    }
    setFormOpen(false);
    setEditingItem(null);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.list({ pageNumber, pageSize, filters: apiFilters }),
    });
  };

  const columns = useMemo<DataTableGridColumn<UserDiscountLimitColumnKey>[]>(
    () =>
      tableColumns.map((c) => ({
        key: c.key as UserDiscountLimitColumnKey,
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
            {t('title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('description')}
          </p>
        </div>
        <Button
          onClick={handleAddClick}
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white h-11 opacity-50 grayscale-[0] dark:opacity-100 dark:grayscale-0"
        >
          <Plus size={18} className="mr-2" />
          {t('create', { defaultValue: t('common.create') })}
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
            exportFileName="user-discount-limits"
            exportColumns={exportColumns}
            exportRows={exportRows}
            getExportData={getExportData}
            filterColumns={filterColumns}
            defaultFilterColumn="SalespersonName"
            draftFilterRows={draftFilterRows}
            onDraftFilterRowsChange={setDraftFilterRows}
            onApplyFilters={() => setAppliedFilterRows(draftFilterRows)}
            onClearFilters={() => {
              setDraftFilterRows([]);
              setAppliedFilterRows([]);
            }}
            translationNamespace="user-discount-limit-management"
            appliedFilterCount={appliedFilterCount}
            searchValue={searchQuery}
            searchPlaceholder={t('common.search', { ns: 'common' })}
            onSearchChange={setSearchQuery}
            leftSlot={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className={MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME}
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
        <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
          <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
            <UserDiscountLimitTable
              columns={columns}
              visibleColumnKeys={orderedVisibleColumns}
              rows={items}
              rowKey={(r) => r.id}
              renderCell={(row, key) => {
                const val = row[key];
                if (val == null && val !== 0) return '-';
                if (key === 'createdDate' || key === 'updatedDate') {
                  return new Date(String(val)).toLocaleDateString(i18n.language);
                }
                if (key === 'maxDiscount1' || key === 'maxDiscount2' || key === 'maxDiscount3') {
                  return val != null ? `${Number(val).toFixed(2)}%` : '-';
                }
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
              errorText={t('deleteError')}
              emptyText={t('noData')}
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
          </div>
        </CardContent>
      </Card>

      <UserDiscountLimitForm
        open={formOpen}
        onOpenChange={handleFormClose}
        onSubmit={handleFormSubmit}
        userDiscountLimit={editingItem}
        isLoading={createUserDiscountLimit.isPending || updateUserDiscountLimit.isPending}
      />
    </div>
  );
}
