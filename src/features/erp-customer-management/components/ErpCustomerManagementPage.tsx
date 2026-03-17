import { type ReactElement, useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DataTableActionBar, type DataTableGridColumn } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loadColumnPreferences } from '@/lib/column-preferences';
import { ErpCustomerTable, getColumnsConfig } from './ErpCustomerTable';
import { ErpCustomerDetailModal } from './ErpCustomerDetailModal';
import { useErpCustomers } from '../hooks/useErpCustomers';
import { erpCommonApi } from '@/services/erp-common-api';
import type { ErpCustomer } from '../types/erp-customer-types';
import { applyFilterRows } from '../types/erp-customer-filter.types';
import { ERP_CUSTOMER_FILTER_COLUMNS } from '../types/erp-customer-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';

const PAGE_KEY = 'erp-customer-management';
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type ErpCustomerColumnKey = keyof ErpCustomer;

function resolveLabel(
  t: (key: string) => string,
  key: string,
  fallback: string
): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

export function ErpCustomerManagementPage(): ReactElement {
  const { t } = useTranslation(['erp-customer-management', 'common']);
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();

  const [selectedCustomer, setSelectedCustomer] = useState<ErpCustomer | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<ErpCustomerColumnKey>('customerName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const queryClient = useQueryClient();

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

  const { data: customers, isLoading } = useErpCustomers(null);

  const searchFiltered = useMemo(() => {
    if (!customers) return [];
    if (!searchTerm.trim()) return customers;
    const lower = searchTerm.toLowerCase();
    return customers.filter(
      (c) =>
        (c.customerName && c.customerName.toLowerCase().includes(lower)) ||
        (c.customerCode && c.customerCode.toLowerCase().includes(lower))
    );
  }, [customers, searchTerm]);

  const filteredCustomers = useMemo(
    () => applyFilterRows(searchFiltered, appliedFilterRows),
    [searchFiltered, appliedFilterRows]
  );

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

  const orderedVisibleColumns = columnOrder.filter((k) => visibleColumns.includes(k)) as ErpCustomerColumnKey[];

  const filterColumns = useMemo(
    () =>
      ERP_CUSTOMER_FILTER_COLUMNS.map((col) => ({
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
          if (key === 'website' && val) {
            row[key] = val;
          } else {
            row[key] = val ?? '';
          }
        });
        return row;
      }),
    [currentPageRows, orderedVisibleColumns]
  );

  const getExportData = useCallback(async (): Promise<{ columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }> => {
    const caris = await erpCommonApi.getCaris(null);
    const list: ErpCustomer[] = caris.map((item) => ({
      branchCode: item.subeKodu,
      businessUnit: item.isletmeKodu,
      customerCode: item.cariKod,
      customerName: item.cariIsim || '',
      phone: item.cariTel || '',
      email: item.email || '',
      city: item.cariIl || '',
      district: item.cariIlce || '',
      address: item.cariAdres || '',
      countryCode: item.ulkeKodu,
      website: item.web,
      taxNumber: item.vergiNumarasi,
      taxOffice: item.vergiDairesi,
      tckn: item.tcknNumber,
    }));
    return {
      columns: exportColumns,
      rows: list.map((c) => {
        const row: Record<string, unknown> = {};
        orderedVisibleColumns.forEach((key) => {
          const val = c[key];
          if (key === 'website' && val) {
            row[key] = val;
          } else {
            row[key] = val ?? '';
          }
        });
        return row;
      }),
    };
  }, [exportColumns, orderedVisibleColumns]);

  const appliedFilterCount = useMemo(
    () => appliedFilterRows.filter((r) => r.value.trim()).length,
    [appliedFilterRows]
  );

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, searchTerm, appliedFilterRows, sortBy, sortDirection]);

  const handleRowClick = (customer: ErpCustomer): void => {
    setSelectedCustomer(customer);
    setIsDetailModalOpen(true);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['erpCustomers'] });
  };

  const columns = useMemo<DataTableGridColumn<ErpCustomerColumnKey>[]>(
    () =>
      tableColumns.map((c) => ({
        key: c.key as ErpCustomerColumnKey,
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
            exportFileName="erp-customers"
            exportColumns={exportColumns}
            exportRows={exportRows}
            getExportData={getExportData}
            filterColumns={filterColumns}
            defaultFilterColumn="customerCode"
            draftFilterRows={draftFilterRows}
            onDraftFilterRowsChange={setDraftFilterRows}
            onApplyFilters={() => setAppliedFilterRows(draftFilterRows)}
            onClearFilters={() => {
              setDraftFilterRows([]);
              setAppliedFilterRows([]);
            }}
            translationNamespace="erp-customer-management"
            appliedFilterCount={appliedFilterCount}
            searchValue={searchTerm}
            searchPlaceholder={t('placeholders.quickSearch')}
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
          <ErpCustomerTable
            columns={columns}
            visibleColumnKeys={orderedVisibleColumns}
            rows={currentPageRows}
            rowKey={(r) => r.customerCode}
            renderCell={(row, key) => {
              const val = row[key];
              if (val == null && val !== 0) return '-';
              if (key === 'website' && val) {
                return (
                  <a href={String(val)} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                    {String(val)}
                  </a>
                );
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
            loadingText={t('loading')}
            errorText={t('noData')}
            emptyText={t('noData')}
            minTableWidthClassName="min-w-[800px] lg:min-w-[1100px]"
            showActionsColumn={false}
            onRowClick={handleRowClick}
            rowClassName="group cursor-pointer"
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

      <ErpCustomerDetailModal
        customer={selectedCustomer}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
      />
    </div>
  );
}
