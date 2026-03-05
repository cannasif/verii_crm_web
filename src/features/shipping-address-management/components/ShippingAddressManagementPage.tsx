import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Plus, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DataTableActionBar, type DataTableGridColumn } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loadColumnPreferences } from '@/lib/column-preferences';
import { SHIPPING_ADDRESS_QUERY_KEYS } from '../utils/query-keys';
import { ShippingAddressTable, getColumnsConfig } from './ShippingAddressTable';
import { ShippingAddressForm } from './ShippingAddressForm';
import type { ShippingAddressDto, ShippingAddressFormSchema } from '../types/shipping-address-types';
import { useShippingAddresses } from '../hooks/useShippingAddresses';
import { useCreateShippingAddress } from '../hooks/useCreateShippingAddress';
import { useUpdateShippingAddress } from '../hooks/useUpdateShippingAddress';
import { applyShippingAddressFilters, SHIPPING_ADDRESS_FILTER_COLUMNS } from '../types/shipping-address-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';

const EMPTY_SHIPPING_ADDRESSES: ShippingAddressDto[] = [];
const PAGE_KEY = 'shipping-address-management';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type ShippingAddressColumnKey = keyof ShippingAddressDto | 'location';

function resolveLabel(
  t: (key: string) => string,
  key: string,
  fallback: string
): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

