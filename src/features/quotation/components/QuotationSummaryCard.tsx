import { type ReactElement, useRef, useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useQuotationCalculations } from '../hooks/useQuotationCalculations';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import { formatCurrency } from '../utils/format-currency';
import type { QuotationLineFormState } from '../types/quotation-types';
import { Calculator, Wallet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CreateQuotationSchema } from '../schemas/quotation-schema';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

interface QuotationSummaryCardProps {
  lines: QuotationLineFormState[];
  currency: number;
}

export function QuotationSummaryCard({
  lines,
  currency,
}: QuotationSummaryCardProps): ReactElement {
  const { t } = useTranslation();
  const { calculateTotals } = useQuotationCalculations();
  const { currencyOptions } = useCurrencyOptions();
  const form = useFormContext<CreateQuotationSchema>();
  const skipSyncRef = useRef<'rate' | 'amount' | null>(null);

  const watchedRate = form.watch('quotation.generalDiscountRate');
  const watchedAmount = form.watch('quotation.generalDiscountAmount');

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
        form.setValue('quotation.generalDiscountRate', null, { shouldValidate: true });
        form.setValue('quotation.generalDiscountAmount', null, { shouldValidate: true });
        return;
      }
      const num = Number(raw.replace(',', '.'));
      if (Number.isNaN(num)) return;
      const rate = Math.min(100, Math.max(0, num));
      skipSyncRef.current = 'amount';
      form.setValue('quotation.generalDiscountRate', round2(rate), { shouldValidate: true });
      const amount = netTotal > 0 ? round2(Math.min(netTotal * (rate / 100), netTotal)) : 0;
      form.setValue('quotation.generalDiscountAmount', amount, { shouldValidate: true });
      skipSyncRef.current = null;
    },
    [form, netTotal]
  );

  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === '' || raw === undefined) {
        form.setValue('quotation.generalDiscountAmount', null, { shouldValidate: true });
        form.setValue('quotation.generalDiscountRate', null, { shouldValidate: true });
        return;
      }
      const num = Number(raw.replace(',', '.').replace(/\s/g, ''));
      if (Number.isNaN(num)) return;
      const amount = round2(Math.min(netTotal, Math.max(0, num)));
      skipSyncRef.current = 'rate';
      form.setValue('quotation.generalDiscountAmount', amount, { shouldValidate: true });
      const rate = netTotal > 0 ? round2((amount / netTotal) * 100) : 0;
      form.setValue('quotation.generalDiscountRate', rate, { shouldValidate: true });
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

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm">
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-6 text-zinc-900 dark:text-white">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
            <Calculator className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="font-bold text-sm tracking-tight">{t('quotation.summary.title')}</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 sm:gap-y-0 sm:items-start">
          <div className="flex flex-col gap-1.5 min-w-0">
            <Label
              htmlFor="generalDiscountRate"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300 leading-tight"
            >
              {t('quotation.summary.generalDiscountRate')}
            </Label>
            <div className="relative">
              <Input
                id="generalDiscountRate"
                type="number"
                min={0}
                max={100}
                step={0.01}
                placeholder="0"
                value={rateValue}
                onChange={handleRateChange}
                className="h-9 pr-8 font-mono tabular-nums text-right"
                aria-invalid={!!form.formState.errors.quotation?.generalDiscountRate}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 text-sm font-medium pointer-events-none select-none">
                %
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <Label
              htmlFor="generalDiscountAmount"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300 leading-tight"
            >
              {t('quotation.summary.generalDiscountAmount')}
            </Label>
            <Input
              id="generalDiscountAmount"
              type="number"
              min={0}
              step={0.01}
              placeholder="0,00"
              value={amountValue}
              onChange={handleAmountChange}
              className="h-9 font-mono tabular-nums text-right"
              aria-invalid={!!form.formState.errors.quotation?.generalDiscountAmount}
            />
          </div>
        </div>

        <p className="mt-3 pl-3 border-l-2 border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {t('quotation.summary.generalDiscountHelp')}
        </p>

        <div className="mt-6 pt-5 border-t border-zinc-200 dark:border-zinc-700">
          <dl className="space-y-3.5">
            <div className="flex items-center justify-between gap-3 min-w-0">
              <dt className="text-sm text-zinc-500 dark:text-zinc-400 font-medium truncate">
                {t('quotation.summary.subtotal')}
              </dt>
              <dd className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono tabular-nums text-right text-sm shrink-0 min-w-24">
                {formatCurrency(totals.netTotal, currencyCode)}
              </dd>
            </div>
            {totals.generalDiscountAmount > 0 && (
              <div className="flex items-center justify-between gap-3 min-w-0">
                <dt className="text-sm text-zinc-500 dark:text-zinc-400 font-medium truncate">
                  {t('quotation.summary.generalDiscount')}
                </dt>
                <dd className="font-semibold text-red-600 dark:text-red-400 font-mono tabular-nums text-right text-sm shrink-0 min-w-24">
                  -{formatCurrency(totals.generalDiscountAmount, currencyCode)}
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 min-w-0">
              <dt className="text-sm text-zinc-500 dark:text-zinc-400 font-medium truncate">
                {t('quotation.summary.totalVat')}
              </dt>
              <dd className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono tabular-nums text-right text-sm shrink-0 min-w-24">
                {formatCurrency(totals.totalVatAfterDiscount, currencyCode)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-4 pt-4 border-t-2 border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between gap-3 min-w-0">
            <span className="text-zinc-700 dark:text-zinc-300 font-semibold text-sm shrink-0 flex items-center gap-2 truncate">
              <Wallet className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              {t('quotation.summary.grandTotal')}
            </span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono tabular-nums text-right text-base shrink-0 min-w-24">
              {formatCurrency(totals.grandTotalAfterDiscount, currencyCode)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
