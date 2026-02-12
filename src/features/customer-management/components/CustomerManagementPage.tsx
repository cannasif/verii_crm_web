import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Plus, Search, RefreshCw, X, Filter, Menu, FileSpreadsheet, FileText, Presentation, EyeOff, ChevronDown, Hash, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DropdownMenuCheckboxItem, 
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
import { 
  Mail01Icon, 
  Call02Icon, 
  UserCircleIcon, 
} from 'hugeicons-react';

const EMPTY_CUSTOMERS: CustomerDto[] = [];

export function CustomerManagementPage(): ReactElement {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerDto | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const initialFilters = {
    name: '',
    customerCode: '',
    email: '',
    phone: '',
    taxNumber: '',
    cityName: ''
  };
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);

  const queryClient = useQueryClient();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);
  const [visibleColumns, setVisibleColumns] = useState<Array<keyof CustomerDto>>(
    tableColumns.map(col => col.key)
  );

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
        result = result.filter(item => 
            (item.name && item.name.toLowerCase().includes(lowerSearch)) ||
            (item.customerCode && item.customerCode.toLowerCase().includes(lowerSearch)) ||
            (item.email && item.email.toLowerCase().includes(lowerSearch)) ||
            (item.phone && item.phone.includes(lowerSearch)) ||
            (item.taxNumber && item.taxNumber.includes(lowerSearch))
        );
    }

    if (appliedFilters.name) {
      result = result.filter(c => c.name?.toLowerCase().includes(appliedFilters.name.toLowerCase()));
    }
    if (appliedFilters.customerCode) {
      result = result.filter(c => c.customerCode?.toLowerCase().includes(appliedFilters.customerCode.toLowerCase()));
    }
    if (appliedFilters.email) {
      result = result.filter(c => c.email?.toLowerCase().includes(appliedFilters.email.toLowerCase()));
    }
    if (appliedFilters.phone) {
      result = result.filter(c => c.phone?.includes(appliedFilters.phone));
    }
    if (appliedFilters.taxNumber) {
      result = result.filter(c => c.taxNumber?.includes(appliedFilters.taxNumber));
    }
    if (appliedFilters.cityName) {
      result = result.filter(c => c.cityName?.toLowerCase().includes(appliedFilters.cityName.toLowerCase()));
    }

    return result;
  }, [customers, debouncedSearch, appliedFilters]);

  const handleFilterChange = (key: keyof typeof initialFilters, value: string) => {
    setDraftFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyAdvancedFilters = () => {
    setAppliedFilters(draftFilters);
    setSearchTerm(''); 
  };

  const clearAdvancedFilters = () => {
    setDraftFilters(initialFilters);
    setAppliedFilters(initialFilters);
  };

  const toggleColumn = (key: keyof CustomerDto) => {
    setVisibleColumns(prev => 
      prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
    );
  };

  const handleExportExcel = async () => {
    const dataToExport = filteredCustomers.map(item => {
        const row: Record<string, string | number | boolean | null | undefined> = {};
        tableColumns.filter(col => visibleColumns.includes(col.key)).forEach(col => {
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
    
    const tableColumn = tableColumns
        .filter(col => visibleColumns.includes(col.key))
        .map(col => col.label);

    const tableRows = filteredCustomers.map(item => {
        return tableColumns
            .filter(col => visibleColumns.includes(col.key))
            .map(col => item[col.key] || '');
    });

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

    const headers = tableColumns
        .filter(col => visibleColumns.includes(col.key))
        .map(col => col.label);

    const rows = filteredCustomers.map(item => {
        return tableColumns
            .filter(col => visibleColumns.includes(col.key))
            .map(col => String(item[col.key] || ''));
    });

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

  const clearSearch = () => {
    setSearchTerm('');
    setDebouncedSearch('');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['customers'] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

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
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                <div className="relative group w-full sm:w-72 lg:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-pink-500 transition-colors" />
                  <Input
                    placeholder={t('common.search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-500 rounded-xl transition-all w-full"
                  />
                  {searchTerm && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"
                    >
                      <X size={14} className="text-slate-400" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div 
                    className="h-10 w-10 flex items-center justify-center bg-white/50 dark:bg-card/50 border border-slate-200 dark:border-white/10 rounded-xl cursor-pointer hover:border-pink-500/30 hover:bg-pink-50/50 dark:hover:bg-pink-500/10 transition-all group shrink-0"
                    onClick={handleRefresh}
                  >
                    <RefreshCw 
                      size={18} 
                      className={`text-slate-500 dark:text-slate-400 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors ${isRefreshing ? 'animate-spin' : ''}`} 
                    />
                  </div>
                </div>
            </div>

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
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
            <div className="flex justify-end px-4 py-2 gap-2 bg-white/50 dark:bg-[#1a1025]/50 border-b border-white/5">
                <DropdownMenu onOpenChange={setShowColumns}>
                    <DropdownMenuTrigger asChild>
                        <button 
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 ${showColumns ? 'bg-white/10 text-white border-white/20' : 'bg-transparent text-gray-400 border-white/10 hover:bg-white/5 hover:text-white'}`}
                        >
                            <EyeOff size={16} />
                            <span className="font-medium text-sm">{t('common.editColumns')}</span>
                            <ChevronDown size={14} />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                        align="end" 
                        className="w-56 max-h-[400px] overflow-y-auto bg-[#151025] border border-white/10 shadow-xl rounded-xl p-2 z-50"
                    >
                        <DropdownMenuLabel className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 py-1.5">
                            {t('common.visibleColumns')}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/10 my-1" />
                        
                        {tableColumns.map((col) => (
                            <DropdownMenuCheckboxItem
                                key={col.key}
                                checked={visibleColumns.includes(col.key)}
                                onSelect={(e) => e.preventDefault()} 
                                onCheckedChange={() => toggleColumn(col.key)}
                                className="text-sm text-gray-200 focus:bg-pink-500/10 focus:text-pink-400 cursor-pointer rounded-lg px-2 py-1.5 pl-8 relative"
                            >
                                {col.label}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <Popover open={showFilters} onOpenChange={setShowFilters}>
                    <PopoverTrigger asChild>
                        <button 
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 ${showFilters ? 'bg-white/10 text-white border-white/20' : 'bg-transparent text-gray-400 border-white/10 hover:bg-white/5 hover:text-white'}`}
                        >
                            <Filter size={16} />
                            <span className="font-medium text-sm">{t('common.filters')}</span>
                        </button>
                    </PopoverTrigger>
                    <PopoverContent side="bottom" align="end" className="w-96 p-0 bg-[#151025] border border-white/10 shadow-2xl rounded-2xl overflow-hidden">
                        
                        <div className="flex items-center justify-between p-3 border-b border-white/5 bg-[#151025]">
                          <h3 className="text-sm font-semibold text-gray-200">{t('common.filters')}</h3>
                          <button onClick={() => setShowFilters(false)} className="text-gray-500 hover:text-white transition-colors">
                            <X size={16} />
                          </button>
                        </div>

                        <div className="p-3 overflow-y-auto custom-scrollbar max-h-[400px]">
                            <div className="grid grid-cols-2 gap-3">
                                
                                <div className="col-span-2">
                                    <div className="relative group">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                            <UserCircleIcon size={14} />
                                        </div>
                                        <Input 
                                            placeholder={t('customerManagement.filter.name')}
                                            value={draftFilters.name}
                                            onChange={(e) => handleFilterChange('name', e.target.value)}
                                            className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                        />
                                    </div>
                                </div>

                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                        <Mail01Icon size={14} />
                                    </div>
                                    <Input 
                                        placeholder={t('customerManagement.filter.email')}
                                        value={draftFilters.email}
                                        onChange={(e) => handleFilterChange('email', e.target.value)}
                                        className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                    />
                                </div>

                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                        <Call02Icon size={14} />
                                    </div>
                                    <Input 
                                        placeholder={t('customerManagement.filter.phone')}
                                        value={draftFilters.phone}
                                        onChange={(e) => handleFilterChange('phone', e.target.value)}
                                        className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                    />
                                </div>

                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                        <Hash size={14} />
                                    </div>
                                    <Input 
                                        placeholder={t('customerManagement.filter.customerCode')}
                                        value={draftFilters.customerCode}
                                        onChange={(e) => handleFilterChange('customerCode', e.target.value)}
                                        className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                    />
                                </div>

                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                        <FileText size={14} />
                                    </div>
                                    <Input 
                                        placeholder={t('customerManagement.filter.taxNumber')}
                                        value={draftFilters.taxNumber}
                                        onChange={(e) => handleFilterChange('taxNumber', e.target.value)}
                                        className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <div className="relative group">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                            <MapPin size={14} />
                                        </div>
                                        <Input 
                                            placeholder={t('customerManagement.filter.city')}
                                            value={draftFilters.cityName}
                                            onChange={(e) => handleFilterChange('cityName', e.target.value)}
                                            className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 border-t border-white/5 bg-[#151025]">
                            <button 
                                onClick={clearAdvancedFilters}
                                className="text-xs text-gray-500 hover:text-white transition-colors"
                            >
                                {t('common.clearFilters')}
                            </button>
                            <Button 
                                onClick={() => {
                                    applyAdvancedFilters();
                                    setShowFilters(false);
                                }}
                                size="sm"
                                className="bg-pink-600 hover:bg-pink-700 text-white border-0 h-8 text-xs"
                            >
                                {t('common.apply')}
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

        <CustomerTable
          customers={filteredCustomers}
          isLoading={isLoading}
          onEdit={handleEdit}
          visibleColumns={visibleColumns}
        />
      </div>
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
