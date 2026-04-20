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
import { PAYMENT_TYPE_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import { PaymentTypeTable, getColumnsConfig } from './PaymentTypeTable';
import { PaymentTypeForm } from './PaymentTypeForm';
import type { PaymentTypeDto } from '../types/payment-type-types';
import type { PaymentTypeFormSchema } from '../types/payment-type-types';
import { usePaymentTypeList } from '../hooks/usePaymentTypeList';
import { useCreatePaymentType } from '../hooks/useCreatePaymentType';
import { useUpdatePaymentType } from '../hooks/useUpdatePaymentType';
import { applyPaymentTypeFilters, PAYMENT_TYPE_FILTER_COLUMNS } from '../types/payment-type-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';

const EMPTY_PAYMENT_TYPES: PaymentTypeDto[] = [];
const PAGE_KEY = 'payment-type-management';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type PaymentTypeColumnKey = keyof PaymentTypeDto | 'status';

function resolveLabel(
  t: (key: string) => string,
  key: string,
  fallback: string
): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

export function PaymentTypeManagementPage(): ReactElement {
  const { t, i18n } = useTranslation(['payment-type-management', 'common']);
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingPaymentType, setEditingPaymentType] = useState<PaymentTypeDto | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<PaymentTypeColumnKey>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const queryClient = useQueryClient();
  const createPaymentType = useCreatePaymentType();
  const updatePaymentType = useUpdatePaymentType();

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

  const { data: apiResponse, isLoading } = usePaymentTypeList({
    pageNumber,
    pageSize,
    search: searchTerm || undefined,
    sortBy,
    sortDirection,
  });

  const paymentTypes = useMemo<PaymentTypeDto[]>(
    () => apiResponse?.data ?? EMPTY_PAYMENT_TYPES,
    [apiResponse?.data]
  );

  const filteredPaymentTypes = useMemo<PaymentTypeDto[]>(() => {
    if (!paymentTypes.length) return [];
    let result = [...paymentTypes];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(lower)) ||
          (c.description && c.description.toLowerCase().includes(lower))
      );
    }
    result = applyPaymentTypeFilters(result, appliedFilterRows);
    return result;
  }, [paymentTypes, searchTerm, appliedFilterRows]);

  const sortedPaymentTypes = useMemo(() => {
    const result = [...filteredPaymentTypes];
    result.sort((a, b) => {
      const aRaw = (a as unknown as Record<string, unknown>)[sortBy];
      const bRaw = (b as unknown as Record<string, unknown>)[sortBy];
      const aVal = aRaw != null ? String(aRaw).toLowerCase() : '';
      const bVal = bRaw != null ? String(bRaw).toLowerCase() : '';
      const cmp = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [filteredPaymentTypes, sortBy, sortDirection]);

  const totalCount = apiResponse?.totalCount ?? sortedPaymentTypes.length;
  const totalPages = apiResponse?.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(startRow + sortedPaymentTypes.length - 1, totalCount);
  const currentPageRows = sortedPaymentTypes;

  const orderedVisibleColumns = columnOrder.filter((k) => visibleColumns.includes(k)) as PaymentTypeColumnKey[];

  const filterColumns = useMemo(
    () =>
      PAYMENT_TYPE_FILTER_COLUMNS.map((col) => ({
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
          const val = key === 'isDeleted' ? c.isDeleted : c[key as keyof PaymentTypeDto];
          if ((key === 'createdDate' || key === 'updatedDate') && val) {
            row[key] = new Date(String(val)).toLocaleDateString(i18n.language);
          } else if (key === 'isDeleted') {
            row[key] = c.isDeleted ? t('status.inactive') : t('status.active');
          } else {
            row[key] = val ?? '';
          }
        });
        return row;
      }),
    [currentPageRows, orderedVisibleColumns, i18n.language, t]
  );

  const getExportData = useCallback(async (): Promise<{ columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }> => {
    const list = sortedPaymentTypes;
    return {
      columns: exportColumns,
      rows: list.map((c: PaymentTypeDto) => {
        const row: Record<string, unknown> = {};
        orderedVisibleColumns.forEach((key) => {
          const val = key === 'isDeleted' ? c.isDeleted : c[key as keyof PaymentTypeDto];
          if ((key === 'createdDate' || key === 'updatedDate') && val) {
            row[key] = new Date(String(val)).toLocaleDateString(i18n.language);
          } else if (key === 'isDeleted') {
            row[key] = c.isDeleted ? t('status.inactive') : t('status.active');
          } else {
            row[key] = val ?? '';
          }
        });
        return row;
      }),
    };
  }, [exportColumns, orderedVisibleColumns, i18n.language, t, sortedPaymentTypes]);

  const appliedFilterCount = useMemo(
    () => appliedFilterRows.filter((r) => r.value.trim()).length,
    [appliedFilterRows]
  );

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, searchTerm, appliedFilterRows, sortBy, sortDirection]);

  const handleAddClick = (): void => {
    setEditingPaymentType(null);
    setFormOpen(true);
  };

  const handleEdit = (paymentType: PaymentTypeDto): void => {
    setEditingPaymentType(paymentType);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean): void => {
    setFormOpen(open);
    if (!open) setEditingPaymentType(null);
  };

  const handleFormSubmit = async (data: PaymentTypeFormSchema): Promise<void> => {
    if (editingPaymentType) {
      await updatePaymentType.mutateAsync({
        id: editingPaymentType.id,
        data: { name: data.name, description: data.description || undefined },
      });
    } else {
      await createPaymentType.mutateAsync({
        name: data.name,
        description: data.description || undefined,
      });
    }
    setFormOpen(false);
    setEditingPaymentType(null);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: [PAYMENT_TYPE_MANAGEMENT_QUERY_KEYS.LIST] });
  };

  const columns = useMemo<DataTableGridColumn<PaymentTypeColumnKey>[]>(
    () =>
      tableColumns.map((c) => ({
        key: c.key as PaymentTypeColumnKey,
        label: c.label,
        cellClassName: c.className,
      })),
    [tableColumns]
  );

  const renderCell = (row: PaymentTypeDto, key: PaymentTypeColumnKey): React.ReactNode => {
    const val = key === 'isDeleted' ? row.isDeleted : row[key as keyof PaymentTypeDto];
    if (key === 'isDeleted') {
      const isActive = !row.isDeleted;
      return (
        <span
          className={`inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-0.5 rounded-md border text-xs font-medium ${
            isActive
              ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20'
              : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20'
          }`}
        >
          {isActive ? t('status.active') : t('status.inactive')}
        </span>
      );
    }
    if (val == null && val !== 0) return '-';
    if (key === 'id') return String(val);
    if (key === 'createdDate' || key === 'updatedDate') return new Date(String(val)).toLocaleDateString(i18n.language);
    return String(val);
  };

  return (
    <div className="w-full space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('headerDescription')}
          </p>
        </div>
        <Button
          onClick={handleAddClick}
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white h-11"
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
            exportFileName="payment-types"
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
            translationNamespace="payment-type-management"
            appliedFilterCount={appliedFilterCount}
            searchValue={searchTerm}
            searchPlaceholder={t('common.search')}
            onSearchChange={setSearchTerm}
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
          <PaymentTypeTable
            columns={columns}
            visibleColumnKeys={orderedVisibleColumns}
            rows={currentPageRows}
            rowKey={(r) => r.id}
            renderCell={renderCell}
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
            loadingText={t('common.loading')}
            errorText={t('error', { defaultValue: t('common.error') })}
            emptyText={t('noData')}
            minTableWidthClassName="min-w-[800px] lg:min-w-[1000px]"
            showActionsColumn
            actionsHeaderLabel={t('common.actions')}
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
            previousLabel={t('common.previous')}
            nextLabel={t('common.next')}
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

      <PaymentTypeForm
        open={formOpen}
        onOpenChange={handleFormClose}
        onSubmit={handleFormSubmit}
        paymentType={editingPaymentType}
        isLoading={createPaymentType.isPending || updatePaymentType.isPending}
      />
    </div>
  );
}
