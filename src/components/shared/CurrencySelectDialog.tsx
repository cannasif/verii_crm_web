import { type ReactElement, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Coins, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import type { KurDto } from '@/services/erp-types';
import { VoiceSearchButton } from '@/components/ui/voice-search-button';

interface CurrencySelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (currency: KurDto) => void;
  selectedCurrencyCode?: string;
}

export function CurrencySelectDialog({
  open,
  onOpenChange,
  onSelect,
  selectedCurrencyCode,
}: CurrencySelectDialogProps): ReactElement {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: exchangeRates = [], isLoading } = useExchangeRate();
  
  // Normalize text for search
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c');
  };

  const filteredCurrencies = useMemo(() => {
    if (!searchQuery.trim()) return exchangeRates;
    
    const normalizedQuery = normalizeText(searchQuery);
    return exchangeRates.filter((currency) => {
      const code = String(currency.dovizTipi);
      const name = currency.dovizIsmi ? normalizeText(currency.dovizIsmi) : '';
      return code.includes(normalizedQuery) || name.includes(normalizedQuery);
    });
  }, [exchangeRates, searchQuery]);

  const handleSelect = (currency: KurDto) => {
    onSelect(currency);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0 overflow-hidden bg-white/95 dark:bg-[#0c0516]/95 backdrop-blur-xl border-slate-200 dark:border-white/10 shadow-2xl">
        <DialogHeader className="px-6 py-5 border-b border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex-shrink-0">
          <DialogTitle className="flex items-center gap-3 text-slate-900 dark:text-white text-lg">
             <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 rounded-xl shadow-lg shadow-amber-500/20 text-white">
               <Coins size={20} />
             </div>
            {t('currencySelectDialog.title')}
          </DialogTitle>
          
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1 group">
              <Search 
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" 
                size={16} 
              />
              <Input
                placeholder={t('currencySelectDialog.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 rounded-xl bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 focus-visible:ring-amber-500/20 focus-visible:border-amber-500 transition-all"
              />
            </div>
            <VoiceSearchButton
              onResult={setSearchQuery}
              className="h-11 w-11 rounded-xl border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30 dark:bg-black/20">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-500">
              <div className="animate-spin mr-2 h-4 w-4 border-2 border-amber-500 border-t-transparent rounded-full"></div>
              {t('currencySelectDialog.loading')}
            </div>
          ) : filteredCurrencies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500 dark:text-slate-400">
              <Coins size={48} className="opacity-20 mb-4" />
              <p>{t('currencySelectDialog.noResults')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCurrencies.map((currency) => {
                 const currencyCode = String(currency.dovizTipi);
                 const isSelected = selectedCurrencyCode === currencyCode;
                 
                 return (
                  <div
                    key={currencyCode}
                    onClick={() => handleSelect(currency)}
                    className={cn(
                      "relative group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border",
                      isSelected 
                        ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 ring-1 ring-amber-500/20" 
                        : "bg-white dark:bg-[#1a1025]/40 border-slate-200 dark:border-white/5 hover:border-amber-300 dark:hover:border-amber-500/30 hover:shadow-md hover:shadow-amber-500/5"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-lg shrink-0 transition-colors",
                      isSelected
                        ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300"
                        : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-600 dark:group-hover:bg-amber-500/10 dark:group-hover:text-amber-300"
                    )}>
                      <Coins size={20} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                          {currency.dovizIsmi || `Döviz ${currency.dovizTipi}`}
                        </span>
                        {isSelected && (
                          <Check size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                         <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                           Kod: {currency.dovizTipi}
                         </span>
                         {currency.kurDegeri && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                Kur: {currency.kurDegeri}
                            </span>
                         )}
                      </div>
                    </div>
                  </div>
                 );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