export function ShippingAddressManagementPage(): ReactElement {
  const { t, i18n } = useTranslation(['shipping-address-management', 'common']);
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();

  const [formOpen, setFormOpen] = useState(false);
  const [selectedShippingAddress, setSelectedShippingAddress] = useState<ShippingAddressDto | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<ShippingAddressColumnKey>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const queryClient = useQueryClient();
  const createShippingAddress = useCreateShippingAddress();
  const updateShippingAddress = useUpdateShippingAddress();

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);
  const defaultColumnKeys = useMemo(
    () => tableColumns.filter((c) => c.visible).map((c) => c.key),
    [tableColumns]
  );
  const baseColumns = useMemo(
    () =>
      tableColumns.map((c) => ({
        key: c.key,
        label: c.label,
      })),
    [tableColumns]
  );
  const [columnOrder, setColumnOrder] = useState<string[]>(() => defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => defaultColumnKeys);

  useEffect(() => {
    setPageTitle(t('shippingAddressManagement.title'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [user?.id, defaultColumnKeys]);

  const { data: apiResponse, isLoading } = useShippingAddresses({
    pageNumber: 1,
    pageSize: 10000,
  });

  const shippingAddresses = useMemo<ShippingAddressDto[]>(
    () => apiResponse?.data ?? EMPTY_SHIPPING_ADDRESSES,
    [apiResponse?.data]
  );

  const filteredShippingAddresses = useMemo<ShippingAddressDto[]>(() => {
    if (!shippingAddresses.length) return [];
    let result = [...shippingAddresses];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(lower)) ||
          (c.address && c.address.toLowerCase().includes(lower)) ||
          (c.customerName && c.customerName.toLowerCase().includes(lower)) ||
          (c.contactPerson && c.contactPerson?.toLowerCase().includes(lower)) ||
          (c.phone && c.phone.toLowerCase().includes(lower))
      );
    }
    result = applyShippingAddressFilters(result, appliedFilterRows);
    return result;
  }, [shippingAddresses, searchTerm, appliedFilterRows]);

  const sortedShippingAddresses = useMemo(() => {
    const result = [...filteredShippingAddresses];
    result.sort((a, b) => {
      let aVal: string;
      let bVal: string;
      if (sortBy === 'location') {
        aVal = [a.countryName, a.cityName, a.districtName].filter(Boolean).join(' / ').toLowerCase();
        bVal = [b.countryName, b.cityName, b.districtName].filter(Boolean).join(' / ').toLowerCase();
      } else {
        const aRaw = a[sortBy as keyof ShippingAddressDto];
        const bRaw = b[sortBy as keyof ShippingAddressDto];
        aVal = aRaw != null ? String(aRaw).toLowerCase() : '';
        bVal = bRaw != null ? String(bRaw).toLowerCase() : '';
      }
      const cmp = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [filteredShippingAddresses, sortBy, sortDirection]);

  const totalCount = sortedShippingAddresses.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);
  const currentPageRows = useMemo(
    () => sortedShippingAddresses.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
    [sortedShippingAddresses, pageNumber, pageSize]
  );

  const orderedVisibleColumns = columnOrder.filter((k) => visibleColumns.includes(k)) as ShippingAddressColumnKey[];

  const filterColumns = useMemo(
    () =>
      SHIPPING_ADDRESS_FILTER_COLUMNS.map((col) => ({
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
      filteredShippingAddresses.map((c) => {
        const row: Record<string, unknown> = {};
        orderedVisibleColumns.forEach((key) => {
          if (key === 'location') {
            row[key] = [c.countryName, c.cityName, c.districtName].filter(Boolean).join(' / ');
          } else if (key === 'createdDate' && c.createdDate) {
            row[key] = new Date(String(c.createdDate)).toLocaleDateString(i18n.language);
          } else if (key === 'isDefault') {
            row[key] = c.isDefault ? t('shippingAddressManagement.defaultBadge') : '-';
          } else if (key === 'isActive') {
            row[key] = c.isActive ? t('common.active') : t('common.inactive');
          } else {
            const val = c[key as keyof ShippingAddressDto];
            row[key] = val ?? '';
          }
        });
        return row;
      }),
    [filteredShippingAddresses, orderedVisibleColumns, i18n.language, t]
  );

  const appliedFilterCount = useMemo(
    () => appliedFilterRows.filter((r) => r.value.trim()).length,
    [appliedFilterRows]
  );

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, searchTerm, appliedFilterRows, sortBy, sortDirection]);

  const handleCreateClick = (): void => {
    setSelectedShippingAddress(null);
    setFormOpen(true);
  };

  const handleEditClick = (shippingAddress: ShippingAddressDto): void => {
    setSelectedShippingAddress(shippingAddress);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean): void => {
    setFormOpen(open);
    if (!open) setSelectedShippingAddress(null);
  };

  const handleFormSubmit = async (data: ShippingAddressFormSchema): Promise<void> => {
    const processedData = {
      ...data,
      name: data.name ?? undefined,
      postalCode: data.postalCode ?? undefined,
      contactPerson: data.contactPerson ?? undefined,
      phone: data.phone ?? undefined,
      notes: data.notes ?? undefined,
      countryId: data.countryId ?? undefined,
      cityId: data.cityId ?? undefined,
      districtId: data.districtId ?? undefined,
      isDefault: data.isDefault,
      isActive: data.isActive,
    };
    if (selectedShippingAddress) {
      await updateShippingAddress.mutateAsync({
        id: selectedShippingAddress.id,
        data: processedData,
      });
    } else {
      await createShippingAddress.mutateAsync(processedData);
    }
    setFormOpen(false);
    setSelectedShippingAddress(null);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: [SHIPPING_ADDRESS_QUERY_KEYS.LIST] });
  };

  const columns = useMemo<DataTableGridColumn<ShippingAddressColumnKey>[]>(
    () =>
      tableColumns.map((c) => ({
        key: c.key as ShippingAddressColumnKey,
        label: c.label,
        cellClassName: c.className,
      })),
    [tableColumns]
  );

  const renderCell = (row: ShippingAddressDto, key: ShippingAddressColumnKey): React.ReactNode => {
    switch (key) {
      case 'customerName':
        return <span className="font-medium text-slate-700 dark:text-slate-300">{row.customerName || '-'}</span>;
      case 'name':
        return row.name || '-';
      case 'address':
        return <div className="max-w-xs truncate" title={row.address}>{row.address}</div>;
      case 'postalCode':
        return row.postalCode || '-';
      case 'contactPerson':
        return row.contactPerson || '-';
      case 'phone':
        return row.phone || '-';
      case 'location':
        return [row.countryName, row.cityName, row.districtName].filter(Boolean).join(' / ') || '-';
      case 'isDefault':
        return row.isDefault ? (
          <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300">
            {t('defaultBadge')}
          </span>
        ) : '-';
      case 'isActive':
        return (
          <span
            className={`inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-0.5 rounded-md border text-xs font-medium ${
              row.isActive
                ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20'
                : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20'
            }`}
          >
            {row.isActive ? t('common.active') : t('common.inactive')}
          </span>
        );
      case 'createdDate':
        return row.createdDate ? new Date(row.createdDate).toLocaleDateString(i18n.language) : '-';
      default: {
        const value = row[key as keyof ShippingAddressDto];
        if (typeof value === 'string' || typeof value === 'number') return value;
        if (typeof value === 'boolean') return value ? t('common.yes') : t('common.no');
        return value == null ? '-' : String(value);
      }
    }
  };

  return (
    <div className="w-full space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('shippingAddressManagement.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('description', { defaultValue: 'Sevk adreslerini yönetin' })}
          </p>
        </div>
        <Button
          onClick={handleCreateClick}
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white h-11"
        >
          <Plus size={18} className="mr-2" />
          {t('shippingAddressManagement.create')}
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
            exportFileName="shipping-addresses"
            exportColumns={exportColumns}
            exportRows={exportRows}
            filterColumns={filterColumns}
            defaultFilterColumn="name"
            draftFilterRows={draftFilterRows}
            onDraftFilterRowsChange={setDraftFilterRows}
            onApplyFilters={() => setAppliedFilterRows(draftFilterRows)}
            onClearFilters={() => {
              setDraftFilterRows([]);
              setAppliedFilterRows([]);
            }}
            translationNamespace="shipping-address-management"
            appliedFilterCount={appliedFilterCount}
            leftSlot={
              <>
                <Input
                  placeholder={t('shippingAddressManagement.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-[200px]"
                />
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
          <ShippingAddressTable
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
            errorText={t('shippingAddressManagement.error', { defaultValue: 'Hata oluştu' })}
            emptyText={t('shippingAddressManagement.noData')}
            minTableWidthClassName="min-w-[800px] lg:min-w-[1000px]"
            showActionsColumn
            actionsHeaderLabel={t('common.actions')}
            onEdit={handleEditClick}
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

      <ShippingAddressForm
        open={formOpen}
        onOpenChange={handleFormClose}
        shippingAddress={selectedShippingAddress}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
