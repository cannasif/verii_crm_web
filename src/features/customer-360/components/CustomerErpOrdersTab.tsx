import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import { ChevronLeft, ChevronRight, Loader2, Package, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { exportGridToExcel } from '@/lib/grid-export';
import { useErpOrderLines } from '@/features/order/hooks/useErpOrders';
import type { NetsisOrderHeader, NetsisOrderLine } from '@/features/order/types/erp-order-types';
import { useMyPermissionsQuery } from '@/features/access-control/hooks/useMyPermissionsQuery';
import { hasPermission } from '@/features/access-control/utils/hasPermission';
import { useCustomerErpOrders } from '../hooks/useCustomerErpOrders';
import { paginateClient } from '../utils/erp-order-customer-filter';
import {
  buildErpOrderExportColumns,
  buildErpOrderExportRows,
  sanitizeCustomer360ExportFileName,
} from '../utils/customer-360-table-export';
import { Customer360ExcelExportButton } from './Customer360ExcelExportButton';
import {
  CUSTOMER_360_ICON_CHIP_CLASS,
  CUSTOMER_360_RELATED_CARD_CLASS,
} from '../utils/customer-360-card-styles';

const PAGE_SIZE = 20;

interface CustomerErpOrdersTabProps {
  customerId: number;
  customerCode?: string | null;
}

function formatNumber(value: number | null | undefined, locale: string): string {
  if (value == null || !Number.isFinite(Number(value))) return '-';
  return new Intl.NumberFormat(locale || 'tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatDate(language: string, value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(language);
}

function ErpOrderLinesTable({
  rows,
  isLoading,
  emptyText,
  loadingText,
  locale,
}: {
  rows: NetsisOrderLine[];
  isLoading: boolean;
  emptyText: string;
  loadingText: string;
  locale: string;
}): ReactElement {
  const { t } = useTranslation('order');

  return (
    <div className="overflow-x-auto rounded-lg border border-border/70">
      <Table className="min-w-[900px] text-[13px]">
        <TableHeader>
          <TableRow className="border-border/60 hover:bg-transparent">
            <TableHead>{t('erpOrder.lines.rowNo')}</TableHead>
            <TableHead>{t('erpOrder.lines.stockCode')}</TableHead>
            <TableHead>{t('erpOrder.lines.stockName')}</TableHead>
            <TableHead className="text-right">{t('erpOrder.lines.quantity')}</TableHead>
            <TableHead>{t('erpOrder.lines.unit')}</TableHead>
            <TableHead className="text-right">{t('erpOrder.lines.netPrice')}</TableHead>
            <TableHead className="text-right">{t('erpOrder.lines.vatRate')}</TableHead>
            <TableHead className="text-center">{t('erpOrder.lines.warehouseCode')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                {loadingText}
              </TableCell>
            </TableRow>
          )}
          {!isLoading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                {emptyText}
              </TableCell>
            </TableRow>
          )}
          {!isLoading &&
            rows.map((line) => (
              <TableRow key={`${line.fatirsNo}-${line.sira}-${line.stokKodu}`}>
                <TableCell className="font-medium">{line.sira || '-'}</TableCell>
                <TableCell className="font-mono text-xs">{line.stokKodu || '-'}</TableCell>
                <TableCell className="min-w-[220px] font-medium">{line.stokAdi || '-'}</TableCell>
                <TableCell className="text-right">{formatNumber(line.miktar, locale)}</TableCell>
                <TableCell>{line.olcuBr1 || '-'}</TableCell>
                <TableCell className="text-right">{formatNumber(line.netFiyat, locale)}</TableCell>
                <TableCell className="text-right">{formatNumber(line.kdvOrani, locale)}</TableCell>
                <TableCell className="text-center">{line.depoKodu || '-'}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Pager({
  pageNumber,
  totalPages,
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
}: {
  pageNumber: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
}): ReactElement | null {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-end gap-2">
      <Button type="button" variant="outline" size="sm" disabled={pageNumber <= 1} onClick={onPrev}>
        <ChevronLeft className="h-4 w-4" />
        {prevLabel}
      </Button>
      <span className="text-xs text-muted-foreground">
        {pageNumber} / {totalPages}
      </span>
      <Button type="button" variant="outline" size="sm" disabled={pageNumber >= totalPages} onClick={onNext}>
        {nextLabel}
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function CustomerErpOrdersTab({ customerId, customerCode }: CustomerErpOrdersTabProps): ReactElement | null {
  const { t, i18n } = useTranslation(['customer360', 'order', 'common']);
  const tc = (key: string, opts?: Record<string, unknown>) => t(key, { ns: 'customer360', ...opts });
  const { data: permissions } = useMyPermissionsQuery();
  const canViewErpOrders = hasPermission(permissions, 'sales.erp-orders.view');

  const [pageNumber, setPageNumber] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<NetsisOrderHeader | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const exportColumns = useMemo(() => buildErpOrderExportColumns(tc), [tc]);

  const { orders, normalizedCode, skipped, isLoading, isError, error, refetch, isFetching } =
    useCustomerErpOrders({
      customerCode,
      canViewErpOrders,
    });

  useEffect(() => {
    setPageNumber(1);
    setSelectedOrder(null);
  }, [customerCode, normalizedCode]);

  const handleExportExcel = useCallback(async (): Promise<void> => {
    if (isExporting || orders.length === 0) return;
    setIsExporting(true);
    try {
      await exportGridToExcel({
        fileName: sanitizeCustomer360ExportFileName('erp-siparisler', customerId, normalizedCode ?? customerCode),
        columns: exportColumns,
        rows: buildErpOrderExportRows(orders, i18n.language),
      });
    } finally {
      setIsExporting(false);
    }
  }, [customerCode, customerId, exportColumns, i18n.language, isExporting, normalizedCode, orders]);

  const paged = useMemo(
    () => paginateClient(orders, pageNumber, PAGE_SIZE),
    [orders, pageNumber]
  );

  const selectedFatirsNo =
    selectedOrder && orders.some((row) => row.fatirsNo === selectedOrder.fatirsNo)
      ? selectedOrder.fatirsNo
      : null;

  const lineQuery = useErpOrderLines(selectedFatirsNo);

  if (!canViewErpOrders) {
    return null;
  }

  const headCellClass = 'h-9 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground';
  const cellClass = 'px-3 py-2.5 align-middle';
  const rowClass =
    'cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-muted/50';

  return (
    <div className="space-y-4">
      <Card className={CUSTOMER_360_RELATED_CARD_CLASS}>
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm font-semibold">
              <span className={CUSTOMER_360_ICON_CHIP_CLASS}>
                <Package className="h-4 w-4" />
              </span>
              {tc('erpOrders.title')}
              {orders.length > 0 && (
                <Badge variant="secondary" className="rounded-full">
                  {orders.length}
                </Badge>
              )}
            </div>
            {normalizedCode && skipped !== 'forbidden' && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {normalizedCode}
                </Badge>
                <Customer360ExcelExportButton
                  disabled={orders.length === 0}
                  isExporting={isExporting}
                  onClick={() => void handleExportExcel()}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2"
                  disabled={isFetching}
                  onClick={() => void refetch()}
                >
                  {isFetching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {t('refresh', { ns: 'common' })}
                </Button>
              </div>
            )}
          </div>

          {skipped === 'no-cari' && (
            <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              {tc('erpOrders.noCariCode')}
            </div>
          )}

          {skipped === 'forbidden' && (
            <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              {tc('erpOrders.forbidden')}
            </div>
          )}

          {skipped === null && isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, idx) => (
                <Skeleton key={idx} className="h-11 w-full rounded-lg" />
              ))}
            </div>
          )}

          {skipped === null && isError && (
            <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              {isAxiosError(error) && error.message
                ? error.message
                : tc('erpOrders.error')}
            </div>
          )}

          {skipped === null && !isLoading && !isError && orders.length === 0 && (
            <div className="space-y-2">
              <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                {tc('erpOrders.empty')}
              </div>
              <p className="text-center text-xs text-muted-foreground">{tc('erpOrders.scopeHint')}</p>
            </div>
          )}

          {skipped === null && !isLoading && !isError && paged.data.length > 0 && (
            <>
              <div className="overflow-x-auto rounded-lg border border-border/70">
                <Table className="min-w-[960px] text-[13px]">
                  <TableHeader>
                    <TableRow className="border-border/60 hover:bg-transparent">
                      <TableHead className={cn(headCellClass, 'text-center')}>{tc('erpOrders.columns.branch')}</TableHead>
                      <TableHead className={headCellClass}>{tc('erpOrders.columns.orderNo')}</TableHead>
                      <TableHead className={headCellClass}>{tc('erpOrders.columns.date')}</TableHead>
                      <TableHead className={headCellClass}>{tc('erpOrders.columns.deliveryDate')}</TableHead>
                      <TableHead className={cn(headCellClass, 'text-right')}>{tc('erpOrders.columns.gross')}</TableHead>
                      <TableHead className={cn(headCellClass, 'text-right')}>{tc('erpOrders.columns.vat')}</TableHead>
                      <TableHead className={cn(headCellClass, 'text-right')}>{tc('erpOrders.columns.total')}</TableHead>
                      <TableHead className={headCellClass}>{tc('erpOrders.columns.salesRep')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.data.map((row) => (
                      <TableRow
                        key={row.fatirsNo}
                        className={cn(
                          rowClass,
                          selectedOrder?.fatirsNo === row.fatirsNo && 'bg-emerald-50/70 dark:bg-emerald-500/10'
                        )}
                        onClick={() => setSelectedOrder(row)}
                      >
                        <TableCell className={cn(cellClass, 'text-center font-medium')}>{row.subeKodu ?? '-'}</TableCell>
                        <TableCell className={cn(cellClass, 'font-mono text-xs font-semibold')}>{row.fatirsNo || '-'}</TableCell>
                        <TableCell className={cn(cellClass, 'text-muted-foreground')}>{formatDate(i18n.language, row.tarih)}</TableCell>
                        <TableCell className={cn(cellClass, 'text-muted-foreground')}>{formatDate(i18n.language, row.teslimTarihi)}</TableCell>
                        <TableCell className={cn(cellClass, 'text-right tabular-nums')}>{formatNumber(row.brutTutar, i18n.language)}</TableCell>
                        <TableCell className={cn(cellClass, 'text-right tabular-nums')}>{formatNumber(row.kdv, i18n.language)}</TableCell>
                        <TableCell className={cn(cellClass, 'text-right font-semibold tabular-nums')}>{formatNumber(row.genelToplam, i18n.language)}</TableCell>
                        <TableCell className={cn(cellClass, 'text-muted-foreground')}>{row.plasiyerKodu || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pager
                pageNumber={pageNumber}
                totalPages={paged.totalPages}
                onPrev={() => setPageNumber((p) => Math.max(1, p - 1))}
                onNext={() => setPageNumber((p) => Math.min(paged.totalPages, p + 1))}
                prevLabel={t('previous', { ns: 'common' })}
                nextLabel={t('next', { ns: 'common' })}
              />
            </>
          )}
        </CardContent>
      </Card>

      {selectedOrder && selectedFatirsNo && (
        <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-lg font-bold">
                  {t('erpOrder.detailTitle', { ns: 'order', orderNo: selectedOrder.fatirsNo })}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedOrder.cariKodu} — {selectedOrder.cariIsim || t('erpOrder.unknownCustomer', { ns: 'order' })}
                </p>
              </div>
              <Badge variant="secondary" className="w-fit">
                {t('erpOrder.lineCount', { ns: 'order', count: lineQuery.data?.length ?? 0 })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                [t('erpOrder.table.branchCode', { ns: 'order' }), selectedOrder.subeKodu],
                [t('erpOrder.table.date', { ns: 'order' }), formatDate(i18n.language, selectedOrder.tarih)],
                [t('erpOrder.table.deliveryDate', { ns: 'order' }), formatDate(i18n.language, selectedOrder.teslimTarihi)],
                [t('erpOrder.table.salesRepCode', { ns: 'order' }), selectedOrder.plasiyerKodu || '-'],
                [t('erpOrder.table.grandTotal', { ns: 'order' }), formatNumber(selectedOrder.genelToplam, i18n.language)],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-xl border border-border/60 bg-muted/20 p-3"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
                  <div className="mt-1 truncate text-sm font-bold">{value}</div>
                </div>
              ))}
            </div>

            <ErpOrderLinesTable
              rows={lineQuery.data ?? []}
              isLoading={lineQuery.isLoading || lineQuery.isFetching}
              emptyText={
                lineQuery.isError
                  ? t('erpOrder.lineLoadError', { ns: 'order' })
                  : t('erpOrder.noLines', { ns: 'order' })
              }
              loadingText={t('erpOrder.linesLoading', { ns: 'order' })}
              locale={i18n.language}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function useCanViewCustomerErpOrders(): boolean {
  const { data: permissions } = useMyPermissionsQuery();
  return hasPermission(permissions, 'sales.erp-orders.view');
}
