import { type ReactElement, useMemo, useState } from 'react';
import { BadgeDollarSign, ChartColumnBig } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRechartsModule } from '@/lib/useRechartsModule';
import { cn } from '@/lib/utils';
import type { Salesmen360SalesmanPerformanceDto } from '../../types/salesmen360.types';
import { PerformanceChartFrame } from './PerformanceChartFrame';

interface TeamSalesValuePanelProps {
  salesmen: Salesmen360SalesmanPerformanceDto[];
  locale: string;
}

function formatAmount(value: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  } catch {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value ?? 0)} ${currency}`;
  }
}

export function TeamSalesValuePanel({
  salesmen,
  locale,
}: TeamSalesValuePanelProps): ReactElement | null {
  const { t } = useTranslation();
  const currencies = useMemo(
    () =>
      Array.from(
        new Set(
          salesmen.flatMap((salesman) =>
            (salesman.financialsByCurrency ?? []).map((item) => item.currency)
          )
        )
      ).sort((left, right) => left.localeCompare(right)),
    [salesmen]
  );
  const [requestedCurrency, setRequestedCurrency] = useState<string>('');
  const selectedCurrency = currencies.includes(requestedCurrency)
    ? requestedCurrency
    : (currencies[0] ?? '');
  const chartData = useMemo(
    () =>
      salesmen
        .map((salesman) => {
          const financial = (salesman.financialsByCurrency ?? []).find(
            (item) => item.currency === selectedCurrency
          );
          return {
            userId: salesman.userId,
            fullName: salesman.fullName || salesman.email || String(salesman.userId),
            quotationAmount: financial?.quotationAmount ?? 0,
            orderAmount: financial?.orderAmount ?? 0,
            erpOrderAmount: financial?.erpOrderAmount ?? 0,
          };
        })
        .sort((left, right) => right.erpOrderAmount - left.erpOrderAmount || right.orderAmount - left.orderAmount)
        .slice(0, 12),
    [salesmen, selectedCurrency]
  );
  const hasData = chartData.some(
    (item) => item.quotationAmount > 0 || item.orderAmount > 0 || item.erpOrderAmount > 0
  );
  const Recharts = useRechartsModule(hasData);

  if (currencies.length === 0) return null;

  return (
    <div className="grid gap-5 2xl:grid-cols-5">
      <Card className="rounded-2xl border-slate-200/90 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/3 2xl:col-span-2">
        <CardHeader className="gap-3 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ChartColumnBig className="size-5 text-emerald-500" />
              {t('salesman360.performance.teamValueChartTitle')}
            </CardTitle>
            <div className="flex flex-wrap gap-1.5">
              {currencies.map((currency) => (
                <button
                  key={currency}
                  type="button"
                  onClick={() => setRequestedCurrency(currency)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-[11px] font-black transition-colors',
                    selectedCurrency === currency
                      ? 'border-primary bg-primary text-white'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-primary/40 dark:border-white/10 dark:bg-white/5'
                  )}
                >
                  {currency}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('salesman360.performance.teamValueChartDescription', { currency: selectedCurrency })}
          </p>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <div className="flex h-72 items-center justify-center text-sm font-medium text-slate-400">
              {t('common.noData')}
            </div>
          ) : !Recharts ? (
            <Skeleton className="h-72 rounded-xl" />
          ) : (
            <PerformanceChartFrame heightClassName="h-72">
              {({ width, height }) => (
                <Recharts.BarChart
                  width={width}
                  height={height}
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 42 }}
                >
                  <Recharts.CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    className="stroke-slate-100 dark:stroke-white/5"
                  />
                  <Recharts.XAxis
                    dataKey="fullName"
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-28}
                    textAnchor="end"
                    height={64}
                    tick={{ fontSize: 10 }}
                  />
                  <Recharts.YAxis
                    axisLine={false}
                    tickLine={false}
                    width={70}
                    tickFormatter={(value) =>
                      new Intl.NumberFormat(locale, {
                        notation: 'compact',
                        maximumFractionDigits: 1,
                      }).format(Number(value))
                    }
                  />
                  <Recharts.Tooltip
                    formatter={(value, name) => [
                      formatAmount(Number(value), selectedCurrency, locale),
                      String(name),
                    ]}
                  />
                  <Recharts.Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                  <Recharts.Bar
                    dataKey="quotationAmount"
                    name={t('salesman360.performance.value.quotation')}
                    fill="#6366f1"
                    radius={[5, 5, 0, 0]}
                  />
                  <Recharts.Bar
                    dataKey="orderAmount"
                    name={t('salesman360.performance.value.order')}
                    fill="#ec4899"
                    radius={[5, 5, 0, 0]}
                  />
                  <Recharts.Bar
                    dataKey="erpOrderAmount"
                    name={t('salesman360.performance.value.erpOrder')}
                    fill="#10b981"
                    radius={[5, 5, 0, 0]}
                  />
                </Recharts.BarChart>
              )}
            </PerformanceChartFrame>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-slate-200/90 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/3 2xl:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BadgeDollarSign className="size-5 text-emerald-500" />
            {t('salesman360.performance.teamValueMatrixTitle')}
          </CardTitle>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('salesman360.performance.teamValueMatrixDescription')}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[28rem] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white dark:bg-slate-950">
                <TableRow>
                  <TableHead className="min-w-44">{t('salesman360.performance.salesman')}</TableHead>
                  <TableHead className="min-w-40 text-right">
                    {t('salesman360.performance.teamCustomerSummary')}
                  </TableHead>
                  <TableHead className="min-w-44 text-right">
                    {t('salesman360.performance.teamQuotationSummary')}
                  </TableHead>
                  <TableHead className="min-w-40 text-right">
                    {t('salesman360.performance.teamOrderSummary')}
                  </TableHead>
                  {currencies.map((currency) => (
                    <TableHead key={currency} className="min-w-52 text-right">
                      {currency}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesmen.map((salesman) => (
                  <TableRow key={salesman.userId}>
                    <TableCell>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {salesman.fullName || salesman.email || salesman.userId}
                      </p>
                      {salesman.email ? <p className="text-[11px] text-slate-400">{salesman.email}</p> : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="space-y-0.5 text-[11px] tabular-nums">
                        <p>
                          {t('salesman360.performance.value.created')}:{' '}
                          <strong>{salesman.totalCustomers}</strong>
                        </p>
                        <p className="text-emerald-600 dark:text-emerald-300">
                          {t('salesman360.performance.value.erpCustomer')}:{' '}
                          <strong>{salesman.erpIntegratedCustomers}</strong>
                        </p>
                        <p className="text-violet-600 dark:text-violet-300">
                          {t('salesman360.performance.value.businessCard')}:{' '}
                          <strong>{salesman.businessCardCustomers}</strong>
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="space-y-0.5 text-[11px] tabular-nums">
                        <p>
                          {t('salesman360.performance.value.issued')}:{' '}
                          <strong>{salesman.totalQuotations}</strong>
                        </p>
                        <p className="text-pink-600 dark:text-pink-300">
                          {t('salesman360.performance.value.convertedToOrder')}:{' '}
                          <strong>{salesman.convertedQuotations}</strong>
                        </p>
                        <p className="text-emerald-600 dark:text-emerald-300">
                          {t('salesman360.performance.value.convertedToErp')}:{' '}
                          <strong>{salesman.erpConvertedQuotations}</strong>
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="space-y-0.5 text-[11px] tabular-nums">
                        <p>
                          {t('salesman360.performance.value.created')}:{' '}
                          <strong>{salesman.totalOrders}</strong>
                        </p>
                        <p className="text-emerald-600 dark:text-emerald-300">
                          {t('salesman360.performance.value.transferredToErp')}:{' '}
                          <strong>{salesman.erpIntegratedOrders}</strong>
                        </p>
                        <p className="text-slate-500">
                          {t('salesman360.performance.value.erpRate')}:{' '}
                          <strong>
                            %{new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
                              salesman.erpIntegrationRate ?? 0
                            )}
                          </strong>
                        </p>
                      </div>
                    </TableCell>
                    {currencies.map((currency) => {
                      const financial = (salesman.financialsByCurrency ?? []).find(
                        (item) => item.currency === currency
                      );
                      return (
                        <TableCell key={currency} className="text-right">
                          <div className="space-y-0.5 text-[11px] tabular-nums">
                            <p className="text-indigo-600 dark:text-indigo-300">
                              {t('salesman360.performance.value.quotationShort')}:{' '}
                              <strong>{formatAmount(financial?.quotationAmount ?? 0, currency, locale)}</strong>
                            </p>
                            <p className="text-pink-600 dark:text-pink-300">
                              {t('salesman360.performance.value.orderShort')}:{' '}
                              <strong>{formatAmount(financial?.orderAmount ?? 0, currency, locale)}</strong>
                            </p>
                            <p className="text-emerald-600 dark:text-emerald-300">
                              {t('salesman360.performance.value.erpShort')}:{' '}
                              <strong>{formatAmount(financial?.erpOrderAmount ?? 0, currency, locale)}</strong>
                            </p>
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
