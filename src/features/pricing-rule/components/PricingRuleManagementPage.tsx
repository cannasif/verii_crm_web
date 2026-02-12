import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  RefreshCw, 
  X
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { pricingRuleQueryKeys } from '../utils/query-keys';
import { PricingRuleTable } from './PricingRuleTable';
import { PricingRuleForm } from './PricingRuleForm';
import type { PricingRuleHeaderGetDto } from '../types/pricing-rule-types';
import { usePricingRuleHeaders } from '../hooks/usePricingRuleHeaders';

const EMPTY_HEADERS: PricingRuleHeaderGetDto[] = [];

export function PricingRuleManagementPage(): ReactElement {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingHeader, setEditingHeader] = useState<PricingRuleHeaderGetDto | null>(null);
  
  // Client-side filtering state
  const [activeFilter, setActiveFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const queryClient = useQueryClient();

  // Fetch all headers for client-side filtering
  const { data: apiResponse, isLoading } = usePricingRuleHeaders({
    pageNumber: 1,
    pageSize: 10000
  });

  const headers = useMemo<PricingRuleHeaderGetDto[]>(
    () => apiResponse?.data ?? EMPTY_HEADERS,
    [apiResponse?.data]
  );

  useEffect(() => {
    setPageTitle(t('pricingRule.list.title'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  const filteredHeaders = useMemo<PricingRuleHeaderGetDto[]>(() => {
    if (!headers) return [];

    let result: PricingRuleHeaderGetDto[] = [...headers];

    // Quick Search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((h) => 
        (h.ruleName && h.ruleName.toLowerCase().includes(lowerSearch)) ||
        (h.ruleCode && h.ruleCode.toLowerCase().includes(lowerSearch)) ||
        (h.customerName && h.customerName.toLowerCase().includes(lowerSearch))
      );
    }

    // Status Filter
    if (activeFilter === 'active') {
        const now = new Date();
        result = result.filter(h => {
            const from = new Date(h.validFrom);
            const to = new Date(h.validTo);
            return h.isActive && from <= now && to >= now;
        });
    } else if (activeFilter === 'inactive') {
        const now = new Date();
        result = result.filter(h => {
            const from = new Date(h.validFrom);
            const to = new Date(h.validTo);
            return !h.isActive || from > now || to < now;
        });
    }

    return result;
  }, [headers, searchTerm, activeFilter]);

  const handleAddClick = (): void => {
    setEditingHeader(null);
    setFormOpen(true);
  };

  const handleEdit = (header: PricingRuleHeaderGetDto): void => {
    setEditingHeader(header);
    setFormOpen(true);
  };

  const handleFormClose = (): void => {
    setFormOpen(false);
    setEditingHeader(null);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: pricingRuleQueryKeys.headerList({ pageNumber: 1, pageSize: 10000 }) });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="w-full space-y-6 relative">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('pricingRule.list.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('pricingRule.list.description')}
          </p>
        </div>
        
        <Button 
          onClick={handleAddClick}
          className="px-6 py-2 bg-gradient-to-r from-pink-600 to-orange-600 rounded-lg text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white"
        >
          <Plus size={18} className="mr-2" />
          {t('pricingRule.list.add')}
        </Button>
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-5 flex flex-col gap-5 transition-all duration-300">
        
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
                            onClick={() => setSearchTerm('')}
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

            <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-white/5 p-1 rounded-xl w-full lg:w-auto overflow-x-auto">
                {['all', 'active', 'inactive'].map((filter) => (
                    <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`
                            flex-1 lg:flex-none px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap
                            ${activeFilter === filter 
                                ? 'bg-white dark:bg-[#1a1025] text-pink-600 dark:text-pink-400 shadow-sm border border-slate-200 dark:border-white/10' 
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}
                        `}
                    >
                        {filter === 'all' ? t('common.all') : filter === 'active' ? t('status.active') : t('status.inactive')}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-0 sm:p-1 transition-all duration-300 overflow-hidden">
        <PricingRuleTable 
          headers={filteredHeaders}
          isLoading={isLoading}
          onEdit={handleEdit}
        />
      </div>

      <PricingRuleForm
        open={formOpen}
        onOpenChange={handleFormClose}
        header={editingHeader}
      />
    </div>
  );
}
