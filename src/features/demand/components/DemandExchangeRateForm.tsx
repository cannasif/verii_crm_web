import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, DollarSign, Calendar, Calculator } from 'lucide-react';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import type { DemandExchangeRateFormState } from '../types/demand-types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface DemandExchangeRateFormProps {
  exchangeRates: DemandExchangeRateFormState[];
  setExchangeRates: (rates: DemandExchangeRateFormState[]) => void;
  baseCurrency: number;
}

export function DemandExchangeRateForm({
  exchangeRates,
  setExchangeRates,
}: DemandExchangeRateFormProps): ReactElement {
  const { t } = useTranslation(['demand', 'common']);
  const { currencyOptions, isLoading: isCurrencyLoading } = useCurrencyOptions();
  const [newDovizTipi, setNewDovizTipi] = useState<number | ''>('');
  const [newExchangeRate, setNewExchangeRate] = useState('');
  const [newExchangeRateDate, setNewExchangeRateDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [newIsOfficial, setNewIsOfficial] = useState(false);

  const styles = {
    glassCard: "relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/50 backdrop-blur-xl shadow-lg shadow-zinc-200/50 dark:shadow-none",
    inputBase: "h-10 bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus-visible:border-pink-500 focus-visible:ring-4 focus-visible:ring-pink-500/20 rounded-xl transition-all duration-200 font-medium",
    tableHead: "h-10 px-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider bg-zinc-50/80 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800",
    tableRow: "hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-0",
    label: "text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1.5 block uppercase tracking-wide",
  };

  const handleAdd = (): void => {
    if (!newDovizTipi || !newExchangeRate || !newExchangeRateDate) return;

    const selectedCurrency = currencyOptions.find((opt) => opt.dovizTipi === newDovizTipi);
    if (!selectedCurrency) return;

    const existingRate = exchangeRates.find((er) => er.dovizTipi === newDovizTipi);
    if (existingRate) {
      return;
    }

    const newRate: DemandExchangeRateFormState = {
      id: `temp-${Date.now()}`,
      currency: selectedCurrency.dovizIsmi || String(newDovizTipi),
      exchangeRate: parseFloat(newExchangeRate),
      exchangeRateDate: newExchangeRateDate,
      isOfficial: newIsOfficial,
      dovizTipi: newDovizTipi,
    };

    setExchangeRates([...exchangeRates, newRate]);
    setNewDovizTipi('');
    setNewExchangeRate('');
    setNewExchangeRateDate(new Date().toISOString().split('T')[0]);
    setNewIsOfficial(false);
  };

  const handleDelete = (id: string): void => {
    setExchangeRates(exchangeRates.filter((rate) => rate.id !== id));
  };

  return (
    <div className={styles.glassCard}>
      
      {/* HEADER & FORM SECTION */}
      <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20 text-white">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              {t('demand.exchangeRates.title')}
            </h3>
            <p className="text-xs text-zinc-500">
              Manuel kur girişi ve yönetimi
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-12 items-end">
          {/* Para Birimi Seçimi */}
          <div className="md:col-span-3">
            <Label className={styles.label}>{t('demand.exchangeRates.currency')}</Label>
            <Select
              value={newDovizTipi === '' ? undefined : String(newDovizTipi)}
              onValueChange={(value) => setNewDovizTipi(parseInt(value, 10))}
              disabled={isCurrencyLoading}
            >
              <SelectTrigger className={styles.inputBase}>
                <SelectValue placeholder={isCurrencyLoading ? t('common.loading') : t('demand.select')} />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions
                  .filter((opt) => !exchangeRates.some((er) => er.dovizTipi === opt.dovizTipi))
                  .map((opt) => (
                    <SelectItem key={opt.dovizTipi} value={String(opt.dovizTipi)}>
                      <span className="font-medium">{opt.code}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{opt.label}</span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Kur Değeri */}
          <div className="md:col-span-3">
            <Label className={styles.label}>{t('demand.exchangeRates.rate')}</Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                <Calculator className="h-4 w-4" />
              </div>
              <Input
                type="number"
                step="0.000001"
                min="0.01"
                value={newExchangeRate}
                onChange={(e) => setNewExchangeRate(e.target.value)}
                placeholder="0.00"
                className={cn(styles.inputBase, "pl-9 font-mono text-sm")}
              />
            </div>
          </div>

          {/* Tarih */}
          <div className="md:col-span-3">
            <Label className={styles.label}>{t('demand.exchangeRates.date')}</Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                <Calendar className="h-4 w-4" />
              </div>
              <Input
                type="date"
                value={newExchangeRateDate}
                onChange={(e) => setNewExchangeRateDate(e.target.value)}
                className={cn(styles.inputBase, "pl-9 text-xs")}
              />
            </div>
          </div>

          {/* Switch ve Buton */}
          <div className="md:col-span-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/50 px-3 h-10 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <Switch
                checked={newIsOfficial}
                onCheckedChange={setNewIsOfficial}
                id="isOfficial"
                className="data-[state=checked]:bg-emerald-600"
              />
              <Label htmlFor="isOfficial" className="mb-0 text-[10px] font-medium cursor-pointer">
                {t('demand.exchangeRates.isOfficial')}
              </Label>
            </div>
            
            <Button 
              type="button" 
              onClick={handleAdd} 
              size="sm"
              className="h-10 px-4 rounded-xl bg-linear-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white shadow-md hover:shadow-lg transition-all border-0 flex-1 font-bold"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {t('demand.add')}
            </Button>
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      {exchangeRates.length > 0 ? (
        <div className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-0">
                <TableHead className={cn(styles.tableHead, "pl-6")}>{t('demand.exchangeRates.currency')}</TableHead>
                <TableHead className={cn(styles.tableHead, "text-right")}>{t('demand.exchangeRates.rate')}</TableHead>
                <TableHead className={cn(styles.tableHead, "text-center")}>{t('demand.exchangeRates.date')}</TableHead>
                <TableHead className={cn(styles.tableHead, "text-center")}>{t('demand.exchangeRates.isOfficial')}</TableHead>
                <TableHead className={cn(styles.tableHead, "text-center w-[80px]")}>{t('demand.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exchangeRates.map((rate) => {
                const currencyCode = rate.currency || (rate.dovizTipi ? `DOVIZ_${rate.dovizTipi}` : '');
                return (
                  <TableRow key={rate.id} className={styles.tableRow}>
                    <TableCell className="pl-6 font-semibold text-zinc-700 dark:text-zinc-200">
                      {currencyCode}
                    </TableCell>
                    <TableCell className="text-right font-mono text-zinc-600 dark:text-zinc-300">
                      {rate.exchangeRate.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-center text-xs text-zinc-500">
                      {rate.exchangeRateDate}
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(rate.id)}
                        className="h-8 w-8 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center text-zinc-400 dark:text-zinc-600">
          <p className="text-sm">{t('demand.exchangeRates.empty')}</p>
        </div>
      )}
    </div>
  );
}