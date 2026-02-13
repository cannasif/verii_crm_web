import { type ReactElement, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { OrderTable } from './OrderTable';
import { PageToolbar } from '@/components/shared';
import { Plus, Filter } from 'lucide-react';
import type { PagedFilter } from '@/types/api';
import { useQueryClient } from '@tanstack/react-query';
import { QUOTATION_QUERY_KEYS } from '../utils/query-keys';

export function OrderListPage(): ReactElement {
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
    setPageTitle(t('order.list.title'));
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

  const handleRowClick = (orderId: number): void => {
    navigate(`/orders/${orderId}`);
  };

  const queryClient = useQueryClient();
  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: [QUOTATION_QUERY_KEYS.QUOTATIONS] });
  };

  return (
    <div className="relative min-h-screen space-y-8 p-4 md:p-8 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/10 blur-[120px] pointer-events-none dark:block hidden" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 blur-[120px] pointer-events-none dark:block hidden" />

      <div className="relative z-10 space-y-8 max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-2">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              {t('order.list.title')}
            </h1>
            <div className="flex flex-col gap-1">
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
                {t('order.list.description')}
              </p>
            </div>
          </div>
          
          <Button 
            onClick={() => navigate('/orders/create')} 
            className="h-11 px-6 rounded-xl bg-gradient-to-r from-pink-600 to-orange-600 text-white font-bold shadow-lg shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all duration-300 border-0 hover:text-white group"
          >
            <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            {t('order.list.createNew')}
          </Button>
        </div>

        <div className="relative z-10 bg-white/80 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-xl shadow-zinc-200/50 dark:shadow-none overflow-hidden p-6">
          <div className="flex flex-col gap-4 mb-4">
            <PageToolbar
              searchPlaceholder={t('order.list.searchPlaceholder')}
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              onRefresh={handleRefresh}
              rightSlot={
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={approvalStatusFilter !== 'all' ? 'default' : 'outline'}
                      size="sm"
                      className={`h-10 border-dashed border-slate-300 dark:border-white/20 text-xs sm:text-sm ${
                        approvalStatusFilter !== 'all'
                          ? 'bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30 hover:bg-pink-500/30'
                          : 'bg-transparent hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <Filter className="mr-2 h-4 w-4" />
                      {t('approval.statusFilterLabel')}
                      {approvalStatusFilter !== 'all' && (
                        <span className="ml-2 h-2 w-2 rounded-full bg-pink-500" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[220px] p-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-xl z-50">
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        {t('approval.statusFilterLabel')}
                      </div>
                      <Select value={approvalStatusFilter} onValueChange={setApprovalStatusFilter}>
                        <SelectTrigger className="h-10 w-full rounded-xl">
                          <SelectValue />
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
                    </div>
                  </PopoverContent>
                </Popover>
              }
            />
          </div>
          <OrderTable
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