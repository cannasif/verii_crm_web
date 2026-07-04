import { type ReactElement, useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, EyeOff, Loader2, Plus, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DataTableActionBar, type DataTableGridColumn } from '@/components/shared';
import { DefinitionExcelActions } from '@/features/definition-excel/components/DefinitionExcelActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import { arraysEqual } from '@/lib/utils';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
  MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME,
} from '@/lib/management-list-layout';
import { CUSTOMER_TYPE_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import { CustomerTypeTable, getColumnsConfig } from './CustomerTypeTable';
import { CustomerTypeForm } from './CustomerTypeForm';
import { CustomerTypeStats } from './CustomerTypeStats';
import { useCreateCustomerType } from '../hooks/useCreateCustomerType';
import { useUpdateCustomerType } from '../hooks/useUpdateCustomerType';
import { useCustomerTypeList } from '../hooks/useCustomerTypeList';
import { useCustomerTypeStats } from '../hooks/useCustomerTypeStats';
import type { CustomerTypeDto, CustomerTypeFormSchema } from '../types/customer-type-types';
import { applyCustomerTypeFilters, CUSTOMER_TYPE_FILTER_COLUMNS } from '../types/customer-type-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';

const EMPTY_CUSTOMER_TYPES: CustomerTypeDto[] = [];
const PAGE_KEY = 'customer-type-management';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type CustomerTypeColumnKey = keyof CustomerTypeDto;

function resolveLabel(
  t: (key: string) => string,
  key: string,
  fallback: string
): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

export function CustomerTypeManagementPage(): ReactElement {
  const { t, i18n } = useTranslation(['customer-type-management', 'common']);
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomerType, setEditingCustomerType] = useState<CustomerTypeDto | null>(null);
  const [showStats, setShowStats] = useState(() => {
    const userId = useAuthStore.getState().user?.id;
    const stored = localStorage.getItem(`customer-type-management-show-stats-${userId || 'default'}`);
    return stored !== null ? stored === 'true' : true;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<CustomerTypeColumnKey>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const queryClient = useQueryClient();
  const createCustomerType = useCreateCustomerType();
  const updateCustomerType = useUpdateCustomerType();

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
    localStorage.setItem(`customer-type-management-show-stats-${user?.id || 'default'}`, String(showStats));
  }, [showStats, user?.id]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys);
    setVisibleColumns((current) => arraysEqual(current, prefs.visibleKeys) ? current : prefs.visibleKeys);
    setColumnOrder((current) => arraysEqual(current, prefs.order) ? current : prefs.order);
  }, [user?.id, defaultColumnKeys]);

  const { data: customerTypeStats, isLoading: isStatsLoading } = useCustomerTypeStats();

  const { data: apiResponse, isLoading } = useCustomerTypeList({
    pageNumber,
    pageSize,
    search: searchTerm || undefined,
    sortBy,
    sortDirection,
  });

  const customerTypes = useMemo<CustomerTypeDto[]>(
    () => apiResponse?.data ?? EMPTY_CUSTOMER_TYPES,
    [apiResponse?.data]
  );

  const filteredCustomerTypes = useMemo<CustomerTypeDto[]>(() => {
    if (!customerTypes.length) return [];
    let result = [...customerTypes];
    result = applyCustomerTypeFilters(result, appliedFilterRows);
    return result;
  }, [customerTypes, appliedFilterRows]);

  const sortedCustomerTypes = useMemo(() => {
    const result = [...filteredCustomerTypes];
    result.sort((a, b) => {
      const aVal = a[sortBy] != null ? String(a[sortBy]).toLowerCase() : '';
      const bVal = b[sortBy] != null ? String(b[sortBy]).toLowerCase() : '';
      const cmp = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [filteredCustomerTypes, sortBy, sortDirection]);

  const totalCount = apiResponse?.totalCount ?? sortedCustomerTypes.length;
  const totalPages = apiResponse?.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(startRow + sortedCustomerTypes.length - 1, totalCount);
  const currentPageRows = sortedCustomerTypes;

  const orderedVisibleColumns = columnOrder.filter((k) => visibleColumns.includes(k)) as CustomerTypeColumnKey[];

  const filterColumns = useMemo(
    () =>
      CUSTOMER_TYPE_FILTER_COLUMNS.map((col) => ({
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
          if (key === 'createdDate' && val) {
            row[key] = new Date(String(val)).toLocaleDateString(i18n.language);
          } else {
            row[key] = val ?? '';
          }
        });
        return row;
      }),
    [currentPageRows, orderedVisibleColumns, i18n.language]
  );

  const getExportData = useCallback(async (): Promise<{ columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }> => {
    const list = sortedCustomerTypes;
    return {
      columns: exportColumns,
      rows: list.map((c: CustomerTypeDto) => {
        const row: Record<string, unknown> = {};
        orderedVisibleColumns.forEach((key) => {
          const val = c[key];
          if (key === 'createdDate' && val) {
            row[key] = new Date(String(val)).toLocaleDateString(i18n.language);
          } else {
            row[key] = val ?? '';
          }
        });
        return row;
      }),
    };
  }, [exportColumns, orderedVisibleColumns, i18n.language, sortedCustomerTypes]);

  const appliedFilterCount = useMemo(
    () => appliedFilterRows.filter((r) => r.value.trim()).length,
    [appliedFilterRows]
  );

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, searchTerm, appliedFilterRows, sortBy, sortDirection]);

  const handleAddClick = (): void => {
    setEditingCustomerType(null);
    setFormOpen(true);
  };

  const handleEdit = (customerType: CustomerTypeDto): void => {
    setEditingCustomerType(customerType);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean): void => {
    setFormOpen(open);
    if (!open) setEditingCustomerType(null);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: [CUSTOMER_TYPE_MANAGEMENT_QUERY_KEYS.LIST] });
  };

  const handleFormSubmit = async (data: CustomerTypeFormSchema): Promise<void> => {
    if (editingCustomerType) {
      await updateCustomerType.mutateAsync({
        id: editingCustomerType.id,
        data: {
          name: data.name,
          description: data.description || undefined,
        },
      });
    } else {
      await createCustomerType.mutateAsync({
        name: data.name,
        description: data.description || undefined,
      });
    }
    setFormOpen(false);
    setEditingCustomerType(null);
  };

  const columns = useMemo<DataTableGridColumn<CustomerTypeColumnKey>[]>(
    () =>
      tableColumns.map((c) => ({
        key: c.key as CustomerTypeColumnKey,
        label: c.label,
        headClassName: c.headClassName,
        cellClassName: c.className,
      })),
    [tableColumns]
  );

  return (
    <div className="w-full space-y-6 relative">
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white transition-colors">
              {t('menu')}
            </h1>
            <p className="text-zinc-500 dark:text-muted-foreground text-sm flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
              {t('description')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowStats((prev) => !prev)}
              className="h-12 px-5 border-slate-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all duration-300 active:scale-[0.98]"
            >
              {showStats ? <EyeOff size={18} className="mr-2" /> : <Eye size={18} className="mr-2" />}
              {showStats
                ? t('hideStats', { defaultValue: 'İstatistikleri Gizle' })
                : t('showStats', { defaultValue: 'İstatistikleri Göster' })}
            </Button>
            <Button
              onClick={handleAddClick}
              className="h-12 px-8 bg-[image:var(--crm-brand-gradient)] rounded-2xl text-white text-sm font-black shadow-xl shadow-primary/20 transition-all duration-300 hover:scale-[1.05] hover:shadow-primary/30 active:scale-[0.98] border-0 opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
            >
              <Plus size={20} className="mr-2 stroke-[3px]" />
              {t('addButton')}
            </Button>
          </div>
        </div>

        {showStats && <CustomerTypeStats stats={customerTypeStats} isLoading={isStatsLoading} />}
      </div>

      <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
        <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
          <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>
            {t('table.title', { defaultValue: t('table.title') })}
          </CardTitle>
          <DataTableActionBar
            pageKey={PAGE_KEY}
            userId={user?.id}
            columns={baseColumns}
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            onVisibleColumnsChange={setVisibleColumns}
            onColumnOrderChange={setColumnOrder}
            exportFileName="customer_types"
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
            translationNamespace="customer-type-management"
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
            additionalFilterActions={
              <DefinitionExcelActions
                definitionKey="customer-type-definition"
                fileNamePrefix="musteri-tipi"
                onImportCompleted={async () => {
                  await queryClient.invalidateQueries({ queryKey: [CUSTOMER_TYPE_MANAGEMENT_QUERY_KEYS.LIST] });
                  await queryClient.invalidateQueries({ queryKey: [CUSTOMER_TYPE_MANAGEMENT_QUERY_KEYS.STATS] });
                  await queryClient.invalidateQueries({ queryKey: [CUSTOMER_TYPE_MANAGEMENT_QUERY_KEYS.OPTIONS] });
                }}
              />
            }
          />
        </CardHeader>
        <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
          <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
            <CustomerTypeTable
              columns={columns}
              visibleColumnKeys={orderedVisibleColumns}
              rows={currentPageRows}
              rowKey={(r) => r.id}
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
              loadingText={t('loading')}
              errorText={t('error', { defaultValue: 'Hata oluştu' })}
              emptyText={t('noData')}
              minTableWidthClassName="min-w-[600px] lg:min-w-[800px]"
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

      <CustomerTypeForm
        open={formOpen}
        onOpenChange={handleFormClose}
        customerType={editingCustomerType}
        onSubmit={handleFormSubmit}
        isLoading={createCustomerType.isPending || updateCustomerType.isPending}
      />
    </div>
  );
}
