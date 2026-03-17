import { type ReactElement, useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, Loader2, Plus, RefreshCw, XCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DataTableActionBar, type DataTableGridColumn } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loadColumnPreferences } from '@/lib/column-preferences';
import { DISTRICT_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import { DistrictStats } from './DistrictStats';
import { DistrictTable, getColumnsConfig } from './DistrictTable';
import { DistrictForm } from './DistrictForm';
import { useCreateDistrict } from '../hooks/useCreateDistrict';
import { useUpdateDistrict } from '../hooks/useUpdateDistrict';
import type { DistrictDto } from '../types/district-types';
import type { DistrictFormSchema } from '../types/district-types';
import { useDistrictList } from '../hooks/useDistrictList';
import { applyDistrictFilters, DISTRICT_FILTER_COLUMNS } from '../types/district-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';
import { districtApi } from '../api/district-api';

const EMPTY_DISTRICTS: DistrictDto[] = [];
const PAGE_KEY = 'district-management';
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type DistrictColumnKey = keyof DistrictDto | 'status';

function resolveLabel(
  t: (key: string) => string,
  key: string,
  fallback: string
): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

export function DistrictManagementPage(): ReactElement {
  const { t } = useTranslation(['district-management', 'common']);
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState<DistrictDto | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<DistrictColumnKey>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const queryClient = useQueryClient();
  const createDistrict = useCreateDistrict();
  const updateDistrict = useUpdateDistrict();

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
    setPageTitle(t('districtManagement.menu'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [user?.id, defaultColumnKeys]);

  const { data: apiResponse, isLoading } = useDistrictList({
    pageNumber: 1,
    pageSize: 10000,
  });

  const districts = useMemo<DistrictDto[]>(
    () => apiResponse?.data ?? EMPTY_DISTRICTS,
    [apiResponse?.data]
  );

  const filteredDistricts = useMemo<DistrictDto[]>(() => {
    if (!districts.length) return [];
    let result = [...districts];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (d) =>
          (d.name && d.name.toLowerCase().includes(lower)) ||
          (d.erpCode && d.erpCode.toLowerCase().includes(lower)) ||
          (d.cityName && d.cityName.toLowerCase().includes(lower))
      );
    }
    result = applyDistrictFilters(result, appliedFilterRows);
    return result;
  }, [districts, searchTerm, appliedFilterRows]);

  const sortedDistricts = useMemo(() => {
    const result = [...filteredDistricts];
    result.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortBy] != null ? String((a as unknown as Record<string, unknown>)[sortBy]).toLowerCase() : '';
      const bVal = (b as unknown as Record<string, unknown>)[sortBy] != null ? String((b as unknown as Record<string, unknown>)[sortBy]).toLowerCase() : '';
      const cmp = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [filteredDistricts, sortBy, sortDirection]);

  const totalCount = sortedDistricts.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);
  const currentPageRows = useMemo(
    () => sortedDistricts.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
    [sortedDistricts, pageNumber, pageSize]
  );

  const orderedVisibleColumns = columnOrder.filter((k) => visibleColumns.includes(k)) as DistrictColumnKey[];

  const filterColumns = useMemo(
    () =>
      DISTRICT_FILTER_COLUMNS.map((col) => ({
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
      currentPageRows.map((d) => {
        const row: Record<string, unknown> = {};
        orderedVisibleColumns.forEach((key) => {
          if (key === 'isDeleted') {
            row[key] = d.isDeleted ? t('status.inactive') : t('status.active');
          } else {
            const val = (d as unknown as Record<string, unknown>)[key];
            row[key] = val ?? '';
          }
        });
        return row;
      }),
    [currentPageRows, orderedVisibleColumns, t]
  );

  const getExportData = useCallback(async (): Promise<{ columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }> => {
    const response = await districtApi.getList({ pageNumber: 1, pageSize: 10000 });
    const list = response?.data ?? [];
    return {
      columns: exportColumns,
      rows: list.map((d: DistrictDto) => {
        const row: Record<string, unknown> = {};
        orderedVisibleColumns.forEach((key) => {
          if (key === 'isDeleted') {
            row[key] = d.isDeleted ? t('status.inactive') : t('status.active');
          } else {
            const val = (d as unknown as Record<string, unknown>)[key];
            row[key] = val ?? '';
          }
        });
        return row;
      }),
    };
  }, [exportColumns, orderedVisibleColumns, t]);

  const appliedFilterCount = useMemo(
    () => appliedFilterRows.filter((r) => r.value.trim()).length,
    [appliedFilterRows]
  );

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, searchTerm, appliedFilterRows, sortBy, sortDirection]);

  const handleAddClick = (): void => {
    setEditingDistrict(null);
    setFormOpen(true);
  };

  const handleEdit = (district: DistrictDto): void => {
    setEditingDistrict(district);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: DistrictFormSchema): Promise<void> => {
    if (editingDistrict) {
      await updateDistrict.mutateAsync({
        id: editingDistrict.id,
        data: {
          name: data.name,
          erpCode: data.erpCode || undefined,
          cityId: data.cityId,
        },
      });
    } else {
      await createDistrict.mutateAsync({
        name: data.name,
        erpCode: data.erpCode || undefined,
        cityId: data.cityId,
      });
    }
    setFormOpen(false);
    setEditingDistrict(null);
  };

  const handleFormClose = (open: boolean): void => {
    setFormOpen(open);
    if (!open) setEditingDistrict(null);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: [DISTRICT_MANAGEMENT_QUERY_KEYS.LIST] });
  };

  const columns = useMemo<DataTableGridColumn<DistrictColumnKey>[]>(
    () =>
      tableColumns.map((c) => ({
        key: c.key as DistrictColumnKey,
        label: c.label,
        cellClassName: c.className,
      })),
    [tableColumns]
  );

  const renderCell = (row: DistrictDto, key: DistrictColumnKey): React.ReactNode => {
    if (key === 'isDeleted') {
      const isActive = !row.isDeleted;
      return (
        <span className="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-0.5 rounded-md border bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20">
          {isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
          {isActive ? t('status.active') : t('status.inactive')}
        </span>
      );
    }
    const val = (row as unknown as Record<string, unknown>)[key];
    if (val == null) return '-';
    return String(val);
  };

  return (
    <div className="w-full space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('districtManagement.menu')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('districtManagement.description')}
          </p>
        </div>
        <Button
          onClick={handleAddClick}
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white h-11"
        >
          <Plus size={18} className="mr-2" />
          {t('districtManagement.addButton')}
        </Button>
      </div>

      <DistrictStats />

      <Card className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm">
        <CardHeader className="space-y-4">
          <CardTitle>{t('districtManagement.table.title', { defaultValue: 'İlçe Listesi' })}</CardTitle>
          <DataTableActionBar
            pageKey={PAGE_KEY}
            userId={user?.id}
            columns={baseColumns}
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            onVisibleColumnsChange={setVisibleColumns}
            onColumnOrderChange={setColumnOrder}
            exportFileName="districts"
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
            translationNamespace="district-management"
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
              </>
            }
          />
        </CardHeader>
        <CardContent>
          <DistrictTable
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
            errorText={t('countryManagement.error', { defaultValue: 'Hata oluştu' })}
            emptyText={t('common.noData')}
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
        </CardContent>
      </Card>

      <DistrictForm
        open={formOpen}
        onOpenChange={handleFormClose}
        onSubmit={handleFormSubmit}
        district={editingDistrict}
        isLoading={createDistrict.isPending || updateDistrict.isPending}
      />
    </div>
  );
}
