import { type ReactElement, useRef, useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useOrderCalculations } from '../hooks/useOrderCalculations';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import { formatCurrency } from '../utils/format-currency';
import type { OrderLineFormState } from '../types/order-types';
import { Calculator, Wallet, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CreateOrderSchema } from '../schemas/order-schema';
import { cn } from '@/lib/utils';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

interface OrderSummaryCardProps {
  lines: OrderLineFormState[];
  currency: number;
}

export function OrderSummaryCard({
  lines,
  currency,
}: OrderSummaryCardProps): ReactElement {
  const { t } = useTranslation();
  const { calculateTotals } = useOrderCalculations();
  const { currencyOptions } = useCurrencyOptions();
  const form = useFormContext<CreateOrderSchema>();
  const skipSyncRef = useRef<'rate' | 'amount' | null>(null);

  const watchedRate = form.watch('order.generalDiscountRate');
  const watchedAmount = form.watch('order.generalDiscountAmount');

  const baseTotals = calculateTotals(lines, {});
  const netTotal = baseTotals.netTotal;

  const totals = calculateTotals(lines, {
    generalDiscountRate: watchedRate ?? undefined,
    generalDiscountAmount: watchedAmount ?? undefined,
  });

  const currencyCode = currencyOptions.find((opt) => opt.dovizTipi === currency)?.code ?? 'TRY';

  const handleRateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === '' || raw === undefined) {
        form.setValue('order.generalDiscountRate', null, { shouldValidate: true });
        form.setValue('order.generalDiscountAmount', null, { shouldValidate: true });
        return;
      }
      const num = Number(raw.replace(',', '.'));
      if (Number.isNaN(num)) return;
      const rate = Math.min(100, Math.max(0, num));
      skipSyncRef.current = 'amount';
      form.setValue('order.generalDiscountRate', round2(rate), { shouldValidate: true });
      const amount = netTotal > 0 ? round2(Math.min(netTotal * (rate / 100), netTotal)) : 0;
      form.setValue('order.generalDiscountAmount', amount, { shouldValidate: true });
      skipSyncRef.current = null;
    },
    [form, netTotal]
  );

  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === '' || raw === undefined) {
        form.setValue('order.generalDiscountAmount', null, { shouldValidate: true });
        form.setValue('order.generalDiscountRate', null, { shouldValidate: true });
        return;
      }
      const num = Number(raw.replace(',', '.').replace(/\s/g, ''));
      if (Number.isNaN(num)) return;
      const amount = round2(Math.min(netTotal, Math.max(0, num)));
      skipSyncRef.current = 'rate';
      form.setValue('order.generalDiscountAmount', amount, { shouldValidate: true });
      const rate = netTotal > 0 ? round2((amount / netTotal) * 100) : 0;
      form.setValue('order.generalDiscountRate', rate, { shouldValidate: true });
      skipSyncRef.current = null;
    },
    [form, netTotal]
  );

  const rateValue =
    watchedRate != null && !Number.isNaN(watchedRate)
      ? String(watchedRate)
      : '';
  const amountValue =
    watchedAmount != null && !Number.isNaN(watchedAmount)
      ? String(watchedAmount)
      : '';

  // Input oklarını gizleyen ve odaklanınca pembe border yapan sınıflar
  const customInputClasses = cn(
    "h-10 font-mono tabular-nums text-right bg-zinc-50/50 dark:bg-zinc-950/50 rounded-xl transition-all duration-300",
    "focus-visible:ring-4 focus-visible:ring-pink-500/10 focus-visible:border-pink-500",
    "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
  );

  return (
    <div className="relative overflow-hidden rounded-none border-0 bg-white/95 dark:bg-zinc-900/50">
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-6 text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-white/5 pb-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 shadow-sm">
            <Calculator className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-tight leading-none mb-1">{t('order.summary.title')}</h3>
            <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-tighter">Sipariş Toplam Analizi</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 items-end mb-4">
          <div className="flex flex-col gap-1.5 min-w-0">
            <Label
              htmlFor="order-generalDiscountRate"
              className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tight truncate"
            >
              {t('order.summary.generalDiscountRate')} (%)
            </Label>
            <div className="relative">
              <Input
                id="order-generalDiscountRate"
                type="number"
                min={0}
                max={100}
                step={0.01}
                placeholder="0"
                value={rateValue}
                onChange={handleRateChange}
                className={cn("pr-8", customInputClasses)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold pointer-events-none">
                %
              </span>
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5 min-w-0">
            <Label
              htmlFor="order-generalDiscountAmount"
              className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tight truncate"
            >
              {t('order.summary.generalDiscountAmount')}
            </Label>
            <Input
              id="order-generalDiscountAmount"
              type="number"
              min={0}
              step={0.01}
              placeholder="0,00"
              value={amountValue}
              onChange={handleAmountChange}
              className={customInputClasses}
            />
          </div>
        </div>

        {/* Geliştirilmiş Bilgi Kutusu */}
        <div className="flex gap-3 p-3 bg-pink-50/50 dark:bg-pink-900/10 rounded-xl border-l-4 border-l-pink-500 border-y border-r border-pink-100 dark:border-pink-900/20 shadow-sm animate-in fade-in slide-in-from-top-1">
          <Info className="h-4 w-4 text-pink-600 dark:text-pink-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-pink-800 dark:text-pink-300 leading-tight font-medium">
            {t('order.summary.generalDiscountHelp')}
          </p>
        </div>

        <div className="mt-6 pt-5 space-y-3.5">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-tight">
                {t('order.summary.subtotal')}
              </dt>
              <dd className="font-bold text-zinc-900 dark:text-zinc-100 font-mono tabular-nums text-right text-sm">
                {formatCurrency(totals.netTotal, currencyCode)}
              </dd>
            </div>
            
            {totals.generalDiscountAmount > 0 && (
              <div className="flex items-center justify-between gap-3 animate-in fade-in slide-in-from-right-2">
                <dt className="text-xs text-red-500 dark:text-red-400 font-bold uppercase tracking-tight">
                  {t('order.summary.generalDiscount')}
                </dt>
                <dd className="font-bold text-red-600 dark:text-red-400 font-mono tabular-nums text-right text-sm">
                  -{formatCurrency(totals.generalDiscountAmount, currencyCode)}
                </dd>
              </div>
            )}
            
            <div className="flex items-center justify-between gap-3">
              <dt className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-tight">
                {t('order.summary.totalVat')}
              </dt>
              <dd className="font-bold text-zinc-900 dark:text-zinc-100 font-mono tabular-nums text-right text-sm">
                {formatCurrency(totals.totalVatAfterDiscount, currencyCode)}
              </dd>
            </div>

            <div className="mt-4 pt-5 border-t-2 border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-900 dark:text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-pink-500" />
                  {t('order.summary.grandTotal')}
                </span>
                <span className="font-black text-zinc-900 dark:text-white font-mono tabular-nums text-right text-lg text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600">
                  {formatCurrency(totals.grandTotalAfterDiscount, currencyCode)}
                </span>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}