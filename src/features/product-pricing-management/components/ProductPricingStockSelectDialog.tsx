import { type ReactElement, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStockList } from '@/features/stock/hooks/useStockList';
import type { StockGetDto } from '@/features/stock/types';

export interface ProductPricingStockSelectionResult {
  code: string;
  name: string;
  groupCode?: string;
}

interface ProductPricingStockSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (result: ProductPricingStockSelectionResult) => void;
  excludeProductCodes?: string[];
}

export function ProductPricingStockSelectDialog({
  open,
  onOpenChange,
  onSelect,
  excludeProductCodes,
}: ProductPricingStockSelectDialogProps): ReactElement {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: stocksData, isLoading } = useStockList({
    pageNumber: 1,
    pageSize: 2000,
    sortBy: 'Id',
    sortDirection: 'desc',
  });

  const excludedSet = useMemo(
    () => (excludeProductCodes?.length ? new Set(excludeProductCodes) : undefined),
    [excludeProductCodes]
  );

  const availableStocks = useMemo((): StockGetDto[] => {
    const list = stocksData?.data ?? [];
    if (!excludedSet) return list;
    return list.filter((stock) => !excludedSet.has(stock.erpStockCode ?? ''));
  }, [stocksData?.data, excludedSet]);

  const filteredStocks = useMemo((): StockGetDto[] => {
    if (!searchQuery.trim()) return availableStocks;
    const q = searchQuery.toLowerCase().trim();
    return availableStocks.filter(
      (s) =>
        s.stockName?.toLowerCase().includes(q) ||
        s.erpStockCode?.toLowerCase().includes(q) ||
        s.grupKodu?.toLowerCase().includes(q) ||
        s.grupAdi?.toLowerCase().includes(q)
    );
  }, [availableStocks, searchQuery]);

  const handleSelect = (stock: StockGetDto): void => {
    onSelect({
      code: stock.erpStockCode,
      name: stock.stockName ?? '',
      groupCode: stock.grupKodu,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden bg-white/95 dark:bg-[#0c0516]/95 backdrop-blur-xl border-slate-200 dark:border-white/10 shadow-2xl">
        <DialogHeader className="px-6 py-5 border-b border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex-shrink-0">
          <DialogTitle className="flex items-center gap-3 text-slate-900 dark:text-white text-lg">
            <div className="bg-gradient-to-br from-pink-500 to-orange-600 p-2.5 rounded-xl shadow-lg shadow-pink-500/20 text-white">
              <Package size={20} />
            </div>
            {t('productPricingManagement.selectStok')}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <Input
                placeholder={t('productPricingManagement.searchStockPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 rounded-xl bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 focus-visible:ring-pink-500/20 focus-visible:border-pink-500 transition-all"
              />
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30 dark:bg-black/20">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-500">
              <div className="animate-spin mr-2 h-4 w-4 border-2 border-pink-500 border-t-transparent rounded-full" />
              {t('productSelectDialog.loading')}
            </div>
          ) : filteredStocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500 dark:text-slate-400">
              <Package size={48} className="opacity-20 mb-4" />
              <p>
                {searchQuery.trim()
                  ? t('productSelectDialog.noResults')
                  : t('productPricingManagement.noStocksAvailable')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredStocks.map((stock) => (
                <div
                  key={stock.id}
                  onClick={() => handleSelect(stock)}
                  className={cn(
                    'relative flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border',
                    'bg-white dark:bg-[#1a1025]/40 border-slate-200 dark:border-white/5',
                    'hover:border-pink-300 dark:hover:border-pink-500/30 hover:shadow-md hover:shadow-pink-500/5'
                  )}
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0 bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-300">
                    <Package size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                      {stock.stockName ?? t('productPricingManagement.unnamedStock')}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                        {stock.erpStockCode}
                      </span>
                      {stock.grupKodu && (
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {stock.grupKodu}
                          {stock.grupAdi ? ` - ${stock.grupAdi}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
