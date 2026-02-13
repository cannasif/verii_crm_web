import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { UserDiscountLimitTable, getColumnsConfig } from './UserDiscountLimitTable';
import { UserDiscountLimitForm } from './UserDiscountLimitForm';
import { useCreateUserDiscountLimit } from '../hooks/useCreateUserDiscountLimit';
import { useUpdateUserDiscountLimit } from '../hooks/useUpdateUserDiscountLimit';
import { useUserDiscountLimits } from '../hooks/useUserDiscountLimits';
import type { UserDiscountLimitDto } from '../types/user-discount-limit-types';
import type { UserDiscountLimitFormSchema } from '../types/user-discount-limit-types';
import {
  SlidersHorizontal,
  Search,
  Plus,
  FileText,
  ChevronDown,
  X,
  Check,
  CheckSquare,
  Menu,
  FileSpreadsheet,
  RefreshCw,
  Filter,
  Trash2,
  Presentation,
  User,
  Package,
  Percent
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
import { Input } from '@/components/ui/input';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../utils/query-keys';

export function UserDiscountLimitManagementPage(): ReactElement {
  const { t } = useTranslation(['user-discount-limit-management', 'common']);
  const { setPageTitle } = useUIStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingUserDiscountLimit, setEditingUserDiscountLimit] = useState<UserDiscountLimitDto | null>(null);
  
  // Client-side filtering state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [showColumns, setShowColumns] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [draftFilters, setDraftFilters] = useState({
    salespersonName: '',
    erpProductGroupCode: '',
    maxDiscount1: ''
  });
  const [activeFilters, setActiveFilters] = useState({
    salespersonName: '',
    erpProductGroupCode: '',
    maxDiscount1: ''
  });

  const queryClient = useQueryClient();

  // Fetch all data for client-side processing
  const { data: userDiscountLimitsData, isLoading } = useUserDiscountLimits({
    pageNumber: 1,
    pageSize: 10000,
    filters: [],
  });

  const allItems = userDiscountLimitsData?.data || [];

  const createUserDiscountLimit = useCreateUserDiscountLimit();
  const updateUserDiscountLimit = useUpdateUserDiscountLimit();

  const columnsConfig = useMemo(() => getColumnsConfig(t), [t]);
  const [visibleColumns, setVisibleColumns] = useState<Array<keyof UserDiscountLimitDto>>([]);

  // Initialize visible columns
  useEffect(() => {
    setVisibleColumns(columnsConfig.map((col) => col.key));
  }, [columnsConfig]);

  useEffect(() => {
    setPageTitle(t('title'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  const handleAddClick = (): void => {
    setEditingUserDiscountLimit(null);
    setFormOpen(true);
  };

  const handleEdit = (userDiscountLimit: UserDiscountLimitDto): void => {
    setEditingUserDiscountLimit(userDiscountLimit);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: UserDiscountLimitFormSchema): Promise<void> => {
    if (editingUserDiscountLimit) {
      await updateUserDiscountLimit.mutateAsync({
        id: editingUserDiscountLimit.id,
        data: {
          erpProductGroupCode: data.erpProductGroupCode,
          salespersonId: data.salespersonId,
          maxDiscount1: data.maxDiscount1,
          maxDiscount2: data.maxDiscount2 || undefined,
          maxDiscount3: data.maxDiscount3 || undefined,
        },
      });
    } else {
      await createUserDiscountLimit.mutateAsync({
        erpProductGroupCode: data.erpProductGroupCode,
        salespersonId: data.salespersonId,
        maxDiscount1: data.maxDiscount1,
        maxDiscount2: data.maxDiscount2 || undefined,
        maxDiscount3: data.maxDiscount3 || undefined,
      });
    }
    setFormOpen(false);
    setEditingUserDiscountLimit(null);
  };

  const filteredItems = useMemo(() => {
    let result = allItems;

    // Quick Search
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter((item) =>
        Object.values(item).some((val) =>
          String(val).toLowerCase().includes(lowerQuery)
        )
      );
    }

    // Advanced Filters
    if (activeFilters.salespersonName) {
      const lower = activeFilters.salespersonName.toLowerCase();
      result = result.filter(item => item.salespersonName?.toLowerCase().includes(lower));
    }
    if (activeFilters.erpProductGroupCode) {
      const lower = activeFilters.erpProductGroupCode.toLowerCase();
      result = result.filter(item => item.erpProductGroupCode?.toLowerCase().includes(lower));
    }
    if (activeFilters.maxDiscount1) {
        const val = parseFloat(activeFilters.maxDiscount1);
        if (!isNaN(val)) {
            // Check if discount matches (e.g. greater than or equal, or exact? let's do contains for string or exact for number)
            // User asked for "detailed filter" like CountryManagement. CountryManagement uses string includes.
            // But this is a number. Let's assume user might type "10" and wants to find 10.
            result = result.filter(item => item.maxDiscount1.toString().includes(activeFilters.maxDiscount1));
        }
    }

    return result;
  }, [allItems, searchQuery, activeFilters]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: queryKeys.list({ pageNumber: 1, pageSize: 10000 }) });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleFilterChange = (key: keyof typeof draftFilters, value: string) => {
    setDraftFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyAdvancedFilters = () => {
    setActiveFilters(draftFilters);
    setShowFilters(false);
  };

  const clearAdvancedFilters = () => {
    const empty = { salespersonName: '', erpProductGroupCode: '', maxDiscount1: '' };
    setDraftFilters(empty);
    setActiveFilters(empty);
  };

  const toggleColumn = (key: keyof UserDiscountLimitDto) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const exportToExcel = () => {
    const exportData = filteredItems.map((item) => {
      const row: Record<string, unknown> = {};
      columnsConfig
        .filter((col) => visibleColumns.includes(col.key))
        .forEach((col) => {
          row[col.label] = item[col.key];
        });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'UserDiscountLimits');
    XLSX.writeFile(wb, 'UserDiscountLimits.xlsx');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    const tableColumn = columnsConfig
      .filter((col) => visibleColumns.includes(col.key))
      .map((col) => col.label);

    const tableRows = filteredItems.map((item) => {
      return columnsConfig
        .filter((col) => visibleColumns.includes(col.key))
        .map((col) => {
          const val = item[col.key];
          return val === undefined || val === null ? '' : val;
        });
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });

    doc.save('UserDiscountLimits.pdf');
  };

  type PptxTableRow = Array<{ text: string }>;

  const handleExportPowerPoint = async () => {
    const { default: PptxGenJS } = await import('pptxgenjs');
    const pptx = new PptxGenJS();
    const slide = pptx.addSlide();
    
    // Add Title
    slide.addText("User Discount Limit Report", { x: 0.5, y: 0.5, w: '90%', fontSize: 24, bold: true });

    // Prepare Table Data
    const headers = columnsConfig
        .filter(col => visibleColumns.includes(col.key))
        .map(col => col.label);

    const rows = filteredItems.map(item => {
        return columnsConfig
            .filter(col => visibleColumns.includes(col.key))
            .map(col => String(item[col.key] || ''));
    });

    const tableData: PptxTableRow[] = [
      headers.map(text => ({ text })),
      ...rows.map(row => row.map(text => ({ text }))),
    ];

    slide.addTable(tableData, { x: 0.5, y: 1.5, w: '90%' });

    pptx.writeFile({ fileName: "UserDiscountLimits.pptx" });
  };

  return (
    <div className="w-full space-y-6 relative animate-in fade-in duration-500">
      {/* Header Section */}
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

      {/* Filter & Actions Card */}
      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-5 flex flex-col gap-5 transition-all duration-300">
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                <div className="relative group w-full sm:w-72 lg:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-pink-500 transition-colors" />
                    <Input 
                        placeholder={t('common.search', { ns: 'common' })}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-10 bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-500 rounded-xl transition-all w-full"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
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

            <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
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
                        <button 
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 ${showFilters ? 'bg-white/10 text-white border-white/20' : 'bg-transparent text-gray-400 border-white/10 hover:bg-white/5 hover:text-white'}`}
                        >
                            <Filter size={16} />
                            <span className="font-medium text-sm">{t('common.filters', { ns: 'common' })}</span>
                        </button>
                    </PopoverTrigger>
                    <PopoverContent side="bottom" align="end" className="w-96 p-0 bg-[#151025] border border-white/10 shadow-2xl rounded-2xl overflow-hidden">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between p-3 border-b border-white/5 bg-[#151025]">
                          <h3 className="text-sm font-semibold text-gray-200">{t('common.filters', { ns: 'common' })}</h3>
                          <button onClick={() => setShowFilters(false)} className="text-gray-500 hover:text-white transition-colors">
                            <X size={16} />
                          </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="p-3 overflow-y-auto custom-scrollbar max-h-[400px]">
                            <div className="grid grid-cols-2 gap-3">
                                
                                {/* Salesperson Name - Col Span 2 */}
                                <div className="col-span-2">
                                    <div className="relative group">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                            <User size={14} />
                                        </div>
                                        <Input 
                                            placeholder={t('salesperson')}
                                            value={draftFilters.salespersonName}
                                            onChange={(e) => handleFilterChange('salespersonName', e.target.value)}
                                            className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                        />
                                    </div>
                                </div>

                                {/* ERP Product Group Code */}
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                        <Package size={14} />
                                    </div>
                                    <Input 
                                        placeholder={t('erpProductGroupCode')}
                                        value={draftFilters.erpProductGroupCode}
                                        onChange={(e) => handleFilterChange('erpProductGroupCode', e.target.value)}
                                        className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                    />
                                </div>

                                {/* Max Discount 1 */}
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                        <Percent size={14} />
                                    </div>
                                    <Input 
                                        placeholder={t('maxDiscount1')}
                                        value={draftFilters.maxDiscount1}
                                        onChange={(e) => handleFilterChange('maxDiscount1', e.target.value)}
                                        className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-3 border-t border-white/5 bg-[#0b0818]/50 flex justify-between items-center gap-3">
                            <button 
                                onClick={clearAdvancedFilters}
                                className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-red-400 transition-colors px-2 py-2"
                            >
                                <Trash2 size={14} />
                                <span>{t('common.clear', { ns: 'common' })}</span>
                            </button>
                            
                            <button 
                                onClick={applyAdvancedFilters}
                                className="flex-1 bg-linear-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white text-xs font-bold py-2.5 rounded-lg shadow-lg shadow-pink-900/20 transition-all active:scale-95"
                            >
                                {t('common.filter', { ns: 'common' })}
                            </button>
                        </div>
                    </PopoverContent>
                </Popover>

                <Popover open={showColumns} onOpenChange={setShowColumns}>
                    <PopoverTrigger asChild>
                        <button 
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 ${showColumns ? 'bg-white/10 text-white border-white/20' : 'bg-transparent text-gray-400 border-white/10 hover:bg-white/5 hover:text-white'}`}
                        >
                            <SlidersHorizontal size={16} />
                            <span className="font-medium text-sm">{t('common.columns', { ns: 'common' })}</span>
                        </button>
                    </PopoverTrigger>
                    <PopoverContent side="bottom" align="end" className="w-72 p-0 bg-[#151025] border border-white/10 shadow-2xl rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between p-3 border-b border-white/5 bg-[#151025]">
                            <h3 className="text-sm font-semibold text-gray-200">{t('common.visibleColumns', { ns: 'common' })}</h3>
                            <button onClick={() => setShowColumns(false)} className="text-gray-500 hover:text-white transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-3 max-h-[300px] overflow-y-auto custom-scrollbar bg-[#151025]">
                            <div className="grid grid-cols-2 gap-2">
                                {columnsConfig.map((col) => (
                                    <label 
                                        key={col.key} 
                                        className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all border border-transparent ${visibleColumns.includes(col.key) ? 'bg-pink-500/10 border-pink-500/20' : 'hover:bg-white/5'}`}
                                        onClick={(e) => { e.stopPropagation(); toggleColumn(col.key); }}
                                    >
                                        <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors border ${visibleColumns.includes(col.key) ? 'bg-pink-500 border-pink-500' : 'bg-transparent border-gray-600'}`}>
                                            {visibleColumns.includes(col.key) && <Check size={10} className="text-white" />}
                                        </div>
                                        <span className={`text-xs font-medium ${visibleColumns.includes(col.key) ? 'text-white' : 'text-gray-400'} truncate`}>
                                            {col.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="p-3 border-t border-white/5 bg-[#0b0818]/50 flex justify-between items-center gap-3">
                            <button 
                                onClick={() => setVisibleColumns(columnsConfig.map(c => c.key))}
                                className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-white transition-colors px-1"
                            >
                                <CheckSquare size={14} />
                                <span>{t('common.selectAll', { ns: 'common' })}</span>
                            </button>
                            <button 
                                onClick={() => setShowColumns(false)}
                                className="bg-linear-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white text-xs font-bold py-2 px-6 rounded-lg shadow-lg shadow-pink-900/20 transition-all active:scale-95"
                            >
                                {t('common.ok', { ns: 'common' })}
                            </button>
                        </div>
                    </PopoverContent>
                </Popover>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-10 w-10 p-0 border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-pink-50 dark:hover:bg-white/10 hover:border-pink-500/30">
                            <Menu size={18} className="text-slate-500 dark:text-slate-400" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 bg-[#151025] border border-white/10 shadow-2xl shadow-black/50 overflow-visible p-0">
                        <div className="p-2">
                            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                {t('common.export', { ns: 'common' })}
                            </div>
                        </div>
                        <div className="h-px bg-white/5 my-1"></div>
                        <div className="p-2">
                            <DropdownMenuItem onClick={exportToExcel} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer transition-colors focus:bg-white/5">
                                <div className="p-1.5 rounded-md bg-green-500/10 text-green-500">
                                    <FileSpreadsheet size={16} />
                                </div>
                                <span>{t('common.exportExcel', { ns: 'common' })}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={exportToPDF} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer transition-colors focus:bg-white/5">
                                <div className="p-1.5 rounded-md bg-red-500/10 text-red-500">
                                    <FileText size={16} />
                                </div>
                                <span>{t('common.exportPDF', { ns: 'common' })}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportPowerPoint} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer transition-colors focus:bg-white/5">
                                <div className="p-1.5 rounded-md bg-orange-500/10 text-orange-500">
                                    <Presentation size={16} />
                                </div>
                                <span>{t('common.exportPPT', { ns: 'common' })}</span>
                            </DropdownMenuItem>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-0 sm:p-1 transition-all duration-300 overflow-hidden">
        <UserDiscountLimitTable
          items={filteredItems}
          isLoading={isLoading}
          onEdit={handleEdit}
          visibleColumns={visibleColumns}
          pageSize={pageSize}
        />
      </div>

      <UserDiscountLimitForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        userDiscountLimit={editingUserDiscountLimit}
        isLoading={createUserDiscountLimit.isPending || updateUserDiscountLimit.isPending}
      />
    </div>
  );
}
