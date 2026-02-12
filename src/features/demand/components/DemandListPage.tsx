import { type ReactElement, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/ui-store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DemandTable } from './DemandTable';
import { Search, RefreshCw, Plus, X } from 'lucide-react';
import type { PagedFilter } from '@/types/api';

export function DemandListPage(): ReactElement {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const navigate = useNavigate();
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(20);
  const [sortBy, setSortBy] = useState('Id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<string>('all');
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  useEffect(() => {
    setPageTitle(t('demand.list.title'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  useEffect(() => {
    const newFilters: PagedFilter[] = [];
    if (searchTerm) {
      newFilters.push(
        { column: 'OfferNo', operator: 'contains', value: searchTerm },
        { column: 'PotentialCustomerName', operator: 'contains', value: searchTerm }
      );
    }
    if (approvalStatusFilter !== 'all') {
      newFilters.push({ column: 'Status', operator: 'equals', value: approvalStatusFilter });
    }
    setFilters(newFilters.length > 0 ? { filters: newFilters } : {});
    setPageNumber(1);
  }, [searchTerm, approvalStatusFilter]);

  const handleSortChange = (newSortBy: string, newSortDirection: 'asc' | 'desc'): void => {
    setSortBy(newSortBy);
    setSortDirection(newSortDirection);
    setPageNumber(1);
  };

  const handleRowClick = (demandId: number): void => {
    navigate(`/demands/${demandId}`);
  };

  const clearSearch = (): void => {
    setSearchTerm('');
  };

  return (
    <div className="relative min-h-screen space-y-8 p-4 md:p-8 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/10 blur-[120px] pointer-events-none dark:block hidden" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 blur-[120px] pointer-events-none dark:block hidden" />

      <div className="relative z-10 space-y-8 max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-2">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              {t('demand.list.title')}
            </h1>
            <div className="flex flex-col gap-1">
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
                {t('demand.list.description')}
              </p>
            </div>
          </div>
          
          <Button 
            onClick={() => navigate('/demands/create')} 
            className="h-11 px-6 rounded-xl bg-gradient-to-r from-pink-600 to-orange-600 text-white font-bold shadow-lg shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all duration-300 border-0 hover:text-white group"
          >
            <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            {t('demand.list.createNew')}
          </Button>
        </div>

        {/* SEARCH & FILTER AREA */}
        <div className="flex flex-col md:flex-row gap-4 items-center bg-white/40 dark:bg-zinc-900/40 p-1.5 rounded-2xl border border-white/20 dark:border-white/5 backdrop-blur-sm shadow-sm">
          <div className="relative flex-1 w-full group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-pink-600 dark:group-focus-within:text-pink-500 transition-colors pointer-events-none z-10">
              <Search className="h-5 w-5" />
            </div>
            <Input
              type="text"
              placeholder={t('demand.list.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="
                pl-12 pr-12 h-12 
                bg-white dark:bg-zinc-950/50 
                border-transparent dark:border-zinc-800 
                rounded-xl shadow-sm 
                focus-visible:border-pink-500 focus-visible:ring-4 focus-visible:ring-pink-500/20
                transition-all duration-300 ease-out
                text-base
              "
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-pink-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Select value={approvalStatusFilter} onValueChange={setApprovalStatusFilter}>
            <SelectTrigger className="h-12 w-[200px] rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50">
              <SelectValue placeholder={t('approval.statusFilterLabel')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="0">{t('approval.status.notRequired')}</SelectItem>
              <SelectItem value="1">{t('approval.status.waiting')}</SelectItem>
              <SelectItem value="2">{t('approval.status.approved')}</SelectItem>
              <SelectItem value="3">{t('approval.status.rejected')}</SelectItem>
              <SelectItem value="4">{t('approval.status.closed')}</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setPageNumber(1);
            }}
            className="h-12 px-6 rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 gap-2 font-medium w-full md:w-auto shadow-sm"
          >
            <RefreshCw size={18} className="opacity-70" />
            {t('demand.refresh')}
          </Button>
        </div>

        <div className="relative z-10 bg-white/80 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-xl shadow-zinc-200/50 dark:shadow-none overflow-hidden">
          <DemandTable
            pageNumber={pageNumber}
            pageSize={pageSize}
            sortBy={sortBy}
            sortDirection={sortDirection}
            filters={filters}
            onPageChange={setPageNumber}
            onSortChange={handleSortChange}
            onRowClick={handleRowClick}
          />
        </div>
      </div>
    </div>
  );
}