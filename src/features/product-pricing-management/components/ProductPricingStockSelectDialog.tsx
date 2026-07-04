import { type ReactElement, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Package, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { matchesSearchTerm } from '@/lib/search';
import { useStockList } from '@/features/stock/hooks/useStockList';
import type { StockGetDto } from '@/features/stock/types';
import { getLocalizedStockName, getLocalizedStockSearchTerms } from '@/features/stock/utils/localized-stock-name';

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
  const { t, i18n } = useTranslation();
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
    return availableStocks.filter((s) => {
      const searchTerms = getLocalizedStockSearchTerms(s, i18n.language);
      return matchesSearchTerm(searchQuery, [
        ...searchTerms,
        s.erpStockCode,
        s.grupKodu,
        s.grupAdi,
        s.kod1,
        s.kod1Adi,
        s.kod2,
        s.kod2Adi,
        s.ureticiKodu,
      ]);
    });
  }, [availableStocks, searchQuery, i18n.language]);

  const handleSelect = (stock: StockGetDto): void => {
    onSelect({
      code: stock.erpStockCode,
      name: getLocalizedStockName(stock, i18n.language),
      groupCode: stock.grupKodu,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="!max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden dark:bg-[#130822]/95 border border-slate-200/60 dark:border-white/10 shadow-2xl rounded-[2rem] backdrop-blur-xl"
      >
        <DialogHeader className="px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-white/80 dark:bg-[#130822]/90 backdrop-blur-md flex-shrink-0 flex-row items-center justify-between space-y-0">
          <DialogTitle className="flex items-center gap-3 text-slate-900 dark:text-white text-lg">
            <div className="bg-gradient-to-br from-primary to-orange-500 p-2.5 rounded-xl shadow-lg shadow-primary/20 text-white">
              <Package size={20} />
            </div>
            {t('productPricingManagement.selectStok')}
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="group relative h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-primary hover:text-white transition-all duration-300 hover:scale-110 shadow-sm"
          >
            <X className="relative z-10" size={20} />
            <div className="absolute inset-0 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </DialogHeader>
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-white/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <Input
                placeholder={t('productPricingManagement.searchStockPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 rounded-xl bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
              />
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30 dark:bg-black/20">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-500">
              <div className="animate-spin mr-2 h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
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
                    'group relative flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-[color,background-color,border-color,box-shadow] duration-200',
                    'border-slate-200 bg-white dark:border-white/5 dark:bg-[#1a1025]/40',
                    'hover:border-primary/40 hover:bg-accent/60 hover:shadow-sm dark:hover:border-primary/45 dark:hover:bg-primary/[0.07]',
                  )}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary transition-colors group-hover:bg-primary/15 dark:bg-primary/10 dark:group-hover:bg-primary/20">
                    <Package size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                      {getLocalizedStockName(stock, i18n.language) || t('productPricingManagement.unnamedStock')}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                        {stock.erpStockCode}
                      </span>
                    </div>
                    <div className="mt-1 space-y-1 text-xs text-slate-400 dark:text-slate-500">
                      {(stock.grupKodu || stock.grupAdi) && (
                        <div>
                          {t('productSelectDialog.group')}: {[stock.grupKodu, stock.grupAdi].filter(Boolean).join(' - ')}
                        </div>
                      )}
                      {(stock.kod1 || stock.kod1Adi) && (
                        <div>
                          {t('productSelectDialog.code1')}: {[stock.kod1, stock.kod1Adi].filter(Boolean).join(' - ')}
                        </div>
                      )}
                      {(stock.kod2 || stock.kod2Adi) && (
                        <div>
                          {t('productSelectDialog.code2')}: {[stock.kod2, stock.kod2Adi].filter(Boolean).join(' - ')}
                        </div>
                      )}
                      {typeof stock.balance === 'number' && Number.isFinite(stock.balance) && (
                        <div className="font-medium text-emerald-600 dark:text-emerald-300">
                          {t('productSelectDialog.balance')}: {new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(stock.balance)}
                        </div>
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
