import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  Salesmen360CurrencyAmountDto,
  Salesmen360AnalyticsSummaryDto,
} from '../types/salesmen360.types';
import { Coins, History, TrendingUp, Zap, FileSearch } from 'lucide-react';

const formatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface SalesmenCurrencySummaryCardsProps {
  isAllCurrencies: boolean;
  summary: Salesmen360AnalyticsSummaryDto | null | undefined;
  totalsByCurrency: Salesmen360CurrencyAmountDto[];
  isLoading: boolean;
  lastActivityDateFormatted: string;
}

export function SalesmenCurrencySummaryCards({
  isAllCurrencies,
  summary,
  totalsByCurrency,
  isLoading,
  lastActivityDateFormatted,
}: SalesmenCurrencySummaryCardsProps): ReactElement {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="rounded-2xl border border-slate-200 bg-white/50 dark:border-white/10 dark:bg-white/[0.02]">
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-32 mb-2 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isAllCurrencies) {
    if (!totalsByCurrency.length) {
      return (
        <Card className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 dark:border-white/10 dark:bg-white/[0.02] p-10">
          <CardContent className="flex flex-col items-center justify-center gap-3 text-slate-400">
            <FileSearch className="size-10 opacity-20" />
            <p className="text-sm font-medium">{t('common.noData')}</p>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {totalsByCurrency.map((row) => (
          <Card key={row.currency} className="rounded-2xl border border-slate-200 bg-white/80 p-1 dark:border-white/10 dark:bg-white/[0.03] shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Coins className="size-6" />
            </div>
            <CardContent className="pt-4 pb-5 px-6">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                {row.currency}
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">{t('salesman360.currencyTotals.demandAmount')}</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-white tabular-nums">{formatter.format(row.demandAmount ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">{t('salesman360.currencyTotals.quotationAmount')}</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-white tabular-nums">{formatter.format(row.quotationAmount ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">{t('salesman360.currencyTotals.orderAmount')}</span>
                  <span className="text-sm font-bold text-pink-600 dark:text-pink-400 tabular-nums">{formatter.format(row.orderAmount ?? 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const s = summary ?? {
    last12MonthsOrderAmount: 0,
    openQuotationAmount: 0,
    openOrderAmount: 0,
    activityCount: 0,
    lastActivityDate: null,
    totalsByCurrency: [],
  };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card className="rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/[0.03] shadow-sm overflow-hidden group">
        <CardContent className="pt-4 pb-3 px-5 border-l-4 border-l-pink-500">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-100 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/20 shadow-sm transition-transform group-hover:scale-105">
              <TrendingUp className="size-3.5 text-pink-600 dark:text-pink-400" />
            </div>
            <p className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest leading-tight">
              {t('salesman360.analytics.last12MonthsOrderAmount')}
            </p>
          </div>
          <p className="text-xl font-black mt-2 text-slate-900 dark:text-white tabular-nums pl-9">{formatter.format(s.last12MonthsOrderAmount ?? 0)}</p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/[0.03] shadow-sm overflow-hidden group">
        <CardContent className="pt-4 pb-3 px-5 border-l-4 border-l-orange-500">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 shadow-sm transition-transform group-hover:scale-105">
              <Zap className="size-3.5 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest leading-tight">
              {t('salesman360.analytics.openQuotationAmount')}
            </p>
          </div>
          <p className="text-xl font-black mt-2 text-slate-900 dark:text-white tabular-nums pl-9">{formatter.format(s.openQuotationAmount ?? 0)}</p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/[0.03] shadow-sm overflow-hidden group">
        <CardContent className="pt-4 pb-3 px-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 shadow-sm transition-transform group-hover:scale-105">
              <Coins className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest leading-tight">
              {t('salesman360.analytics.openOrderAmount')}
            </p>
          </div>
          <p className="text-xl font-black mt-2 text-slate-900 dark:text-white tabular-nums pl-9">{formatter.format(s.openOrderAmount ?? 0)}</p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/[0.03] shadow-sm overflow-hidden group">
        <CardContent className="pt-4 pb-3 px-5 border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 shadow-sm transition-transform group-hover:scale-105">
              <TrendingUp className="size-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest leading-tight">
              {t('salesman360.analytics.activityCount')}
            </p>
          </div>
          <p className="text-xl font-black mt-2 text-slate-900 dark:text-white tabular-nums pl-9">{s.activityCount ?? 0}</p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/[0.03] shadow-sm overflow-hidden group">
        <CardContent className="pt-4 pb-3 px-5 border-l-4 border-l-slate-400">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
              <History className="size-3.5 text-slate-600 dark:text-slate-400" />
            </div>
            <p className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest leading-tight">
              {t('salesman360.analytics.lastActivityDate')}
            </p>
          </div>
          <p className="text-xl font-black mt-2 text-slate-900 dark:text-white pl-9">{lastActivityDateFormatted}</p>
        </CardContent>
      </Card>
    </div>
  );
}
