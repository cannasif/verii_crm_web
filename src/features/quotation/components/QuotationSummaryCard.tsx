import { type ReactElement, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuotationCalculations } from '../hooks/useQuotationCalculations';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import { formatCurrency } from '../utils/format-currency';
import type { QuotationLineFormState } from '../types/quotation-types';
import { Calculator, Wallet } from 'lucide-react';

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

  const totals = calculateTotals(lines);

  const currencyCode = useMemo(() => {
    const found = currencyOptions.find((opt) => opt.dovizTipi === currency);
    return found?.code || 'TRY';
  }, [currency, currencyOptions]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-5 text-zinc-900 dark:text-white">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
            <Calculator className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="font-bold text-sm">{t('quotation.summary.title', 'Özet')}</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-zinc-500 dark:text-zinc-400 font-medium shrink-0">
              {t('quotation.summary.subtotal', 'Ara Toplam')}
            </span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono tabular-nums text-right">
              {formatCurrency(totals.subtotal, currencyCode)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-zinc-500 dark:text-zinc-400 font-medium shrink-0">
              {t('quotation.summary.totalVat', 'Toplam KDV')}
            </span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono tabular-nums text-right">
              {formatCurrency(totals.totalVat, currencyCode)}
            </span>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-zinc-200 dark:border-zinc-700 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-zinc-700 dark:text-zinc-300 font-semibold shrink-0 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              {t('quotation.summary.grandTotal', 'Genel Toplam')}
            </span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono tabular-nums text-right text-base">
              {formatCurrency(totals.grandTotal, currencyCode)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}