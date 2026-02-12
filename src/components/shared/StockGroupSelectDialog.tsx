import { type ReactElement, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Layers, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStokGroup } from '@/services/hooks/useStokGroup';
import type { StokGroupDto } from '@/services/erp-types';
import { VoiceSearchButton } from '@/components/ui/voice-search-button';

interface StockGroupSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (group: StokGroupDto) => void;
  selectedGroupCode?: string;
  excludeGroupCodes?: string[];
}

export function StockGroupSelectDialog({
  open,
  onOpenChange,
  onSelect,
  selectedGroupCode,
  excludeGroupCodes,
}: StockGroupSelectDialogProps): ReactElement {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: stockGroups = [], isLoading } = useStokGroup();

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

  const excludedSet = useMemo(
    () => (excludeGroupCodes?.length ? new Set(excludeGroupCodes) : undefined),
    [excludeGroupCodes]
  );

  const availableGroups = useMemo(() => {
    if (!excludedSet) return stockGroups;
    return stockGroups.filter((group) => {
      const code = group.grupKodu || `__group_${group.isletmeKodu}_${group.subeKodu}`;
      return !excludedSet.has(code);
    });
  }, [stockGroups, excludedSet]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return availableGroups;
    const normalizedQuery = normalizeText(searchQuery);
    return availableGroups.filter((group) => {
      const code = group.grupKodu ? normalizeText(group.grupKodu) : '';
      const name = group.grupAdi ? normalizeText(group.grupAdi) : '';
      return code.includes(normalizedQuery) || name.includes(normalizedQuery);
    });
  }, [availableGroups, searchQuery]);

  const handleSelect = (group: StokGroupDto) => {
    onSelect(group);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden bg-white/95 dark:bg-[#0c0516]/95 backdrop-blur-xl border-slate-200 dark:border-white/10 shadow-2xl">
        <DialogHeader className="px-6 py-5 border-b border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex-shrink-0">
          <DialogTitle className="flex items-center gap-3 text-slate-900 dark:text-white text-lg">
             <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
               <Layers size={20} />
             </div>
            {t('stockGroupSelectDialog.title')}
          </DialogTitle>
          
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1 group">
              <Search 
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" 
                size={16} 
              />
              <Input
                placeholder={t('stockGroupSelectDialog.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 rounded-xl bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all"
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
              <div className="animate-spin mr-2 h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
              {t('stockGroupSelectDialog.loading')}
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500 dark:text-slate-400">
              <Layers size={48} className="opacity-20 mb-4" />
              <p>{t('stockGroupSelectDialog.noResults')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredGroups.map((group) => {
                 const groupCode = group.grupKodu || `__group_${group.isletmeKodu}_${group.subeKodu}`;
                 const isSelected = selectedGroupCode === groupCode;
                 
                 return (
                  <div
                    key={groupCode}
                    onClick={() => handleSelect(group)}
                    className={cn(
                      "relative group flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border",
                      isSelected 
                        ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 ring-1 ring-indigo-500/20" 
                        : "bg-white dark:bg-[#1a1025]/40 border-slate-200 dark:border-white/5 hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:shadow-md hover:shadow-indigo-500/5"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-lg shrink-0 transition-colors",
                      isSelected
                        ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300"
                        : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:group-hover:bg-indigo-500/10 dark:group-hover:text-indigo-300"
                    )}>
                      <Layers size={20} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white truncate pr-2">
                          {group.grupAdi || t('stockGroupSelectDialog.unnamedGroup')}
                        </span>
                        {isSelected && (
                          <Check size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                           {group.grupKodu}
                         </span>
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
