import { type ReactElement, useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { ErpCustomerTable, getColumnsConfig } from './ErpCustomerTable';
import { ErpCustomerDetailModal } from './ErpCustomerDetailModal';
import { useErpCustomers } from '../hooks/useErpCustomers';
import { Input } from '@/components/ui/input';
import { Search, RefreshCw, X, Filter, Trash2, ChevronDown, Check, SlidersHorizontal, CheckSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Building03Icon, 
  Tag01Icon, 
  UserCircleIcon, 
  MapsLocation01Icon, 
  Location01Icon, 
  Invoice01Icon 
} from 'hugeicons-react';
import { useQueryClient } from '@tanstack/react-query';
import type { ErpCustomer } from '../types/erp-customer-types';

interface FilterState {
  customerCode: string;
  customerName: string;
  branchCode: string;
  city: string;
  district: string;
  taxNumber: string;
}

interface SortConfig {
  key: keyof ErpCustomer;
  direction: 'asc' | 'desc';
}

export function ErpCustomerManagementPage(): ReactElement {
  const { t } = useTranslation('erp-customer-management');
  const { setPageTitle } = useUIStore();
  const { data: customers, isLoading } = useErpCustomers(null);
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  
  // Detail Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<ErpCustomer | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Pagination State
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>('1');

  // Sync pageInput with currentPage
  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers
    if (value === '' || /^\d+$/.test(value)) {
      setPageInput(value);
    }
  };

  const handlePageInputSubmit = () => {
    const page = parseInt(pageInput);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    } else {
      setPageInput(currentPage.toString()); // Reset if invalid
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePageInputSubmit();
    }
  };

  // Sorting State
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const allColumns = getColumnsConfig(t);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(allColumns.map(col => col.key));

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => 
      prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
    );
  };

  const initialFilters: FilterState = {
    customerCode: '',
    customerName: '',
    branchCode: '',
    city: '',
    district: '',
    taxNumber: ''
  };

  const [draftFilters, setDraftFilters] = useState<FilterState>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(initialFilters);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    setPageTitle(t('menu'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, appliedFilters, pageSize]);

  const filteredAndSortedData = useMemo(() => {
    if (!customers) return [];

    let result = [...customers];

    // 1. Search Term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((c) => 
        (c.customerName && c.customerName.toLowerCase().includes(lowerSearch)) ||
        (c.customerCode && c.customerCode.toLowerCase().includes(lowerSearch))
      );
    }

    // 2. Advanced Filters
    if (appliedFilters.customerCode) {
      result = result.filter((c) => c.customerCode?.toLowerCase().startsWith(appliedFilters.customerCode.toLowerCase()));
    }
    if (appliedFilters.customerName) {
      result = result.filter((c) => c.customerName?.toLowerCase().includes(appliedFilters.customerName.toLowerCase()));
    }
    if (appliedFilters.branchCode) {
      result = result.filter((c) => c.branchCode?.toString().includes(appliedFilters.branchCode));
    }
    if (appliedFilters.city) {
      result = result.filter((c) => c.city?.toLowerCase().includes(appliedFilters.city.toLowerCase()));
    }
    if (appliedFilters.district) {
      result = result.filter((c) => c.district?.toLowerCase().includes(appliedFilters.district.toLowerCase()));
    }
    if (appliedFilters.taxNumber) {
      result = result.filter((c) => c.taxNumber?.includes(appliedFilters.taxNumber));
    }

    // 3. Sorting
    if (sortConfig) {
      result.sort((a, b) => {
        // @ts-ignore - dynamic key access
        const aValue = a[sortConfig.key];
        // @ts-ignore
        const bValue = b[sortConfig.key];

        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [customers, searchTerm, appliedFilters, sortConfig]);

  // Pagination Logic
  const totalItems = filteredAndSortedData.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedData.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedData, currentPage, pageSize]);

  const handleSort = (key: keyof ErpCustomer) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' 
          ? { key, direction: 'desc' } 
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const handleRowClick = (customer: ErpCustomer) => {
    setSelectedCustomer(customer);
    setIsDetailModalOpen(true);
  };

  const clearSearch = () => setSearchTerm('');

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setDraftFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyAdvancedFilters = () => setAppliedFilters(draftFilters);

  const clearAdvancedFilters = () => {
    setDraftFilters(initialFilters);
    setAppliedFilters(initialFilters);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['erpCustomers'] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="w-full max-h-[calc(100vh-8rem)] flex flex-col gap-4">
      <div className="flex-none flex flex-col gap-1 pt-1 px-0 sm:px-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
          {t('menu')}
        </h1>
      </div>

      <div className="flex flex-col min-h-0 bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl overflow-hidden transition-all duration-300">
          
          {/* Header Actions */}
          <div className="flex-none p-4 border-b border-white/5 flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
              
              {/* Left Side: Search + Refresh */}
              <div className="flex items-center gap-2 w-full lg:w-auto">
                  <div className="relative group w-full lg:w-96">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-pink-500 transition-colors" />
                      <Input
                          placeholder={t('placeholders.quickSearch')}
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
              
              {/* Right Side: Filter + Columns + PageSize */}
              <div className="flex items-center gap-2 justify-end flex-1 w-full lg:w-auto">
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
                          {[10, 20, 50, 100].map((size) => (
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
                              <span className="font-medium text-sm">{t('actions.detailedFilter')}</span>
                          </button>
                      </PopoverTrigger>
                      <PopoverContent side="bottom" align="end" className="w-96 p-0 bg-[#151025] border border-white/10 shadow-2xl rounded-2xl overflow-hidden">
                          <div className="flex items-center justify-between p-3 border-b border-white/5 bg-[#151025]">
                            <h3 className="text-sm font-semibold text-gray-200">{t('actions.detailedFilter')}</h3>
                            <button onClick={() => setShowFilters(false)} className="text-gray-500 hover:text-white transition-colors">
                              <X size={16} />
                            </button>
                          </div>

                          <div className="p-3 overflow-y-auto custom-scrollbar max-h-[400px]">
                              <div className="grid grid-cols-2 gap-3">
                                  <div className="col-span-2">
                                      <div className="relative group">
                                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                              <Building03Icon size={14} />
                                          </div>
                                          <Input 
                                              placeholder={t('filterLabels.branchCode')} 
                                              value={draftFilters.branchCode}
                                              onChange={(e) => handleFilterChange('branchCode', e.target.value)}
                                              className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                          />
                                      </div>
                                  </div>

                                  <div className="relative group">
                                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                          <Tag01Icon size={14} />
                                      </div>
                                      <Input 
                                          placeholder={t('filterLabels.customerCode')} 
                                          value={draftFilters.customerCode}
                                          onChange={(e) => handleFilterChange('customerCode', e.target.value)}
                                          className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                      />
                                  </div>

                                  <div className="relative group">
                                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                          <UserCircleIcon size={14} />
                                      </div>
                                      <Input 
                                          placeholder={t('filterLabels.customerName')} 
                                          value={draftFilters.customerName}
                                          onChange={(e) => handleFilterChange('customerName', e.target.value)}
                                          className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                      />
                                  </div>

                                  <div className="relative group">
                                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                          <MapsLocation01Icon size={14} />
                                      </div>
                                      <Input 
                                          placeholder={t('filterLabels.city')} 
                                          value={draftFilters.city}
                                          onChange={(e) => handleFilterChange('city', e.target.value)}
                                          className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                      />
                                  </div>

                                  <div className="relative group">
                                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                          <Location01Icon size={14} />
                                      </div>
                                      <Input 
                                          placeholder={t('filterLabels.district')} 
                                          value={draftFilters.district}
                                          onChange={(e) => handleFilterChange('district', e.target.value)}
                                          className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                      />
                                  </div>

                                  <div className="col-span-2">
                                      <div className="relative group">
                                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">
                                              <Invoice01Icon size={14} />
                                          </div>
                                          <Input 
                                              placeholder={t('filterLabels.taxNumber')} 
                                              value={draftFilters.taxNumber}
                                              onChange={(e) => handleFilterChange('taxNumber', e.target.value)}
                                              className="w-full bg-[#0b0818] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all h-9"
                                          />
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div className="p-3 border-t border-white/5 bg-[#0b0818]/50 flex justify-between items-center gap-3">
                              <button 
                                  onClick={clearAdvancedFilters}
                                  className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-red-400 transition-colors px-2 py-2"
                              >
                                  <Trash2 size={14} />
                                  <span>{t('actions.clear')}</span>
                              </button>
                              
                              <button 
                                  onClick={() => {
                                      applyAdvancedFilters();
                                      setShowFilters(false);
                                  }}
                                  className="flex-1 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white text-xs font-bold py-2.5 rounded-lg shadow-lg shadow-pink-900/20 transition-all active:scale-95"
                              >
                                  {t('actions.apply')}
                              </button>
                          </div>
                      </PopoverContent>
                  </Popover>

                  <Popover open={showColumns} onOpenChange={setShowColumns}>
                      <PopoverTrigger asChild>
                          <button 
                              onClick={() => setShowColumns(!showColumns)} 
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 ${showColumns ? 'bg-white/10 text-white border-white/20' : 'bg-transparent text-gray-400 border-white/10 hover:bg-white/5 hover:text-white'}`}
                          >
                              <SlidersHorizontal size={16} />
                              <span className="font-medium text-sm">{t('table.editColumns')}</span>
                          </button>
                      </PopoverTrigger>
                      <PopoverContent side="bottom" align="end" className="w-80 p-0 bg-[#151025] border border-white/10 shadow-2xl shadow-black/50 rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                          <div className="flex items-center justify-between p-3 border-b border-white/5 bg-[#151025]">
                              <h3 className="text-sm font-semibold text-gray-200">{t('table.visibleColumns')}</h3>
                              <button onClick={() => setShowColumns(false)} className="text-gray-500 hover:text-white transition-colors">
                                  <X size={16} />
                              </button>
                          </div>

                          <div className="p-3 max-h-[300px] overflow-y-auto custom-scrollbar bg-[#151025]">
                              <div className="grid grid-cols-2 gap-2">
                                  {allColumns.map((col) => (
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
                                  onClick={() => setVisibleColumns(allColumns.map(c => c.key))}
                                  className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-white transition-colors px-1"
                              >
                                  <CheckSquare size={14} />
                                  <span>{t('common.selectAll')}</span>
                              </button>
                              
                              <button 
                                  onClick={() => setShowColumns(false)}
                                  className="bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white text-xs font-bold py-2 px-6 rounded-lg shadow-lg shadow-pink-900/20 transition-all active:scale-95"
                              >
                                  {t('common.ok')}
                              </button>
                          </div>
                      </PopoverContent>
                  </Popover>
              </div>
            </div>
          </div>

          {/* Table Content */}
          <div className="flex-1 overflow-auto relative custom-scrollbar">
            <ErpCustomerTable 
              customers={paginatedData} 
              isLoading={isLoading} 
              visibleColumns={visibleColumns} 
              sortConfig={sortConfig}
              onSort={handleSort}
              onRowClick={handleRowClick}
            />
          </div>

          {/* Footer - Pagination */}
          <div className="flex-none h-14 border-t border-white/5 bg-[#1a1025]/90 backdrop-blur flex items-center justify-between px-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t('common.totalRecords')}: <span className="text-slate-900 dark:text-white font-medium">{totalItems}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed text-slate-400 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="flex items-center gap-1">
                <Input
                  value={pageInput}
                  onChange={handlePageInputChange}
                  onBlur={handlePageInputSubmit}
                  onKeyDown={handlePageInputKeyDown}
                  className="w-12 h-8 text-center px-1 py-1 text-xs font-medium bg-white/5 border-white/10 focus:border-pink-500 transition-all text-slate-600 dark:text-slate-200"
                />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  / {Math.max(1, totalPages)}
                </span>
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed text-slate-400 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
      </div>

      <ErpCustomerDetailModal 
        customer={selectedCustomer}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
      />
    </div>
  );
}
