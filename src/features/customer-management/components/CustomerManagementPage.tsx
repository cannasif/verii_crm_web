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
import { matchesSearchTerm } from '@/lib/search';
import { CUSTOMER_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import { CustomerTable, getColumnsConfig } from './CustomerTable';
import { CustomerForm } from './CustomerForm';
import { CustomerStats } from './CustomerStats';
import { useCreateCustomer } from '../hooks/useCreateCustomer';
import { useTriggerCustomerSync } from '../hooks/useTriggerCustomerSync';
import { useUpdateCustomer } from '../hooks/useUpdateCustomer';
import { useCustomerList } from '../hooks/useCustomerList';
import { ActivityForm } from '@/features/activity-management/components/ActivityForm';
import { useCreateActivity } from '@/features/activity-management/hooks/useCreateActivity';
import { buildCreateActivityPayload } from '@/features/activity-management/utils/build-create-payload';
import type { ActivityFormSchema } from '@/features/activity-management/types/activity-types';
import { customerApi } from '../api/customer-api';
import type { CustomerDto, CustomerFormData } from '../types/customer-types';
import { applyCustomerFilters, CUSTOMER_FILTER_COLUMNS } from '../types/customer-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';
import {
  extractCustomerConflictPayload,
  type CustomerDuplicateConflictPayload,
} from '../utils/customer-conflict';

const EMPTY_CUSTOMERS: CustomerDto[] = [];
const PAGE_KEY = 'customer-management';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type CustomerColumnKey = keyof CustomerDto;

function resolveLabel(
  t: (key: string) => string,
  key: string,
  fallback: string
): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<CustomerColumnKey>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const queryClient = useQueryClient();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const triggerCustomerSync = useTriggerCustomerSync();
  const createActivity = useCreateActivity();
  const quickActivityWindow = useMemo(() => getQuickActivityWindow(), []);

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
    setPageTitle(t('customerManagement.menu'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [user?.id, defaultColumnKeys]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: apiResponse, isLoading } = useCustomerList({
    pageNumber: 1,
    pageSize: 10000,
  });

  const customers = useMemo<CustomerDto[]>(
    () => apiResponse?.data ?? EMPTY_CUSTOMERS,
    [apiResponse?.data]
  );

  const filteredCustomers = useMemo(() => {
    if (!customers.length) return [];
    let result = [...customers];
    if (debouncedSearch) {
      result = result.filter(
        (item) =>
          matchesSearchTerm(debouncedSearch, [
            item.id,
            item.customerCode,
            item.name,
            item.customerTypeName,
            item.email,
            item.phone,
            item.phone2,
            item.cityName,
            item.districtName,
            item.countryName,
            item.address,
            item.taxNumber,
            item.taxOffice,
            item.tcknNumber,
            item.website,
            item.salesRepCode,
            item.groupCode,
            item.creditLimit,
            item.defaultShippingAddressId,
            item.createdDate,
          ])
      );
    }
    result = applyCustomerFilters(result, appliedFilterRows);
    return result;
  }, [customers, debouncedSearch, appliedFilterRows]);

  const sortedCustomers = useMemo(() => {
    const result = [...filteredCustomers];
    result.sort((a, b) => {
      const aVal = a[sortBy] != null ? String(a[sortBy]).toLowerCase() : '';
      const bVal = b[sortBy] != null ? String(b[sortBy]).toLowerCase() : '';
      const cmp = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [filteredCustomers, sortBy, sortDirection]);

  const totalCount = sortedCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);
  const currentPageRows = useMemo(
    () => sortedCustomers.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
    [sortedCustomers, pageNumber, pageSize]
  );

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
    const response = await customerApi.getList({ pageNumber: 1, pageSize: 10000 });
    const list: CustomerDto[] = response?.data ?? [];
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
  }, [exportColumns, orderedVisibleColumns, i18n.language]);

  const appliedFilterCount = useMemo(
    () => appliedFilterRows.filter((r) => r.value.trim()).length,
    [appliedFilterRows]
  );

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, debouncedSearch, appliedFilterRows, sortBy, sortDirection]);

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
        cellClassName: c.className,
      })),
    [tableColumns]
  );

  return (
    <div className="w-full space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('customerManagement.menu')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('customerManagement.description')}
          </p>
        </div>
        <Button
          onClick={handleAddClick}
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white h-11"
        >
          <Plus size={18} className="mr-2" />
          {t('customerManagement.addButton')}
        </Button>
      </div>

      <CustomerStats />

      <Card className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm">
        <CardHeader className="space-y-4">
          <CardTitle>{t('customerManagement.table.title', { defaultValue: t('table.title') })}</CardTitle>
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
            searchPlaceholder={t('common.search')}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => triggerCustomerSync.mutateAsync()}
                  disabled={triggerCustomerSync.isPending}
                >
                  {triggerCustomerSync.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {triggerCustomerSync.isPending
                    ? resolveLabel(t, 'customerManagement.syncing', 'Sync çalışıyor')
                    : resolveLabel(t, 'customerManagement.manualSync', 'Manuel Sync')}
                </Button>
              </>
            }
          />
        </CardHeader>
        <CardContent>
          <CustomerTable
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
            loadingText={t('customerManagement.loading')}
            errorText={t('customerManagement.error', { defaultValue: 'Hata oluştu' })}
            emptyText={t('customerManagement.noData')}
            minTableWidthClassName="min-w-[800px] lg:min-w-[1100px]"
            showActionsColumn
            actionsHeaderLabel={t('customerManagement.actions')}
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
      <ActivityForm
        open={!!quickActivityCustomer}
        onOpenChange={(open) => {
          if (!open) setQuickActivityCustomer(null);
        }}
        onSubmit={handleQuickActivitySubmit}
        isLoading={createActivity.isPending}
        initialStartDateTime={quickActivityWindow.start}
        initialEndDateTime={quickActivityWindow.end}
        initialPotentialCustomerId={quickActivityCustomer?.id}
        initialErpCustomerCode={quickActivityCustomer?.customerCode ?? undefined}
        initialCustomerDisplayName={quickActivityCustomer?.name ?? undefined}
      />
    </div>
  );
}
