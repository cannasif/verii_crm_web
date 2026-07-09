import { type ReactElement, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { exportGridToExcel } from '@/lib/grid-export';
import type { Salesmen360AmountComparisonDto } from '../types/salesmen360.types';
import { FileSearch, LineChart } from 'lucide-react';
import { Salesmen360ExcelExportButton } from './Salesmen360ExcelExportButton';
import {
  buildSalesmenAmountComparisonExportColumns,
  buildSalesmenAmountComparisonExportRows,
  sanitizeSalesmen360ExportFileName,
} from '../utils/salesmen-360-table-export';

interface SalesmenAmountComparisonByCurrencyTableProps {
  rows: Salesmen360AmountComparisonDto[];
  isLoading: boolean;
  userId: number;
}

export function SalesmenAmountComparisonByCurrencyTable({
  rows,
  isLoading,
  userId,
}: SalesmenAmountComparisonByCurrencyTableProps): ReactElement {
  const { t, i18n } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(i18n.resolvedLanguage ?? i18n.language, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [i18n.resolvedLanguage, i18n.language]
  );
  const exportColumns = useMemo(() => buildSalesmenAmountComparisonExportColumns(t), [t]);
  const exportRows = useMemo(() => buildSalesmenAmountComparisonExportRows(rows), [rows]);

  const handleExportExcel = useCallback(async (): Promise<void> => {
    if (isExporting || exportRows.length === 0) return;
    setIsExporting(true);
    try {
      await exportGridToExcel({
        fileName: sanitizeSalesmen360ExportFileName('tutar-karsilastirmasi', userId),
        columns: exportColumns,
        rows: exportRows,
      });
    } finally {
      setIsExporting(false);
    }
  }, [exportColumns, exportRows, isExporting, userId]);

  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-slate-200 bg-white/50 dark:border-white/10 dark:bg-white/2 p-1 shadow-sm">
        <CardHeader className="px-5 pt-4">
          <Skeleton className="h-5 w-48 rounded-lg" />
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <Skeleton className="h-32 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (!rows?.length) {
    return (
      <Card className="rounded-2xl border border-slate-200 bg-white/80 p-2 dark:border-white/10 dark:bg-white/3 shadow-sm">
        <CardHeader className="px-5 pt-4">
          <CardTitle className="text-base font-bold text-slate-800 dark:text-white">
            {t('salesman360.analyticsCharts.amountComparisonTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-slate-400 gap-3">
          <FileSearch className="size-8 opacity-20" />
          <p className="text-sm font-medium">{t('common.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/3 shadow-sm overflow-hidden h-full group">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 pb-2.5 pt-1 dark:border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 shadow-sm transition-transform group-hover:scale-105">
            <LineChart className="size-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="text-base font-bold text-slate-800 dark:text-white">
            {t('salesman360.analyticsCharts.amountComparisonTitle')}
          </span>
        </div>
        <Salesmen360ExcelExportButton
          disabled={exportRows.length === 0}
          isExporting={isExporting}
          onClick={() => void handleExportExcel()}
        />
      </div>
      <CardContent className="p-0">
        <div className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="dark:bg-[#231A2C] border-b-0">
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white h-10 border-r border-slate-100 dark:border-white/5 pl-5">{t('salesman360.currencyTotals.currency')}</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white h-10 border-r border-slate-100 dark:border-white/5">
                  {t('salesman360.analyticsCharts.last12MonthsOrderAmount')}
                </TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white h-10 border-r border-slate-100 dark:border-white/5">
                  {t('salesman360.analyticsCharts.openQuotationAmount')}
                </TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white h-10 pr-5">
                  {t('salesman360.analyticsCharts.openOrderAmount')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={row.currency ?? `amount-${idx}`} className="hover:bg-accent/30 dark:hover:bg-accent/5 transition-colors border-b border-slate-50 dark:border-white/5 last:border-0">
                  <TableCell className="font-bold text-slate-700 dark:text-white border-r border-slate-100 dark:border-white/5 pl-5">{row.currency ?? '-'}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium border-r border-slate-100 dark:border-white/5">
                    {formatter.format(row.last12MonthsOrderAmount ?? 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium border-r border-slate-100 dark:border-white/5">
                    {formatter.format(row.openQuotationAmount ?? 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium pr-5">
                    {formatter.format(row.openOrderAmount ?? 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
