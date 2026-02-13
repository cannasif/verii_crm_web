import { type ReactElement, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import type { StockRelationDto } from '@/features/stock/types';

interface RelatedStocksSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relatedStocks: StockRelationDto[];
  onConfirm: (selectedStockIds: number[]) => void | Promise<void>;
}

export function RelatedStocksSelectionDialog({
  open,
  onOpenChange,
  relatedStocks,
  onConfirm,
}: RelatedStocksSelectionDialogProps): ReactElement {
  const { t } = useTranslation();
  const [selectedStockIds, setSelectedStockIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const mandatoryIds = new Set(
        relatedStocks.filter((stock) => stock.isMandatory).map((stock) => stock.relatedStockId)
      );
      setSelectedStockIds(mandatoryIds);
      setIsLoading(false);
    }
  }, [open, relatedStocks]);

  const handleToggleStock = (stockId: number, isMandatory: boolean): void => {
    if (isMandatory || isLoading) {
      return;
    }
    const newSelected = new Set(selectedStockIds);
    if (newSelected.has(stockId)) {
      newSelected.delete(stockId);
    } else {
      newSelected.add(stockId);
    }
    setSelectedStockIds(newSelected);
  };

  const handleConfirm = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await onConfirm(Array.from(selectedStockIds));
      onOpenChange(false);
    } catch (error) {
      console.error('Error confirming related stocks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const mandatoryStocks = relatedStocks.filter((stock) => stock.isMandatory);
  const optionalStocks = relatedStocks.filter((stock) => !stock.isMandatory);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isLoading && onOpenChange(isOpen)}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 bg-white/95 dark:bg-[#1a1025]/95 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-2xl rounded-2xl overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b border-slate-200/50 dark:border-white/5">
          <DialogTitle className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-pink-600 to-orange-600">
            {t('relatedStocksSelectionDialog.title')}
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            {t('relatedStocksSelectionDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 px-6 py-6 custom-scrollbar">
          {mandatoryStocks.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-1 h-4 bg-orange-500 rounded-full inline-block"></span>
                {t('relatedStocksSelectionDialog.mandatoryStocks')}
              </Label>
              <div className="space-y-2">
                {mandatoryStocks.map((stock) => (
                  <div
                    key={stock.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-orange-200/50 dark:border-orange-500/20 bg-orange-50/30 dark:bg-orange-900/10"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-medium text-sm truncate text-slate-900 dark:text-white">
                            {stock.relatedStockName || t('relatedStocksSelectionDialog.unknownStock')}
                          </div>
                          {stock.relatedStockCode && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-white/50 dark:bg-white/5 px-1.5 py-0.5 rounded">
                              {stock.relatedStockCode}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {t('relatedStocksSelectionDialog.quantity')}: <span className="font-semibold text-slate-700 dark:text-slate-300">{stock.quantity}</span>
                        </div>
                        {stock.description && (
                          <div className="text-xs text-slate-400 mt-1 italic">
                            {stock.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-2 shrink-0 border-orange-200 dark:border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20">
                      {t('relatedStocksSelectionDialog.mandatory')}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {optionalStocks.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-1 h-4 bg-pink-500 rounded-full inline-block"></span>
                {t('relatedStocksSelectionDialog.optionalStocks')}
              </Label>
              <div className="space-y-2">
                {optionalStocks.map((stock) => {
                  const isSelected = selectedStockIds.has(stock.relatedStockId);
                  return (
                    <div
                      key={stock.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                        isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        isSelected 
                          ? 'bg-pink-50/80 dark:bg-pink-500/10 border-pink-500/50 shadow-sm shadow-pink-500/10' 
                          : 'bg-white/50 dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-pink-500/30 hover:bg-pink-50/30 dark:hover:bg-pink-500/5'
                      }`}
                      onClick={() => !isLoading && handleToggleStock(stock.relatedStockId, stock.isMandatory)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleStock(stock.relatedStockId, stock.isMandatory)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={isLoading}
                          className="data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500 border-slate-300 dark:border-slate-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`font-medium text-sm truncate transition-colors ${isSelected ? 'text-pink-700 dark:text-pink-300' : 'text-slate-900 dark:text-white'}`}>
                              {stock.relatedStockName || t('relatedStocksSelectionDialog.unknownStock')}
                            </div>
                            {stock.relatedStockCode && (
                              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                                {stock.relatedStockCode}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {t('relatedStocksSelectionDialog.quantity')}: <span className="font-semibold text-slate-700 dark:text-slate-300">{stock.quantity}</span>
                          </div>
                          {stock.description && (
                            <div className="text-xs text-slate-400 mt-1 italic">
                              {stock.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {relatedStocks.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              {t('relatedStocksSelectionDialog.noRelatedStocks')}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isLoading}
            className="border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            {t('relatedStocksSelectionDialog.cancel')}
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isLoading}
            className="bg-linear-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white shadow-md shadow-pink-500/20 border-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('relatedStocksSelectionDialog.calculating')}
              </>
            ) : (
              t('relatedStocksSelectionDialog.add')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
