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
import { loadTableSortPreference, saveTableSortPreference } from '@/lib/table-sort-preferences';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
  MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME,
} from '@/lib/management-list-layout';
import { CUSTOMER_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import { CustomerTable, getColumnsConfig } from './CustomerTable';
import { CustomerForm } from './CustomerForm';
import { CustomerStats } from './CustomerStats';
import { useCreateCustomer } from '../hooks/useCreateCustomer';
import { useTriggerCustomerSync } from '../hooks/useTriggerCustomerSync';
import { useUpdateCustomer } from '../hooks/useUpdateCustomer';
import { useCustomerList } from '../hooks/useCustomerList';
import type { CustomerStats as CustomerStatsData } from '../hooks/useCustomerStats';
import { ActivityForm } from '@/features/activity-management/components/ActivityForm';
import { useCreateActivity } from '@/features/activity-management/hooks/useCreateActivity';
import { buildCreateActivityPayload } from '@/features/activity-management/utils/build-create-payload';
import type { ActivityFormSchema } from '@/features/activity-management/types/activity-types';
import type { CustomerDto, CustomerFormData } from '../types/customer-types';
import { CUSTOMER_FILTER_COLUMNS } from '../types/customer-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';
import {
  buildCustomerListSearchParam,
  customerFilterRowsToPagedFilters,
} from '../utils/customer-list-api-filters';
import { normalizeQueryParams } from '@/utils/query-params';
import {
  extractCustomerConflictPayload,
  type CustomerDuplicateConflictPayload,
} from '../utils/customer-conflict';
import { customerApi } from '../api/customer-api';
import { queryKeys } from '../utils/query-keys';

const EMPTY_CUSTOMERS: CustomerDto[] = [];
const PAGE_KEY = 'customer-management';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const CRM_NS = 'customer-management' as const;

type CustomerColumnKey = keyof CustomerDto;

const DEFAULT_SORT_BY: CustomerColumnKey = 'name';
const DEFAULT_SORT_DIRECTION: 'asc' | 'desc' = 'asc';

function getQuickActivityWindow(): { start: string; end: string } {
  const start = new Date();
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const toInputValue = (value: Date): string => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const hour = String(value.getHours()).padStart(2, '0');
    const minute = String(value.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hour}:${minute}`;
  };

  return {
    start: toInputValue(start),
    end: toInputValue(end),
  };
}

export function CustomerManagementPage(): ReactElement {
  const { t, i18n } = useTranslation(['customer-management', 'common']);
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerDto | null>(null);
  const [duplicateConflicts, setDuplicateConflicts] = useState<CustomerDuplicateConflictPayload | null>(null);
  const [quickActivityCustomer, setQuickActivityCustomer] = useState<CustomerDto | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const tableColumns = useMemo(
    () => getColumnsConfig(t),
    [t, i18n.language, i18n.resolvedLanguage]
  );
  const baseColumns = useMemo(
    () =>
      tableColumns.map((c) => ({
        key: c.key as string,
        label: c.label,
      })),
    [tableColumns]
  );
  const defaultColumnKeys = useMemo(() => tableColumns.map((c) => c.key as string), [tableColumns]);
  const initialSortPrefs = useMemo(
    () =>
      loadTableSortPreference(
        PAGE_KEY,
        user?.id,
        { sortBy: DEFAULT_SORT_BY, sortDirection: DEFAULT_SORT_DIRECTION },
        defaultColumnKeys
      ),
    [user?.id, defaultColumnKeys]
  );
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<CustomerColumnKey>(initialSortPrefs.sortBy as CustomerColumnKey);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialSortPrefs.sortDirection);
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const queryClient = useQueryClient();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const triggerCustomerSync = useTriggerCustomerSync();
  const createActivity = useCreateActivity();
  const quickActivityWindow = useMemo(() => getQuickActivityWindow(), []);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => defaultColumnKeys);

  useEffect(() => {
    setPageTitle(t('customerManagement.menu', { ns: CRM_NS }));
    return () => setPageTitle(null);
  }, [t, setPageTitle, i18n.language, i18n.resolvedLanguage]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [user?.id, defaultColumnKeys]);

  const handleCustomerSort = useCallback(
    (k: CustomerColumnKey) => {
      let nextBy: CustomerColumnKey = sortBy;
      let nextDir: 'asc' | 'desc' = sortDirection;
      if (sortBy === k) {
        nextDir = sortDirection === 'asc' ? 'desc' : 'asc';
        setSortDirection(nextDir);
      } else {
        nextBy = k;
        nextDir = 'asc';
        setSortBy(k);
        setSortDirection('asc');
      }
      saveTableSortPreference(PAGE_KEY, user?.id, {
        sortBy: nextBy,
        sortDirection: nextDir,
      });
    },
    [sortBy, sortDirection, user?.id]
  );

  const listQueryParams = useMemo(() => {
    const apiFilters = customerFilterRowsToPagedFilters(appliedFilterRows);
    const search = buildCustomerListSearchParam(searchTerm);
    return {
      pageNumber,
      pageSize,
      sortBy,
      sortDirection,
      ...(search ? { search } : {}),
      ...(apiFilters.length > 0 ? { filters: apiFilters, filterLogic: 'and' as const } : {}),
    };
  }, [pageNumber, pageSize, sortBy, sortDirection, searchTerm, appliedFilterRows]);

  const { data: apiResponse, isLoading } = useCustomerList(listQueryParams);

  const customers = useMemo<CustomerDto[]>(
    () => apiResponse?.data ?? EMPTY_CUSTOMERS,
    [apiResponse?.data]
  );

  const totalCount = apiResponse?.totalCount ?? 0;
  const totalPages = apiResponse?.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);
  const customerStats = useMemo<CustomerStatsData>(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      totalCustomers: apiResponse?.totalCount ?? customers.length,
      approvedCustomers: 0,
      newThisMonth: customers.filter(
        (customer) => customer.createdDate && new Date(customer.createdDate) >= startOfMonth
      ).length,
    };
  }, [apiResponse?.totalCount, customers]);
  const currentPageRows = customers;

  const orderedVisibleColumns = columnOrder.filter((k) => visibleColumns.includes(k)) as CustomerColumnKey[];

  const filterColumns = useMemo(
    () =>
      CUSTOMER_FILTER_COLUMNS.map((col) => ({
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
    const listResponse = await queryClient.fetchQuery({
      queryKey: queryKeys.list(normalizeQueryParams(listQueryParams)),
      queryFn: () => customerApi.getList(listQueryParams),
    });
    const list: CustomerDto[] = listResponse?.data ?? customers;
    return {
      columns: exportColumns,
      rows: list.map((c) => {
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
  }, [customers, exportColumns, orderedVisibleColumns, i18n.language, queryClient, listQueryParams]);

  const appliedFilterCount = useMemo(
    () => appliedFilterRows.filter((r) => r.value.trim()).length,
    [appliedFilterRows]
  );

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, searchTerm, appliedFilterRows, sortBy, sortDirection]);

  const handleAddClick = (): void => {
    setEditingCustomer(null);
    setDuplicateConflicts(null);
    setFormOpen(true);
  };

  const handleEdit = (customer: CustomerDto): void => {
    setEditingCustomer(customer);
    setDuplicateConflicts(null);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean): void => {
    setFormOpen(open);
    if (!open) {
      setEditingCustomer(null);
      setDuplicateConflicts(null);
    }
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: [CUSTOMER_MANAGEMENT_QUERY_KEYS.LIST] });
  };

  const handleQuickActivity = (customer: CustomerDto): void => {
    setQuickActivityCustomer(customer);
  };

  const handleQuickActivitySubmit = async (formData: ActivityFormSchema): Promise<void> => {
    await createActivity.mutateAsync(
      buildCreateActivityPayload(formData, { assignedUserIdFallback: user?.id })
    );
    setQuickActivityCustomer(null);
  };

  const handleFormSubmit = async (data: CustomerFormData): Promise<void> => {
    setDuplicateConflicts(null);

    try {
      if (editingCustomer) {
        await updateCustomer.mutateAsync({
          id: editingCustomer.id,
          data: data,
        });
      } else {
        await createCustomer.mutateAsync(data);
      }
    } catch (error) {
      const conflicts = extractCustomerConflictPayload(error);
      if (conflicts) {
        setDuplicateConflicts(conflicts);
      }
      throw error;
    }

    setFormOpen(false);
    setEditingCustomer(null);
    setDuplicateConflicts(null);
  };

  const columns = useMemo<DataTableGridColumn<CustomerColumnKey>[]>(
    () =>
      tableColumns.map((c) => ({
        key: c.key as CustomerColumnKey,
        label: c.label,
        headClassName: c.headClassName,
        cellClassName: c.className,
      })),
    [tableColumns]
  );

  return (
    <div className="w-full space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2 pb-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white transition-colors">
            {t('customerManagement.menu', { ns: CRM_NS })}
          </h1>
          <p className="text-zinc-500 dark:text-muted-foreground text-sm flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
            {t('customerManagement.description', { ns: CRM_NS })}
          </p>
        </div>
        <Button
          onClick={handleAddClick}
          className="h-12 px-8 bg-linear-to-r from-pink-600 to-orange-600 rounded-2xl text-white text-sm font-black shadow-xl shadow-pink-500/20 transition-all duration-300 hover:scale-[1.05] hover:shadow-pink-500/30 active:scale-[0.98] border-0 opacity-50 grayscale-[0] dark:opacity-100 dark:grayscale-0"
        >
          <Plus size={20} className="mr-2 stroke-[3px]" />
          {t('customerManagement.addButton', { ns: CRM_NS })}
        </Button>
      </div>

      <CustomerStats stats={customerStats} isLoading={isLoading} />

      <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
        <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
          <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>
            {t('customerManagement.table.title', { ns: CRM_NS })}
          </CardTitle>
          <DataTableActionBar
            pageKey={PAGE_KEY}
            userId={user?.id}
            columns={baseColumns}
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            onVisibleColumnsChange={setVisibleColumns}
            onColumnOrderChange={setColumnOrder}
            exportFileName="customers"
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
            translationNamespace="customer-management"
            appliedFilterCount={appliedFilterCount}
            searchValue={searchTerm}
            searchPlaceholder={t('search', { ns: 'common' })}
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
                  {t('refresh', { ns: 'common' })}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME}
                  onClick={() => triggerCustomerSync.mutateAsync()}
                  disabled={triggerCustomerSync.isPending}
                >
                  {triggerCustomerSync.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {triggerCustomerSync.isPending
                    ? t('customerManagement.syncing', { ns: CRM_NS, defaultValue: 'Sync çalışıyor' })
                    : t('customerManagement.manualSync', { ns: CRM_NS, defaultValue: 'Manuel Sync' })}
                </Button>
              </>
            }
          />
        </CardHeader>
        <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
          <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
            <CustomerTable
              columns={columns}
              visibleColumnKeys={orderedVisibleColumns}
              rows={currentPageRows}
              rowKey={(r) => r.id}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={handleCustomerSort}
              renderSortIcon={(k) => {
                if (sortBy !== k) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
                return sortDirection === 'asc' ? (
                  <ArrowUp className="h-3.5 w-3.5 text-foreground" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5 text-foreground" />
                );
              }}
              isLoading={isLoading}
              loadingText={t('customerManagement.loading', { ns: CRM_NS })}
              errorText={t('customerManagement.error', { ns: CRM_NS, defaultValue: 'Hata oluştu' })}
              emptyText={t('customerManagement.noData', { ns: CRM_NS })}
              minTableWidthClassName="min-w-[800px] lg:min-w-[1100px]"
              showActionsColumn
              actionsHeaderLabel={t('customerManagement.actions', { ns: CRM_NS })}
              onEdit={handleEdit}
              onQuickActivity={handleQuickActivity}
              rowClassName="group"
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPageNumber(1);
              }}
              pageNumber={pageNumber}
              totalPages={totalPages}
              hasPreviousPage={apiResponse?.hasPreviousPage ?? pageNumber > 1}
              hasNextPage={apiResponse?.hasNextPage ?? pageNumber < totalPages}
              onPreviousPage={() => setPageNumber((p) => Math.max(1, p - 1))}
              onNextPage={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
              previousLabel={t('previous', { ns: 'common' })}
              nextLabel={t('next', { ns: 'common' })}
              paginationInfoText={t('paginationInfo', {
                ns: 'common',
                start: startRow,
                end: endRow,
                total: totalCount,
              })}
              disablePaginationButtons={false}
            />
          </div>
        </CardContent>
      </Card>

      <CustomerForm
        open={formOpen}
        onOpenChange={handleFormClose}
        onSubmit={handleFormSubmit}
        customer={editingCustomer}
        isLoading={createCustomer.isPending || updateCustomer.isPending}
        conflictState={duplicateConflicts}
        onConflictDismiss={() => setDuplicateConflicts(null)}
      />
      {quickActivityCustomer ? (
        <ActivityForm
          open
          onOpenChange={(open) => {
            if (!open) setQuickActivityCustomer(null);
          }}
          onSubmit={handleQuickActivitySubmit}
          isLoading={createActivity.isPending}
          initialStartDateTime={quickActivityWindow.start}
          initialEndDateTime={quickActivityWindow.end}
          initialPotentialCustomerId={quickActivityCustomer.id}
          initialErpCustomerCode={quickActivityCustomer.customerCode ?? undefined}
          initialCustomerDisplayName={quickActivityCustomer.name ?? undefined}
        />
      ) : null}
    </div>
  );
}
