import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Plus, Filter, Menu, FileSpreadsheet, FileText, Presentation, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { CustomerStats } from './CustomerStats';
import { CustomerTable, getColumnsConfig } from './CustomerTable';
import { CustomerForm } from './CustomerForm';
import { useCreateCustomer } from '../hooks/useCreateCustomer';
import { useUpdateCustomer } from '../hooks/useUpdateCustomer';
import { useCustomerList } from '../hooks/useCustomerList';
import type { CustomerDto, CustomerFormData } from '../types/customer-types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { PageToolbar, ColumnPreferencesPopover, AdvancedFilter } from '@/components/shared';
import { loadColumnPreferences } from '@/lib/column-preferences';
import { CUSTOMER_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import { applyCustomerFilters, CUSTOMER_FILTER_COLUMNS } from '../types/customer-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';

const EMPTY_CUSTOMERS: CustomerDto[] = [];

export function CustomerManagementPage(): ReactElement {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerDto | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const queryClient = useQueryClient();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);
  const defaultColumnKeys = useMemo(() => tableColumns.map((c) => c.key), [tableColumns]);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<Array<keyof CustomerDto>>(
    () => defaultColumnKeys as Array<keyof CustomerDto>
  );

  useEffect(() => {
    const prefs = loadColumnPreferences('customer-management', user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys as Array<keyof CustomerDto>);
    setColumnOrder(prefs.order);
  }, [user?.id]);

  const { data: apiResponse, isLoading } = useCustomerList({
    pageNumber: 1,
    pageSize: 10000,
  });

  const customers = useMemo<CustomerDto[]>(
    () => apiResponse?.data ?? EMPTY_CUSTOMERS,
    [apiResponse?.data]
  );

  useEffect(() => {
    setPageTitle(t('customerManagement.menu'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];

    let result: CustomerDto[] = [...customers];

    if (debouncedSearch) {
      const lowerSearch = debouncedSearch.toLowerCase();
      result = result.filter(
        (item) =>
          (item.name && item.name.toLowerCase().includes(lowerSearch)) ||
          (item.customerCode && item.customerCode.toLowerCase().includes(lowerSearch)) ||
          (item.email && item.email.toLowerCase().includes(lowerSearch)) ||
          (item.phone && item.phone?.includes(lowerSearch)) ||
          (item.taxNumber && item.taxNumber?.includes(lowerSearch))
      );
    }

    result = applyCustomerFilters(result, appliedFilterRows);
    return result;
  }, [customers, debouncedSearch, appliedFilterRows]);

  const handleAdvancedSearch = () => {
    setAppliedFilterRows(draftFilterRows);
    setShowFilters(false);
  };

  const handleAdvancedClear = () => {
    setDraftFilterRows([]);
    setAppliedFilterRows([]);
  };

  const displayedColumnsForExport = useMemo(() => {
    const orderMap = new Map(columnOrder.map((k, i) => [k, i]));
    return tableColumns
      .filter((col) => visibleColumns.includes(col.key))
      .sort((a, b) => (orderMap.get(a.key) ?? 999) - (orderMap.get(b.key) ?? 999));
  }, [tableColumns, visibleColumns, columnOrder]);

  const handleExportExcel = async () => {
    const dataToExport = filteredCustomers.map((item) => {
      const row: Record<string, string | number | boolean | null | undefined> = {};
      displayedColumnsForExport.forEach((col) => {
            const value = item[col.key];
            row[col.label] = (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
              ? value
              : value ?? '';
        });
      return row;
    });

    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Müşteriler");
    XLSX.writeFile(wb, "musteriler.xlsx");
  };

  const handleExportPDF = async () => {
    const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new JsPDF();
    
    const tableColumn = displayedColumnsForExport.map((col) => col.label);
    const tableRows = filteredCustomers.map((item) =>
      displayedColumnsForExport.map((col) => item[col.key] ?? '')
    );

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
    });

    doc.save("musteriler.pdf");
  };

  type PptxTableRow = Array<{ text: string }>;

  const handleExportPowerPoint = async () => {
    const { default: PptxGenJS } = await import('pptxgenjs');
    const pptx = new PptxGenJS();
    const slide = pptx.addSlide();
    
    slide.addText("Müşteri Raporu", { x: 0.5, y: 0.5, w: '90%', fontSize: 24, bold: true });

    const headers = displayedColumnsForExport.map((col) => col.label);
    const rows = filteredCustomers.map((item) =>
      displayedColumnsForExport.map((col) => String(item[col.key] ?? ''))
    );

    const tableData: PptxTableRow[] = [
      headers.map(text => ({ text })),
      ...rows.map(row => row.map(text => ({ text }))),
    ];

    slide.addTable(tableData, { x: 0.5, y: 1.5, w: '90%' });

    pptx.writeFile({ fileName: "musteriler.pptx" });
  };

  const handleAddClick = (): void => {
    setEditingCustomer(null);
    setFormOpen(true);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: [CUSTOMER_MANAGEMENT_QUERY_KEYS.LIST] });
  };

  const hasFiltersActive = appliedFilterRows.some((r) => r.value.trim() !== '');

  const handleEdit = (customer: CustomerDto): void => {
    setEditingCustomer(customer);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: CustomerFormData): Promise<void> => {
    if (editingCustomer) {
      await updateCustomer.mutateAsync({
        id: editingCustomer.id,
        data: data,
      });
    } else {
      await createCustomer.mutateAsync(data);
    }
    setFormOpen(false);
    setEditingCustomer(null);
  };

  return (
    <div className="w-full space-y-6">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pt-2">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('customerManagement.menu')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors">
            {t('customerManagement.description')}
          </p>
        </div>
        
        <Button 
          onClick={handleAddClick}
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-lg text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white"
        >
          <Plus size={18} className="mr-2" />
          {t('customerManagement.addButton')}
        </Button>
      </div>

      <CustomerStats />

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-0 overflow-hidden transition-all duration-300">
        <div className="flex-none p-4 border-b border-white/5 flex flex-col gap-4">
          <PageToolbar
            searchPlaceholder={t('common.search')}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            onRefresh={handleRefresh}
            rightSlot={
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-pink-50 dark:hover:bg-white/10 hover:border-pink-500/30">
                      <Menu size={16} className="text-slate-500 dark:text-slate-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 bg-[#151025] border border-white/10 shadow-2xl shadow-black/50 overflow-visible p-0">
                    <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('common.export')}</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/5 my-1" />
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
                    <PopoverContent side="bottom" align="end" className="w-96 p-0 bg-[#151025] border border-white/10 shadow-2xl rounded-2xl overflow-hidden">
                        
                        <div className="flex items-center justify-between p-3 border-b border-white/5 bg-[#151025]">
                          <h3 className="text-sm font-semibold text-gray-200">{t('common.filters')}</h3>
                          <button onClick={() => setShowFilters(false)} className="text-gray-500 hover:text-white transition-colors">
                            <X size={16} />
                          </button>
                        </div>

                        <div className="p-3 overflow-y-auto custom-scrollbar max-h-[420px]">
                          <AdvancedFilter
                            columns={CUSTOMER_FILTER_COLUMNS}
                            defaultColumn="name"
                            draftRows={draftFilterRows}
                            onDraftRowsChange={setDraftFilterRows}
                            onSearch={handleAdvancedSearch}
                            onClear={handleAdvancedClear}
                            translationNamespace="customer-management"
                            embedded
                          />
                        </div>
                    </PopoverContent>
                </Popover>
                <ColumnPreferencesPopover
                  pageKey="customer-management"
                  userId={user?.id}
                  columns={tableColumns.map((c) => ({ key: c.key, label: c.label }))}
                  visibleColumns={visibleColumns.map(String)}
                  columnOrder={columnOrder}
                  onVisibleColumnsChange={(next) => setVisibleColumns(next as Array<keyof CustomerDto>)}
                  onColumnOrderChange={setColumnOrder}
                />
              </div>
            }
          />
        </div>

        <CustomerTable
          customers={filteredCustomers}
          isLoading={isLoading}
          onEdit={handleEdit}
          visibleColumns={visibleColumns}
          columnOrder={columnOrder}
        />
      </div>

      <CustomerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        customer={editingCustomer}
        isLoading={createCustomer.isPending || updateCustomer.isPending}
      />
    </div>
  );
}
