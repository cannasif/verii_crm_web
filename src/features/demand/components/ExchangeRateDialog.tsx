import { type ReactElement, useState, useEffect, useCallback } from 'react';
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
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import { toast } from 'sonner';
import { DollarSign, Edit2, Check, X, RefreshCw, Loader2 } from 'lucide-react';
import type { DemandExchangeRateFormState, DemandExchangeRateGetDto } from '../types/demand-types';
import { useUpdateExchangeRateInDemand } from '../hooks/useUpdateExchangeRateInDemand';
import { cn } from '@/lib/utils';

interface ExchangeRateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exchangeRates: DemandExchangeRateFormState[];
  onSave: (rates: DemandExchangeRateFormState[]) => void;
  lines?: Array<{ productCode?: string | null; productName?: string | null }>;
  currentCurrency?: number;
  demandId?: number | null;
  demandOfferNo?: string | null;
  readOnly?: boolean;
}

function parseRateId(id: string): number {
  if (id.startsWith('rate-')) {
    const n = parseInt(id.slice(5), 10);
    return Number.isNaN(n) ? 0 : n;
  }
  const n = parseInt(id, 10);
  return Number.isNaN(n) ? 0 : n;
}

export function ExchangeRateDialog({
  open,
  onOpenChange,
  exchangeRates,
  onSave,
  lines = [],
  currentCurrency,
  demandId,
  demandOfferNo,
  readOnly = false,
}: ExchangeRateDialogProps): ReactElement {
  const { t } = useTranslation();
  const { data: erpRates = [], isLoading } = useExchangeRate();
  const updateMutation = useUpdateExchangeRateInDemand(demandId ?? 0);
  const [localRates, setLocalRates] = useState<DemandExchangeRateFormState[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const isUpdateMode = demandId != null && demandId > 0;
  const isSaving = isUpdateMode && updateMutation.isPending;

  useEffect(() => {
    if (open && erpRates.length > 0) {
      const mappedRates: DemandExchangeRateFormState[] = erpRates.map((rate, index) => {
        const existing = exchangeRates.find((er) => er.dovizTipi === rate.dovizTipi);
        return {
          id: existing?.id || `temp-${rate.dovizTipi}-${index}`,
          currency: existing?.currency || rate.dovizIsmi || String(rate.dovizTipi),
          exchangeRate: existing?.exchangeRate || rate.kurDegeri || 0,
          exchangeRateDate: existing?.exchangeRateDate || new Date().toISOString().split('T')[0],
          isOfficial: existing?.isOfficial ?? (rate.kurDegeri !== null && existing === undefined),
          dovizTipi: rate.dovizTipi,
        };
      });
      setLocalRates(mappedRates);
    }
  }, [open, erpRates, exchangeRates]);

  const isCurrencyUsedInLines = (dovizTipi: number): boolean => {
    if (!lines || lines.length === 0 || !currentCurrency) {
      return false;
    }
    return currentCurrency === dovizTipi;
  };

  const handleRateChange = (id: string, value: number): void => {
    setLocalRates((prev) =>
      prev.map((rate) => {
        if (rate.id === id) {
          if (isCurrencyUsedInLines(rate.dovizTipi || 0)) {
            return rate;
          }
          const originalRate = erpRates.find((er) => er.dovizTipi === rate.dovizTipi);
          const isChanged = originalRate?.kurDegeri !== value;
          return {
            ...rate,
            exchangeRate: value,
            isOfficial: !isChanged && originalRate?.kurDegeri !== null,
          };
        }
        return rate;
      })
    );
  };

  const mapToUpdateDtos = useCallback((): DemandExchangeRateGetDto[] => {
    return localRates.map((r) => ({
      id: parseRateId(r.id),
      demandId: demandId ?? 0,
      demandOfferNo: demandOfferNo ?? undefined,
      currency: r.currency || (r.dovizTipi != null ? String(r.dovizTipi) : ''),
      exchangeRate: r.exchangeRate,
      exchangeRateDate: r.exchangeRateDate || new Date().toISOString().split('T')[0],
      isOfficial: r.isOfficial ?? true,
    }));
  }, [localRates, demandId, demandOfferNo]);

  const handleSave = async (): Promise<void> => {
    if (readOnly) return;
    if (isUpdateMode) {
      try {
        await updateMutation.mutateAsync(mapToUpdateDtos());
        onSave(localRates);
        onOpenChange(false);
      } catch {
        void 0;
      }
      return;
    }
    onSave(localRates);
    onOpenChange(false);
  };

  const handleCancel = (): void => {
    if (isSaving) return;
    setLocalRates([]);
    setEditingId(null);
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean): void => {
    if (!next && isSaving) return;
    onOpenChange(next);
  };

  const styles = {
    tableHead: "h-10 px-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider bg-zinc-50/80 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800",
    tableRow: "hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-0",
    input: "h-8 bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 focus-visible:border-pink-500 focus-visible:ring-4 focus-visible:ring-pink-500/20 font-mono font-medium text-right pr-2 rounded-lg transition-all duration-200",
    actionButton: "h-7 w-7 p-0 rounded-md hover:scale-105 transition-transform",
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 overflow-hidden bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-zinc-200 dark:border-zinc-800 shadow-2xl">
        
        {/* HEADER */}
        <DialogHeader className="p-6 pb-4 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/30 dark:bg-zinc-900/10">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20 text-white">
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-zinc-900 dark:text-zinc-100">{t('demand.exchangeRates.dialog.title')}</span>
              <span className="text-xs font-normal text-muted-foreground">{t('demand.exchangeRates.dialog.subtitle')}</span>
            </div>
          </DialogTitle>
          <DialogDescription className="hidden">
            {t('demand.exchangeRates.dialog.description')}
          </DialogDescription>
        </DialogHeader>

        {/* CONTENT */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-spin text-zinc-300" />
              <span className="text-sm font-medium">{t('demand.loading')}</span>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm bg-white dark:bg-zinc-900/20">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-0">
                    <TableHead className={cn(styles.tableHead, "pl-6")}>{t('demand.exchangeRates.currency')}</TableHead>
                    <TableHead className={cn(styles.tableHead, "text-right")}>{t('demand.exchangeRates.rate')}</TableHead>
                    <TableHead className={cn(styles.tableHead, "text-center")}>{t('demand.exchangeRates.status')}</TableHead>
                    <TableHead className={cn(styles.tableHead, "text-center w-[100px]")}>{t('demand.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localRates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        {t('demand.exchangeRates.empty')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    localRates.map((rate) => {
                      const erpRate = erpRates.find((er) => er.dovizTipi === rate.dovizTipi);
                      const currencyCode = erpRate?.dovizIsmi || `DOVIZ_${rate.dovizTipi}`;
                      const isUsed = isCurrencyUsedInLines(rate.dovizTipi || 0);

                      return (
                        <TableRow key={rate.id} className={styles.tableRow}>
                          <TableCell className="pl-6 font-semibold text-zinc-700 dark:text-zinc-200">
                            {currencyCode}
                          </TableCell>
                          
                          <TableCell className="text-right">
                            {editingId === rate.id ? (
                              <Input
                                type="number"
                                step="0.0001"
                                min="0"
                                value={rate.exchangeRate}
                                onChange={(e) => handleRateChange(rate.id, parseFloat(e.target.value) || 0)}
                                className={cn(styles.input, "w-28 ml-auto")}
                                autoFocus
                                disabled={isUsed}
                              />
                            ) : (
                              <div className="font-mono font-medium text-zinc-600 dark:text-zinc-300">
                                {rate.exchangeRate.toFixed(4)}
                              </div>
                            )}
                          </TableCell>
                          
                          <TableCell className="text-center">
                            {rate.isOfficial ? (
                              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 text-[10px] px-2 h-5">
                                {t('demand.exchangeRates.official')}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 text-[10px] px-2 h-5">
                                {t('demand.exchangeRates.custom')}
                              </Badge>
                            )}
                          </TableCell>
                          
                          <TableCell className="text-center">
                            {editingId === rate.id ? (
                              <div className="flex gap-1 justify-center">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setEditingId(null)}
                                  className={cn(styles.actionButton, "hover:bg-emerald-50 text-emerald-600")}
                                  disabled={isUsed}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    const originalRate = erpRates.find((er) => er.dovizTipi === rate.dovizTipi);
                                    handleRateChange(rate.id, originalRate?.kurDegeri || 0);
                                    setEditingId(null);
                                  }}
                                  className={cn(styles.actionButton, "hover:bg-rose-50 text-rose-600")}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  if (isUsed) {
                                    toast.error(t('demand.exchangeRates.cannotEditUsedCurrency'));
                                    return;
                                  }
                                  setEditingId(rate.id);
                                }}
                                className={cn(styles.actionButton, "text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20")}
                                disabled={isUsed}
                                title={isUsed ? t('demand.exchangeRates.cannotEditUsedCurrency') : t('demand.edit')}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          
          <div className="mt-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-3 text-xs text-blue-600 dark:text-blue-400 flex gap-2 items-start">
             <div className="mt-0.5 min-w-4"><DollarSign className="w-3.5 h-3.5" /></div>
             <p>{t('demand.exchangeRates.dialog.info')}</p>
          </div>
        </div>

        {/* FOOTER */}
        <DialogFooter className="p-4 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/30 dark:bg-zinc-900/10 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
            className="rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
          >
            {t('demand.cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={readOnly || isLoading || isSaving}
            className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all border-0"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t('demand.saving')}
              </>
            ) : (
              t('demand.saveAndApply')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
