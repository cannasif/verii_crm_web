import { type ReactElement, useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, ArrowUpDown, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { type DataTableActionBarProps, type DataTableGridColumn } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
} from '@/lib/management-list-layout';
import { fetchAllPagedData } from '@/lib/fetch-all-paged-data';
import { ProductPricingTable, getColumnsConfig } from './ProductPricingTable';
import { ProductPricingForm } from './ProductPricingForm';
import { productPricingApi } from '../api/product-pricing-api';
import { useCreateProductPricing } from '../hooks/useCreateProductPricing';
import { useUpdateProductPricing } from '../hooks/useUpdateProductPricing';
import { useDeleteProductPricing } from '../hooks/useDeleteProductPricing';
import { useProductPricings } from '../hooks/useProductPricings';
import type { ProductPricingGetDto } from '../types/product-pricing-types';
import type { ProductPricingFormSchema } from '../types/product-pricing-types';
import { formatPrice } from '../types/product-pricing-types';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
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
  const [searchResetKey, setSearchResetKey] = useState(0);
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
  const { data: exchangeRates = [] } = useExchangeRate();

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
    pageNumber,
    pageSize,
    sortBy,
    sortDirection,
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

  const totalCount = apiResponse?.totalCount ?? sortedItems.length;
  const totalPages = apiResponse?.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(startRow + sortedItems.length - 1, totalCount);
  const currentPageRows = sortedItems;

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
      currentPageRows.map((item) => {
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
    [currentPageRows, orderedVisibleColumns, i18n.language]
  );

  const getExportData = useCallback(async (): Promise<{ columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }> => {
    const list = await fetchAllPagedData({
      fetchPage: (exportPageNumber, exportPageSize) =>
        productPricingApi.getList({
          pageNumber: exportPageNumber,
          pageSize: exportPageSize,
          sortBy: 'Id',
          sortDirection: 'desc',
          filters: apiFilters,
        }),
    });
    return {
      columns: exportColumns,
      rows: list.map((item) => {
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
    };
  }, [exportColumns, orderedVisibleColumns, i18n.language, apiFilters]);

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

  const handleGridRefresh = async (): Promise<void> => {
    setSearchTerm('');
    setSearchResetKey((value) => value + 1);
    setDraftFilterRows([]);
    setAppliedFilterRows([]);
    setActiveFilter('all');
    setPageNumber(1);
    await handleRefresh();
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2 pb-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white transition-colors">
            {t('title')}
          </h1>
          <p className="text-zinc-500 dark:text-muted-foreground text-sm flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
            {t('description')}
          </p>
        </div>
        <Button
          onClick={handleAddClick}
          className="h-12 px-8 bg-linear-to-r from-pink-600 to-orange-600 rounded-2xl text-white text-sm font-black shadow-xl shadow-pink-500/20 transition-all duration-300 hover:scale-[1.05] hover:shadow-pink-500/30 active:scale-[0.98] border-0 opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
        >
          <Plus size={20} className="mr-2 stroke-[3px]" />
          {t('create', { defaultValue: t('common.create') })}
        </Button>
      </div>

      <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
        <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
          <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>{t('table.title')}</CardTitle>
        </CardHeader>
        <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
          <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
            <ProductPricingTable
              actionBar={{
                pageKey: PAGE_KEY,
                userId: user?.id,
                columns: baseColumns,
                visibleColumns,
                columnOrder,
                onVisibleColumnsChange: setVisibleColumns,
                onColumnOrderChange: setColumnOrder,
                exportFileName: 'product-pricings',
                exportColumns,
                exportRows,
                getExportData,
                filterColumns,
                defaultFilterColumn: 'erpProductCode',
                draftFilterRows,
                onDraftFilterRowsChange: setDraftFilterRows,
                onApplyFilters: () => setAppliedFilterRows(draftFilterRows),
                onClearFilters: () => {
                  setDraftFilterRows([]);
                  setAppliedFilterRows([]);
                },
                translationNamespace: 'product-pricing-management',
                appliedFilterCount,
                search: {
                  onSearchChange: setSearchTerm,
                  placeholder: t('searchPlaceholder'),
                  minLength: 1,
                  resetKey: searchResetKey,
                },
                refresh: {
                  onRefresh: () => {
                    void handleGridRefresh();
                  },
                  isLoading,
                  cooldownSeconds: 60,
                  label: resolveLabel(t, 'common.refresh', 'Yenile'),
                },
                leftSlot: (
                  <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-white/5 p-1 rounded-xl">
                    {(['all', 'active', 'archive'] as const).map((filter) => (
                      <Button
                        key={filter}
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveFilter(filter)}
                        className={`rounded-lg px-4 h-8 text-xs font-bold uppercase tracking-wider shrink-0 transition-all ${activeFilter === filter
                          ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                          }`}
                      >
                        {t(`filter.${filter}`)}
                      </Button>
                    ))}
                  </div>
                ),
              } satisfies DataTableActionBarProps}
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
                  return formatPrice(Number(val), row.currency, i18n.language, exchangeRates);
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
              onRowDoubleClick={handleEdit}
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
