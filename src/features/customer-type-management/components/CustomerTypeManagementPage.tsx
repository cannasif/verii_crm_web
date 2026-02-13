import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Plus, Filter, FileSpreadsheet, FileText, Presentation, ChevronDown, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { CustomerTypeStats } from './CustomerTypeStats';
import { CustomerTypeTable, getColumnsConfig } from './CustomerTypeTable';
import { CustomerTypeForm } from './CustomerTypeForm';
import { useCreateCustomerType } from '../hooks/useCreateCustomerType';
import { useUpdateCustomerType } from '../hooks/useUpdateCustomerType';
import { useCustomerTypeList } from '../hooks/useCustomerTypeList';
import type { CustomerTypeDto, CustomerTypeFormSchema } from '../types/customer-type-types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { PageToolbar, ColumnPreferencesPopover, AdvancedFilter } from '@/components/shared';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import { CUSTOMER_TYPE_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import { applyCustomerTypeFilters, CUSTOMER_TYPE_FILTER_COLUMNS } from '../types/customer-type-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';

const EMPTY_CUSTOMER_TYPES: CustomerTypeDto[] = [];

export function CustomerTypeManagementPage(): ReactElement {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomerType, setEditingCustomerType] = useState<CustomerTypeDto | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const queryClient = useQueryClient();
  const createCustomerType = useCreateCustomerType();
  const updateCustomerType = useUpdateCustomerType();

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);
  const defaultColumnKeys = useMemo(() => tableColumns.map((c) => c.key), [tableColumns]);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<Array<keyof CustomerTypeDto>>(
    () => defaultColumnKeys as Array<keyof CustomerTypeDto>
  );

  useEffect(() => {
    const prefs = loadColumnPreferences('customer-type-management', user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys as Array<keyof CustomerTypeDto>);
    setColumnOrder(prefs.order);
  }, [user?.id, defaultColumnKeys]);

  // --- VERİ ÇEKME (CLIENT SIDE FILTERING İÇİN TÜM DATA) ---
  const { data: apiResponse, isLoading } = useCustomerTypeList({
    pageNumber: 1,
    pageSize: 10000, // Tüm veriyi çekiyoruz
  });

  const customerTypes = useMemo<CustomerTypeDto[]>(
    () => apiResponse?.data ?? EMPTY_CUSTOMER_TYPES,
    [apiResponse?.data]
  );

  // Sayfa Başlığı
  useEffect(() => {
    setPageTitle(t('customerTypeManagement.menu'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  // --- FİLTRELEME MANTIĞI (Memory'de) ---
  const filteredCustomerTypes = useMemo(() => {
    if (!customerTypes) return [];

    let result: CustomerTypeDto[] = [...customerTypes];

    // 1. Arama Filtresi
    if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        result = result.filter(item => 
            item.name.toLowerCase().includes(lowerSearch) ||
            (item.description && item.description.toLowerCase().includes(lowerSearch))
        );
    }

    result = applyCustomerTypeFilters(result, appliedFilterRows);

    return result;
  }, [customerTypes, searchTerm, appliedFilterRows]);

  const handleAdvancedSearch = () => {
    setAppliedFilterRows(draftFilterRows);
    setSearchTerm('');
    setShowFilters(false);
  };

  const handleAdvancedClear = () => {
    setDraftFilterRows([]);
    setAppliedFilterRows([]);
  };

  const handleAddClick = (): void => {
    setEditingCustomerType(null);
    setFormOpen(true);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: [CUSTOMER_TYPE_MANAGEMENT_QUERY_KEYS.LIST] });
  };

  const hasFiltersActive = appliedFilterRows.some((r) => r.value.trim() !== '');

  const displayedColumnsForExport = useMemo(() => {
    const orderMap = new Map(columnOrder.map((k, i) => [k, i]));
    return tableColumns
      .filter((col) => visibleColumns.includes(col.key))
      .sort((a, b) => (orderMap.get(a.key) ?? 999) - (orderMap.get(b.key) ?? 999));
  }, [tableColumns, visibleColumns, columnOrder]);

  const handleEdit = (customerType: CustomerTypeDto): void => {
    setEditingCustomerType(customerType);
    setFormOpen(true);
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

  const handleExportExcel = async () => {
    const dataToExport = filteredCustomerTypes.map((item) => {
      const row: Record<string, string | number | boolean | null | undefined> = {};
      displayedColumnsForExport.forEach((col) => {
        const value = item[col.key];
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
    XLSX.utils.book_append_sheet(wb, ws, "CustomerTypes");
    XLSX.writeFile(wb, "customer_types.xlsx");
  };

  const handleExportPDF = async () => {
    const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new JsPDF();
    
    const tableColumn = displayedColumnsForExport.map((col) => col.label);
    const tableRows = filteredCustomerTypes.map((item) =>
      displayedColumnsForExport.map((col) => item[col.key] ?? '')
    );

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
    });

    doc.save("customer_types.pdf");
  };

  const handleExportPowerPoint = async () => {
    const { default: PptxGenJS } = await import('pptxgenjs');
    const pptx = new PptxGenJS();
    const slide = pptx.addSlide();
    
    slide.addText("Customer Type Report", { x: 0.5, y: 0.5, w: '90%', fontSize: 24, bold: true });

    const headers = displayedColumnsForExport.map((col) => col.label);
    const rows = filteredCustomerTypes.map((item) =>
      displayedColumnsForExport.map((col) => String(item[col.key] ?? ''))
    );

    const tableData = [
      headers.map(text => ({ text })),
      ...rows.map(row => row.map(text => ({ text }))),
    ];

    slide.addTable(tableData, { x: 0.5, y: 1.5, w: '90%' });

    pptx.writeFile({ fileName: "customer_types.pptx" });
  };

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      
      {/* HEADER */}
      <div className="flex-none flex flex-col md:flex-row md:items-center justify-between gap-5 pt-2">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('customerTypeManagement.menu')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors">
            {t('customerTypeManagement.description')}
          </p>
        </div>
        
        <Button 
          onClick={handleAddClick}
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-lg text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white"
        >
          <Plus size={18} className="mr-2" />
          {t('customerTypeManagement.addButton')}
        </Button>
      </div>

      <div className="flex-none">
        <CustomerTypeStats />
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-0 overflow-hidden transition-all duration-300">
          <div className="flex-none p-4 border-b border-white/5 flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <PageToolbar
                searchPlaceholder={t('common.search')}
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
                          {t('common.filters')}
                        </Button>
                      </PopoverTrigger>
                <PopoverContent side="bottom" align="end" className="w-[420px] p-0 bg-[#151025] border border-white/10 shadow-2xl rounded-2xl overflow-hidden">
                  <AdvancedFilter
                    columns={CUSTOMER_TYPE_FILTER_COLUMNS}
                    defaultColumn="name"
                    draftRows={draftFilterRows}
                    onDraftRowsChange={setDraftFilterRows}
                    onSearch={handleAdvancedSearch}
                    onClear={handleAdvancedClear}
                    translationNamespace="customerTypeManagement"
                    embedded
                  />
                </PopoverContent>
                    </Popover>
                    <ColumnPreferencesPopover
                      pageKey="customer-type-management"
                      userId={user?.id}
                      columns={tableColumns.map((c) => ({ key: c.key, label: c.label }))}
                      visibleColumns={visibleColumns.map(String)}
                      columnOrder={columnOrder}
                      onVisibleColumnsChange={(next) => setVisibleColumns(next as Array<keyof CustomerTypeDto>)}
                      onColumnOrderChange={setColumnOrder}
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
                        {t('common.actions')}
                      </div>
                    </div>
                    <div className="h-px bg-white/5 my-1"></div>
                    <div className="p-2">
                      <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {t('common.export')}
                      </div>
                      <button onClick={handleExportExcel} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-white/5 transition-colors text-left">
                        <FileSpreadsheet size={16} className="text-emerald-500" />
                        <span>{t('common.exportExcel')}</span>
                      </button>
                      <button onClick={handleExportPDF} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-white/5 transition-colors text-left">
                        <FileText size={16} className="text-red-400" />
                        <span>{t('common.exportPDF')}</span>
                      </button>
                      <button onClick={handleExportPowerPoint} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-white/5 transition-colors text-left">
                        <Presentation size={16} className="text-orange-400" />
                        <span>{t('common.exportPPT')}</span>
                      </button>
                    </div>
                  </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                }
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto px-4 pb-4">
            <CustomerTypeTable
              customerTypes={filteredCustomerTypes}
              isLoading={isLoading}
              onEdit={handleEdit}
              visibleColumns={visibleColumns}
              columnOrder={columnOrder}
              onColumnOrderChange={(next) => {
                setColumnOrder(next);
                saveColumnPreferences('customer-type-management', user?.id, {
                  order: next,
                  visibleKeys: visibleColumns.map(String),
                });
              }}
            />
          </div>
        </div>

      <CustomerTypeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        customerType={editingCustomerType}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}