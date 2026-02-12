import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useStockList } from '../hooks/useStockList';
import { ChevronUp, ChevronDown, ChevronsUpDown, PackageOpen, Eye, ArrowRight, ArrowLeft } from 'lucide-react';
import type { PagedFilter } from '@/types/api';
import { cn } from '@/lib/utils';
import type { StockGetDto } from '../types';

interface StockTableProps {
  pageNumber: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: PagedFilter[] | Record<string, unknown>;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: string, sortDirection: 'asc' | 'desc') => void;
  onRowClick: (stockId: number) => void;
}

export function StockTable({
  pageNumber,
  pageSize,
  sortBy = 'Id',
  sortDirection = 'desc',
  filters = {},
  onPageChange,
  onSortChange,
  onRowClick,
}: StockTableProps): ReactElement {
  const { t } = useTranslation();

  const { data, isLoading, isFetching } = useStockList({
    pageNumber,
    pageSize,
    sortBy,
    sortDirection,
    filters: filters as PagedFilter[] | undefined,
  });

  const handleSort = (column: string): void => {
    const newDirection = sortBy === column && sortDirection === 'asc' ? 'desc' : 'asc';
    onSortChange(column, newDirection);
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return <ChevronsUpDown className="ml-1.5 w-3.5 h-3.5 opacity-30 group-hover:opacity-100 transition-opacity" />;
    return sortDirection === 'asc' ? 
      <ChevronUp className="ml-1.5 w-3.5 h-3.5 text-pink-600 dark:text-pink-500 animate-in fade-in zoom-in" /> : 
      <ChevronDown className="ml-1.5 w-3.5 h-3.5 text-pink-600 dark:text-pink-500 animate-in fade-in zoom-in" />;
  };

  if (isLoading || isFetching) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-white/10 overflow-hidden bg-white/40 dark:bg-zinc-900/40 backdrop-blur-sm">
        <div className="p-4 space-y-4">
           <div className="flex justify-between px-4 pb-2 border-b border-zinc-100 dark:border-white/5">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
           </div>
           {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-4 px-4">
                 <Skeleton className="h-12 w-full rounded-lg" />
              </div>
           ))}
        </div>
      </div>
    );
  }

  const stocks = data?.data || [];

  if (!data || stocks.length === 0) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center py-20 text-muted-foreground",
        "border-2 border-dashed border-zinc-200 dark:border-white/10 rounded-2xl",
        "bg-zinc-50/50 dark:bg-white/5"
      )}>
        <div className="p-4 bg-white dark:bg-zinc-800 rounded-full shadow-sm mb-3">
            <PackageOpen size={48} className="text-zinc-300 dark:text-zinc-600" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{t('stock.list.noData')}</h3>
        <p className="text-sm max-w-xs text-center mt-1">Arama kriterlerinize uygun stok kaydı mevcut değil.</p>
      </div>
    );
  }

  const totalPages = Math.ceil((data.totalCount || 0) / pageSize);

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-white/10 overflow-hidden bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md shadow-sm transition-all duration-300">
      <Table>
        <TableHeader className="bg-zinc-50/80 dark:bg-white/5">
          <TableRow className="hover:bg-transparent border-b border-zinc-200 dark:border-white/10">
            {[
              { id: 'Id', label: t('stock.list.id'), className: "w-[80px]" },
              { id: 'ErpStockCode', label: t('stock.list.erpStockCode') },
              { id: 'StockName', label: t('stock.list.stockName') }
            ].map((col) => (
              <TableHead 
                key={col.id}
                className={cn(
                    "group cursor-pointer select-none py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors",
                    col.className
                )}
                onClick={() => handleSort(col.id)}
              >
                <div className="flex items-center">
                  {col.label} <SortIcon column={col.id} />
                </div>
              </TableHead>
            ))}
            
            <TableHead className="py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 text-center w-[100px]">
              {t('stock.list.unit')}
            </TableHead>
            <TableHead className="py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 text-right w-[80px]">
              {t('stock.list.actions')}
            </TableHead>
          </TableRow>
        </TableHeader>
        
        <TableBody>
          {stocks.map((stock: StockGetDto) => (
            <TableRow
              key={stock.id}
              className={cn(
                  "group cursor-pointer border-b border-zinc-100 dark:border-white/5 last:border-0",
                  "hover:bg-pink-50/60 dark:hover:bg-pink-900/10",
                  "transition-colors duration-200"
              )}
              onClick={() => onRowClick(stock.id)}
            >
              <TableCell className="font-mono text-xs text-zinc-400 group-hover:text-zinc-500">
                #{stock.id}
              </TableCell>
              
              <TableCell className="font-semibold text-sm text-zinc-700 dark:text-zinc-200 group-hover:text-pink-700 dark:group-hover:text-pink-400 transition-colors">
                {stock.erpStockCode || '-'}
              </TableCell>
              
              <TableCell className="text-sm text-zinc-600 dark:text-zinc-300 font-medium">
                {stock.stockName || '-'}
              </TableCell>
              
              <TableCell className="text-center">
                <Badge variant="secondary" className="bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 border-zinc-200 dark:border-white/10">
                  {stock.unit || '-'}
                </Badge>
              </TableCell>
              
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                      "h-8 w-8 rounded-lg text-zinc-400",
                      "hover:text-pink-600 hover:bg-pink-100/50 dark:hover:bg-pink-900/30",
                      "opacity-70 group-hover:opacity-100 transition-all"
                  )}
                  onClick={(e) => { e.stopPropagation(); onRowClick(stock.id); }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 bg-white/50 dark:bg-black/20 border-t border-zinc-200 dark:border-white/10 gap-4">
        <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            {t('stock.list.total')} <span className="font-bold text-zinc-900 dark:text-white mx-1">{data.totalCount || 0}</span> {t('stock.list.recordsListed')}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 rounded-lg text-xs border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white"
            onClick={() => onPageChange(pageNumber - 1)}
            disabled={pageNumber <= 1}
          >
            <ArrowLeft className="w-3 h-3 mr-1" />
            {t('stock.list.previous')}
          </Button>
          
          <div className="text-xs font-semibold bg-zinc-100 dark:bg-white/10 px-3 py-1.5 rounded-md min-w-[3rem] text-center text-zinc-700 dark:text-zinc-200">
            {pageNumber} / {totalPages}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 rounded-lg text-xs border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white"
            onClick={() => onPageChange(pageNumber + 1)}
            disabled={pageNumber >= totalPages}
          >
            {t('stock.list.next')}
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}