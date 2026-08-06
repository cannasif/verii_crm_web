import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useDeleteSalesForecastOverrideMutation,
  useUpsertSalesForecastOverrideMutation,
} from '../hooks/useSalesForecast';
import {
  SalesForecastProbabilitySource,
  type SalesForecastPipelineItemDto,
} from '../types/sales-forecast.types';

interface SalesForecastOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: number;
  item: SalesForecastPipelineItemDto | null;
}

function toDateInput(value: string): string {
  return value.slice(0, 10);
}

function toLocalDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addLocalYears(date: Date, years: number): string {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setFullYear(next.getFullYear() + years);
  return toLocalDateInput(next);
}

export function SalesForecastOverrideDialog({
  open,
  onOpenChange,
  planId,
  item,
}: SalesForecastOverrideDialogProps): ReactElement {
  const { t } = useTranslation('sales-forecast');
  const saveMutation = useUpsertSalesForecastOverrideMutation();
  const deleteMutation = useDeleteSalesForecastOverrideMutation();
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [probability, setProbability] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open || !item) return;
    setExpectedCloseDate(toDateInput(item.expectedCloseDate));
    setProbability(String(item.appliedProbability));
    setNotes(item.overrideNotes ?? '');
  }, [item, open]);

  const today = useMemo(() => toLocalDateInput(new Date()), []);
  const maxDate = useMemo(() => addLocalYears(new Date(), 3), []);
  const parsedProbability = Number(probability);
  const hasManualOverride = item?.probabilitySource === SalesForecastProbabilitySource.Manual;
  const isValid = Boolean(
    item &&
    expectedCloseDate &&
    expectedCloseDate >= today &&
    expectedCloseDate <= maxDate &&
    Number.isFinite(parsedProbability) &&
    parsedProbability >= 0 &&
    parsedProbability <= 100 &&
    notes.trim().length <= 500,
  );
  const isPending = saveMutation.isPending || deleteMutation.isPending;

  const handleSave = (): void => {
    if (!item || !isValid) return;
    saveMutation.mutate(
      {
        planId,
        quotationId: item.quotationId,
        payload: {
          expectedCloseDate: `${expectedCloseDate}T00:00:00Z`,
          probability: parsedProbability,
          notes: notes.trim() || null,
          rowVersion: item.overrideRowVersion,
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  const handleDelete = (): void => {
    if (!item?.overrideRowVersion) return;
    deleteMutation.mutate(
      { planId, quotationId: item.quotationId, rowVersion: item.overrideRowVersion },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isPending && onOpenChange(nextOpen)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('override.title')}</DialogTitle>
          <DialogDescription>
            {item ? t('override.description', { documentNumber: item.documentNumber }) : ''}
          </DialogDescription>
        </DialogHeader>

        {item ? (
          <div className="space-y-4 py-1">
            <div className="grid gap-3 rounded-md border bg-muted/25 p-3 sm:grid-cols-3">
              <div><p className="text-xs text-muted-foreground">{t('override.suggestedProbability')}</p><p className="font-semibold tabular-nums">%{item.suggestedProbability}</p></div>
              <div><p className="text-xs text-muted-foreground">{t('override.historicalWinRate')}</p><p className="font-semibold tabular-nums">%{item.historicalWinRate}</p></div>
              <div><p className="text-xs text-muted-foreground">{t('override.suggestedCloseDate')}</p><p className="font-semibold tabular-nums">{toDateInput(item.suggestedCloseDate)}</p></div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="forecast-close-date">{t('override.expectedCloseDate')}</Label>
                <Input
                  id="forecast-close-date"
                  type="date"
                  min={today}
                  max={maxDate}
                  value={expectedCloseDate}
                  onChange={(event) => setExpectedCloseDate(event.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="forecast-probability">{t('override.probability')}</Label>
                <Input
                  id="forecast-probability"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={probability}
                  onChange={(event) => setProbability(event.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="forecast-notes">{t('override.notes')}</Label>
              <Textarea
                id="forecast-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={500}
                rows={4}
                disabled={isPending}
                placeholder={t('override.notesPlaceholder')}
              />
              <p className="text-right text-xs text-muted-foreground tabular-nums">{notes.trim().length}/500</p>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {hasManualOverride ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" disabled={isPending}>
                    <RotateCcw className="size-4" />
                    {t('override.reset')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('override.resetConfirmTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('override.resetConfirmDescription')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>{t('override.resetConfirm')}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>{t('actions.cancel')}</Button>
            <Button type="button" onClick={handleSave} disabled={!isValid || isPending}>
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {t('actions.save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
