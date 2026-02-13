import { type ReactElement, useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { ErpCustomerTable, getColumnsConfig } from './ErpCustomerTable';
import { ErpCustomerDetailModal } from './ErpCustomerDetailModal';
import { ErpCustomerAdvancedFilter } from './ErpCustomerAdvancedFilter';
import { useErpCustomers } from '../hooks/useErpCustomers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Filter, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { applyFilterRows } from '../types/erp-customer-filter.types';
import type { ErpCustomerFilterRow } from '../types/erp-customer-filter.types';
import { PageToolbar } from '@/components/shared';
import { ColumnPreferencesPopover } from '@/components/shared';
import { loadColumnPreferences } from '@/lib/column-preferences';
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
import { useQueryClient } from '@tanstack/react-query';
import type { ErpCustomer } from '../types/erp-customer-types';

interface SortConfig {
  key: keyof ErpCustomer;
  direction: 'asc' | 'desc';
}

export function ErpCustomerManagementPage(): ReactElement {
  const { t } = useTranslation('erp-customer-management');
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();
  const { data: customers, isLoading } = useErpCustomers(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
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

  const allColumns = useMemo(() => getColumnsConfig(t), [t]);
  const defaultColumnKeys = useMemo(() => allColumns.map((c) => c.key), [allColumns]);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => defaultColumnKeys);

  useEffect(() => {
    const prefs = loadColumnPreferences('erp-customer-management', user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [user?.id, defaultColumnKeys]);

  const [draftFilterRows, setDraftFilterRows] = useState<ErpCustomerFilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<ErpCustomerFilterRow[]>([]);

  const queryClient = useQueryClient();

  useEffect(() => {
    setPageTitle(t('menu'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, appliedFilterRows, pageSize]);

  const filteredAndSortedData = useMemo(() => {
    if (!customers) return [];

    let result = [...customers];

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          (c.customerName && c.customerName.toLowerCase().includes(lowerSearch)) ||
          (c.customerCode && c.customerCode.toLowerCase().includes(lowerSearch))
      );
    }

    result = applyFilterRows(result, appliedFilterRows);

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
  }, [customers, searchTerm, appliedFilterRows, sortConfig]);

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


  const handleAdvancedSearch = () => {
    setAppliedFilterRows(draftFilterRows);
    setCurrentPage(1);
    setShowFilters(false);
  };

  const handleAdvancedClear = () => {
    setDraftFilterRows([]);
    setAppliedFilterRows([]);
    setCurrentPage(1);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['erpCustomers'] });
  };

  const hasFiltersActive = appliedFilterRows.some((r) => r.value.trim() !== '');

  return (
    <div className="w-full max-h-[calc(100vh-8rem)] flex flex-col gap-4">
      <div className="flex-none flex flex-col gap-1 pt-1 px-0 sm:px-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
          {t('menu')}
        </h1>
      </div>

      <div className="flex flex-col min-h-0 bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl overflow-hidden transition-all duration-300">
          
          <div className="flex-none p-4 border-b border-white/5 flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
              <PageToolbar
                searchPlaceholder={t('placeholders.quickSearch')}
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                onRefresh={handleRefresh}
                rightSlot={
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 bg-transparent text-gray-400 border-white/10 hover:bg-white/5 hover:text-white">
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
                          {t('actions.detailedFilter')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent side="bottom" align="end" className="w-[560px] max-w-[95vw] p-0 bg-[#151025] border border-white/10 shadow-2xl rounded-2xl overflow-hidden">
                          <div className="flex items-center justify-between p-3 border-b border-white/5 bg-[#151025]">
                            <h3 className="text-sm font-semibold text-gray-200">{t('actions.detailedFilter')}</h3>
                            <button onClick={() => setShowFilters(false)} className="text-gray-500 hover:text-white transition-colors">
                              <X size={16} />
                            </button>
                          </div>
                          <div className="p-3 overflow-y-auto custom-scrollbar max-h-[420px]">
                            <ErpCustomerAdvancedFilter
                              draftRows={draftFilterRows}
                              onDraftRowsChange={setDraftFilterRows}
                              onSearch={handleAdvancedSearch}
                              onClear={handleAdvancedClear}
                              embedded
                            />
                          </div>
                      </PopoverContent>
                  </Popover>

                    <ColumnPreferencesPopover
                      pageKey="erp-customer-management"
                      userId={user?.id}
                      columns={allColumns.map((c) => ({ key: c.key, label: c.label }))}
                      visibleColumns={visibleColumns}
                      columnOrder={columnOrder}
                      onVisibleColumnsChange={setVisibleColumns}
                      onColumnOrderChange={setColumnOrder}
                    />
                  </div>
                }
              />
            </div>
          </div>

          {/* Table Content */}
          <div className="flex-1 overflow-auto relative custom-scrollbar">
            <ErpCustomerTable
              customers={paginatedData}
              isLoading={isLoading}
              visibleColumns={visibleColumns}
              columnOrder={columnOrder}
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
