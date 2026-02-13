import { type ReactElement, useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import {
  Plus,
  ChevronDown,
  Filter,
  FileSpreadsheet,
  FileText,
  Presentation,
  Menu,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageToolbar, ColumnPreferencesPopover, AdvancedFilter } from '@/components/shared';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import { applySalesTypeFilters, SALES_TYPE_FILTER_COLUMNS } from '../types/sales-type-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../utils/query-keys';
import { SalesTypeTable, getColumnsConfig } from './SalesTypeTable';
import { SalesTypeForm } from './SalesTypeForm';
import { useCreateSalesType } from '../hooks/useCreateSalesType';
import { useUpdateSalesType } from '../hooks/useUpdateSalesType';
import { useSalesTypeList } from '../hooks/useSalesTypeList';
import type { SalesTypeGetDto } from '../types/sales-type-types';
import type { SalesTypeFormSchema } from '../types/sales-type-types';
import { OfferType } from '@/types/offer-type';

const EMPTY_SALES_TYPES: SalesTypeGetDto[] = [];

export function SalesTypeManagementPage(): ReactElement {
  const { t } = useTranslation(['sales-type-management', 'common']);
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SalesTypeGetDto | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const queryClient = useQueryClient();
  const createSalesType = useCreateSalesType();
  const updateSalesType = useUpdateSalesType();

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);
  const defaultColumnKeys = useMemo(() => tableColumns.map((c) => c.key), [tableColumns]);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<Array<keyof SalesTypeGetDto>>(
    () => defaultColumnKeys
  );

  useEffect(() => {
    const prefs = loadColumnPreferences('sales-type-management', user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys as Array<keyof SalesTypeGetDto>);
    setColumnOrder(prefs.order);
  }, [user?.id, defaultColumnKeys]);

  // Fetch all sales types for client-side filtering
  const { data: apiResponse, isLoading } = useSalesTypeList({
    pageNumber: 1,
    pageSize: 10000
  });

  const items = useMemo<SalesTypeGetDto[]>(
    () => apiResponse?.data ?? EMPTY_SALES_TYPES,
    [apiResponse?.data]
  );

  useEffect(() => {
    setPageTitle(t('menu'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  const salesTypeLabel = useCallback((value: string): string => {
    if (value === OfferType.YURTICI) return t('common.offerType.yurtici', { ns: 'common' });
    if (value === OfferType.YURTDISI) return t('common.offerType.yurtdisi', { ns: 'common' });
    return value;
  }, [t]);

  const filteredItems = useMemo<SalesTypeGetDto[]>(() => {
    if (!items) return [];

    let result: SalesTypeGetDto[] = [...items];

    // Quick Search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((item) => {
        const nameMatch = item.name && item.name.toLowerCase().includes(lowerSearch);
        const typeLabel = salesTypeLabel(item.salesType);
        const typeMatch = typeLabel && typeLabel.toLowerCase().includes(lowerSearch);
        return nameMatch || typeMatch;
      });
    }

    result = applySalesTypeFilters(result, appliedFilterRows);

    return result;
  }, [items, searchTerm, appliedFilterRows, salesTypeLabel]);

  const handleAdvancedSearch = () => {
    setAppliedFilterRows(draftFilterRows);
    setSearchTerm('');
    setShowFilters(false);
  };

  const handleAdvancedClear = () => {
    setDraftFilterRows([]);
    setAppliedFilterRows([]);
  };

  const handleExportExcel = async () => {
    const dataToExport = filteredItems.map((item) => {
      const row: Record<string, string | number | boolean | null | undefined> = {};
      displayedColumnsForExport.forEach((col) => {
        let value = item[col.key];
        if (col.key === 'salesType') {
          value = salesTypeLabel(value as string);
        }
        row[col.label] =
          typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
            ? value
            : value ?? '';
      });
      return row;
    });

    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SalesTypes");
    XLSX.writeFile(wb, "sales-types.xlsx");
  };

  const handleExportPDF = async () => {
    const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new JsPDF();
    
    const tableColumn = displayedColumnsForExport.map((col) => col.label);
    const tableRows = filteredItems.map((item) =>
      displayedColumnsForExport.map((col) => {
        let value = item[col.key];
        if (col.key === 'salesType') {
          value = salesTypeLabel(value as string);
        }
        return value ?? '';
      })
    );

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
    });

    doc.save("sales-types.pdf");
  };

  const handleExportPowerPoint = async () => {
    const { default: PptxGenJS } = await import('pptxgenjs');
    const pptx = new PptxGenJS();
    const slide = pptx.addSlide();
    
    // Add Title
    slide.addText("Sales Type Report", { x: 0.5, y: 0.5, w: '90%', fontSize: 24, bold: true });

    const headers = displayedColumnsForExport.map((col) => col.label);
    const rows = filteredItems.map((item) =>
      displayedColumnsForExport.map((col) => {
        let value = item[col.key];
        if (col.key === 'salesType') {
          value = salesTypeLabel(value as string);
        }
        return String(value ?? '');
      })
    );

    const tableData = [
      headers.map(text => ({ text })),
      ...rows.map(row => row.map(text => ({ text }))),
    ];

    slide.addTable(tableData, { x: 0.5, y: 1.5, w: '90%' });

    pptx.writeFile({ fileName: "sales-types.pptx" });
  };

  const handleAddClick = (): void => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: SalesTypeGetDto): void => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: SalesTypeFormSchema): Promise<void> => {
    if (editingItem) {
      await updateSalesType.mutateAsync({
        id: editingItem.id,
        data: { salesType: data.salesType, name: data.name.trim() },
      });
    } else {
      await createSalesType.mutateAsync({ salesType: data.salesType, name: data.name.trim() });
    }
    setFormOpen(false);
    setEditingItem(null);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.list({ pageNumber: 1, pageSize: 10000 }),
    });
  };

  const hasFiltersActive = appliedFilterRows.some((r) => r.value.trim() !== '');

  const displayedColumnsForExport = useMemo(() => {
    const orderMap = new Map(columnOrder.map((k, i) => [k, i]));
    return tableColumns
      .filter((col) => visibleColumns.includes(col.key))
      .sort((a, b) => (orderMap.get(a.key) ?? 999) - (orderMap.get(b.key) ?? 999));
  }, [tableColumns, visibleColumns, columnOrder]);

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
        <div className="flex gap-2">
            <Button
              onClick={handleAddClick}
              className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white h-11"
            >
              <Plus size={18} className="mr-2" />
              {t('addButton')}
            </Button>
        </div>
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-5 flex flex-col gap-5 transition-all duration-300">
        <PageToolbar
          searchPlaceholder={t('searchPlaceholder')}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          onRefresh={handleRefresh}
          rightSlot={
            <div className="flex items-center gap-2">
              <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button 
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 bg-transparent text-gray-400 border-white/10 hover:bg-white/5 hover:text-white"
                        >
                            <span className="font-medium text-sm">{pageSize}</span>
                            <ChevronDown size={16} />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-20 bg-[#151025] border border-white/10 shadow-2xl rounded-xl overflow-hidden p-1">
                        {[10, 20, 50].map((size) => (
                            <DropdownMenuItem 
                                key={size} 
                                onClick={() => setPageSize(size)}
                                className={`flex items-center justify-center text-xs font-medium px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${pageSize === size ? 'bg-pink-500/10 text-pink-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                {size}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <Popover open={showFilters} onOpenChange={setShowFilters}>
                <PopoverTrigger asChild>
                  <Button
                    variant={hasFiltersActive ? 'default' : 'outline'}
                    size="sm"
                    className={`h-9 border-dashed border-slate-300 dark:border-white/20 text-xs sm:text-sm ${
                      hasFiltersActive
                        ? 'bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30 hover:bg-pink-500/30'
                        : 'bg-transparent hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    {t('common.filters', { ns: 'common' })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="end" className="w-[420px] p-0 bg-[#151025] border border-white/10 shadow-2xl rounded-2xl overflow-hidden">
                  <AdvancedFilter
                    columns={SALES_TYPE_FILTER_COLUMNS}
                    defaultColumn="name"
                    draftRows={draftFilterRows}
                    onDraftRowsChange={setDraftFilterRows}
                    onSearch={handleAdvancedSearch}
                    onClear={handleAdvancedClear}
                    translationNamespace="sales-type-management"
                    embedded
                  />
                </PopoverContent>
              </Popover>
              <ColumnPreferencesPopover
                pageKey="sales-type-management"
                userId={user?.id}
                columns={tableColumns.map((c) => ({ key: c.key as string, label: c.label }))}
                visibleColumns={visibleColumns.map(String)}
                columnOrder={columnOrder}
                onVisibleColumnsChange={(next) => {
                  setVisibleColumns(next as Array<keyof SalesTypeGetDto>);
                  saveColumnPreferences('sales-type-management', user?.id, {
                    order: columnOrder,
                    visibleKeys: next.map(String),
                  });
                }}
                onColumnOrderChange={(next) => {
                  setColumnOrder(next);
                  saveColumnPreferences('sales-type-management', user?.id, {
                    order: next,
                    visibleKeys: visibleColumns.map(String),
                  });
                }}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10 w-10 p-0 border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-pink-50 dark:hover:bg-white/10 hover:border-pink-500/30">
                    <Menu size={18} className="text-slate-500 dark:text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-[#151025] border border-white/10 shadow-2xl shadow-black/50 overflow-visible p-0">
                  <div className="p-2">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {t('common.actions', { ns: 'common' })}
                    </div>
                  </div>

                  <div className="h-px bg-white/5 my-1"></div>

                  <div className="p-2">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {t('common.export', { ns: 'common' })}
                    </div>
                    <button onClick={handleExportExcel} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-white/5 transition-colors text-left">
                      <FileSpreadsheet size={16} className="text-emerald-500" />
                      <span>{t('common.exportExcel', { ns: 'common' })}</span>
                    </button>
                    <button onClick={handleExportPDF} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-white/5 transition-colors text-left">
                      <FileText size={16} className="text-red-400" />
                      <span>{t('common.exportPDF', { ns: 'common' })}</span>
                    </button>
                    <button onClick={handleExportPowerPoint} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-white/5 transition-colors text-left">
                      <Presentation size={16} className="text-orange-400" />
                      <span>{t('common.exportPPT', { ns: 'common' })}</span>
                    </button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-0 sm:p-1 transition-all duration-300 overflow-hidden">
        <SalesTypeTable
          items={filteredItems}
          isLoading={isLoading}
          onEdit={handleEdit}
          visibleColumns={visibleColumns}
          pageSize={pageSize}
          columnOrder={columnOrder}
          onColumnOrderChange={(next) => {
            setColumnOrder(next);
            saveColumnPreferences('sales-type-management', user?.id, {
              order: next,
              visibleKeys: visibleColumns.map(String),
            });
          }}
        />
      </div>

      <SalesTypeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        salesType={editingItem}
        isLoading={createSalesType.isPending || updateSalesType.isPending}
      />
    </div>
  );
}
