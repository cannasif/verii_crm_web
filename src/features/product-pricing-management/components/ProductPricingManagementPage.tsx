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
import { ProductPricingTable, getColumnsConfig } from './ProductPricingTable';
import { ProductPricingForm } from './ProductPricingForm';
import { useCreateProductPricing } from '../hooks/useCreateProductPricing';
import { useUpdateProductPricing } from '../hooks/useUpdateProductPricing';
import { useDeleteProductPricing } from '../hooks/useDeleteProductPricing';
import { useProductPricings } from '../hooks/useProductPricings';
import type { ProductPricingGetDto } from '../types/product-pricing-types';
import type { ProductPricingFormSchema } from '../types/product-pricing-types';
import { applyProductPricingFilters, PRODUCT_PRICING_FILTER_COLUMNS } from '../types/product-pricing-filter.types';
import { queryKeys } from '../utils/query-keys';
import type { FilterRow } from '@/lib/advanced-filter-types';

const EMPTY_ITEMS: ProductPricingGetDto[] = [];
const PAGE_KEY = 'product-pricing-management';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type ProductPricingColumnKey = keyof ProductPricingGetDto;

function resolveLabel(
  t: (key: string) => string,
  key: string,
  fallback: string
): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

export function ProductPricingManagementPage(): ReactElement {
  const { t, i18n } = useTranslation(['product-pricing-management', 'common']);
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingProductPricing, setEditingProductPricing] = useState<ProductPricingGetDto | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<ProductPricingColumnKey>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'archive'>('all');

  const queryClient = useQueryClient();
  const createProductPricing = useCreateProductPricing();
  const updateProductPricing = useUpdateProductPricing();
  const deleteProductPricing = useDeleteProductPricing();

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

  const apiFilters = useMemo(() => {
    const filters: Array<{ column: string; operator: string; value: string }> = [];
    if (activeFilter === 'active') {
      filters.push({ column: 'IsDeleted', operator: 'eq', value: 'false' });
    } else if (activeFilter === 'archive') {
      filters.push({ column: 'IsDeleted', operator: 'eq', value: 'true' });
    }
    if (searchTerm.trim()) {
      filters.push({ column: 'ErpProductCode', operator: 'contains', value: searchTerm.trim() });
    }
    return filters;
  }, [activeFilter, searchTerm]);

  const { data: apiResponse, isLoading } = useProductPricings({
    pageNumber: 1,
    pageSize: 10000,
    sortBy: 'Id',
    sortDirection: 'desc',
    filters: apiFilters,
  });

  const items = useMemo<ProductPricingGetDto[]>(
    () => apiResponse?.data ?? EMPTY_ITEMS,
    [apiResponse?.data]
  );

  const filteredItems = useMemo<ProductPricingGetDto[]>(
    () => applyProductPricingFilters(items, appliedFilterRows),
    [items, appliedFilterRows]
  );

  const sortedItems = useMemo(() => {
    const result = [...filteredItems];
    result.sort((a, b) => {
      const aVal = a[sortBy] != null ? String(a[sortBy]).toLowerCase() : '';
      const bVal = b[sortBy] != null ? String(b[sortBy]).toLowerCase() : '';
      const cmp = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [filteredItems, sortBy, sortDirection]);

  const totalCount = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);
  const currentPageRows = useMemo(
    () => sortedItems.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
    [sortedItems, pageNumber, pageSize]
  );

  const orderedVisibleColumns = columnOrder.filter((k) => visibleColumns.includes(k)) as ProductPricingColumnKey[];

  const filterColumns = useMemo(
    () =>
      PRODUCT_PRICING_FILTER_COLUMNS.map((col) => ({
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
      filteredItems.map((item) => {
        const row: Record<string, unknown> = {};
        orderedVisibleColumns.forEach((key) => {
          const val = item[key];
          if (key === 'createdDate' && val) {
            row[key] = new Date(String(val)).toLocaleDateString(i18n.language);
          } else {
            row[key] = val ?? '';
          }
        });
        return row;
      }),
    [filteredItems, orderedVisibleColumns, i18n.language]
  );

  const appliedFilterCount = useMemo(
    () => appliedFilterRows.filter((r) => r.value.trim()).length,
    [appliedFilterRows]
  );

  const usedErpProductCodes = useMemo((): string[] => {
    return [...new Set(items.map((x) => x.erpProductCode))];
  }, [items]);

  const excludeProductCodes = useMemo((): string[] => {
    if (!editingProductPricing) return usedErpProductCodes;
    return usedErpProductCodes.filter((c) => c !== editingProductPricing.erpProductCode);
  }, [usedErpProductCodes, editingProductPricing]);

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, searchTerm, appliedFilterRows, sortBy, sortDirection, activeFilter]);

  const handleAddClick = (): void => {
    setEditingProductPricing(null);
    setFormOpen(true);
  };

  const handleEdit = (productPricing: ProductPricingGetDto): void => {
    setEditingProductPricing(productPricing);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean): void => {
    setFormOpen(open);
    if (!open) setEditingProductPricing(null);
  };

  const handleFormSubmit = async (data: ProductPricingFormSchema): Promise<void> => {
    if (editingProductPricing) {
      await updateProductPricing.mutateAsync({
        id: editingProductPricing.id,
        data: {
          id: editingProductPricing.id,
          erpProductCode: data.erpProductCode,
          erpGroupCode: data.erpGroupCode,
          currency: data.currency,
          listPrice: data.listPrice,
          costPrice: data.costPrice,
          discount1: data.discount1 || undefined,
          discount2: data.discount2 || undefined,
          discount3: data.discount3 || undefined,
        },
      });
    } else {
      await createProductPricing.mutateAsync({
        erpProductCode: data.erpProductCode,
        erpGroupCode: data.erpGroupCode,
        currency: data.currency,
        listPrice: data.listPrice,
        costPrice: data.costPrice,
        discount1: data.discount1 || undefined,
        discount2: data.discount2 || undefined,
        discount3: data.discount3 || undefined,
      });
    }
    setFormOpen(false);
    setEditingProductPricing(null);
  };

  const handleDeleteClick = async (id: number): Promise<void> => {
    await deleteProductPricing.mutateAsync(id);
    setFormOpen(false);
    setEditingProductPricing(null);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.list({}) });
  };

  const columns = useMemo<DataTableGridColumn<ProductPricingColumnKey>[]>(
    () =>
      tableColumns.map((c) => ({
        key: c.key as ProductPricingColumnKey,
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
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white h-11"
        >
          <Plus size={18} className="mr-2" />
          {t('create')}
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
            exportFileName="product-pricings"
            exportColumns={exportColumns}
            exportRows={exportRows}
            filterColumns={filterColumns}
            defaultFilterColumn="erpProductCode"
            draftFilterRows={draftFilterRows}
            onDraftFilterRowsChange={setDraftFilterRows}
            onApplyFilters={() => setAppliedFilterRows(draftFilterRows)}
            onClearFilters={() => {
              setDraftFilterRows([]);
              setAppliedFilterRows([]);
            }}
            translationNamespace="product-pricing-management"
            appliedFilterCount={appliedFilterCount}
            leftSlot={
              <>
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-[200px]"
                />
                <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-white/5 p-1 rounded-xl">
                  {(['all', 'active', 'archive'] as const).map((filter) => (
                    <Button
                      key={filter}
                      variant={activeFilter === filter ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveFilter(filter)}
                      className="h-7 text-xs"
                    >
                      {t(`filter.${filter}`)}
                    </Button>
                  ))}
                </div>
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
          <ProductPricingTable
            columns={columns}
            visibleColumnKeys={orderedVisibleColumns}
            rows={currentPageRows}
            rowKey={(r) => r.id}
            renderCell={(row, key) => {
              const val = row[key];
              if (val == null && val !== 0) return '-';
              if (key === 'id') return `#${val}`;
              if (key === 'createdDate') return new Date(String(val)).toLocaleDateString(i18n.language);
              if (key === 'listPrice' || key === 'costPrice') {
                return new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 2 }).format(Number(val)) + ' ' + (row.currency ?? '');
              }
              if (key === 'discount1' || key === 'discount2' || key === 'discount3') {
                return val ? `%${val}` : '-';
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
            errorText={t('deleteError')}
            emptyText={t('table.noData')}
            minTableWidthClassName="min-w-[800px] lg:min-w-[1000px]"
            showActionsColumn
            actionsHeaderLabel={t('actions')}
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
            previousLabel={t('previous')}
            nextLabel={t('next')}
            paginationInfoText={t('common.table.showing', {
              from: startRow,
              to: endRow,
              total: totalCount,
            })}
            disablePaginationButtons={false}
          />
        </CardContent>
      </Card>

      <ProductPricingForm
        open={formOpen}
        onOpenChange={handleFormClose}
        onSubmit={handleFormSubmit}
        onDelete={handleDeleteClick}
        productPricing={editingProductPricing}
        isLoading={
          createProductPricing.isPending ||
          updateProductPricing.isPending ||
          deleteProductPricing.isPending
        }
        excludeProductCodes={excludeProductCodes}
      />
    </div>
  );
}
