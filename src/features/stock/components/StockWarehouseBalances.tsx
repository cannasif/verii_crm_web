import { type ReactElement, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, Package, Warehouse } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWarehouseBalancesByStockId } from '../hooks/useWarehouseBalancesByStockId';
import {
  formatWarehouseBalanceWithUnit,
  formatWarehouseSyncDate,
} from '../utils/format-warehouse-balance';
import type { WarehouseStockBalanceDto } from '../types';

interface StockWarehouseBalancesProps {
  stockId: number;
  unit?: string | null;
}

export function StockWarehouseBalances({ stockId, unit }: StockWarehouseBalancesProps): ReactElement {
  const { t, i18n } = useTranslation('stock');
  const { data: balances, isLoading, isError, error } = useWarehouseBalancesByStockId(stockId);

  const rows = useMemo(() => balances ?? [], [balances]);
  const totalBalance = useMemo(
    () => rows.reduce((sum, item) => sum + (Number(item.balance) || 0), 0),
    [rows],
  );

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
          <Warehouse className="w-4 h-4" />
        </div>
        {t('detail.warehouseBalances.title')}
      </h4>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ) : null}

      {!isLoading && isError ? (
        <Alert variant="destructive" className="border-red-200/80 bg-red-50/90 dark:border-red-900/50 dark:bg-red-950/30">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('detail.warehouseBalances.loadErrorTitle')}</AlertTitle>
          <AlertDescription className="text-xs">
            {error?.message || t('detail.warehouseBalances.loadErrorDesc')}
          </AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && !isError && rows.length === 0 ? (
        <Alert className="border-amber-200/80 bg-amber-50/90 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100">
          <Package className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">{t('detail.warehouseBalances.emptyTitle')}</AlertTitle>
          <AlertDescription className="text-xs leading-relaxed opacity-90">
            {t('detail.warehouseBalances.emptyDesc')}
          </AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && !isError && rows.length > 0 ? (
        <>
          <div
            className={cn(
              'rounded-xl border px-4 py-3',
              totalBalance < 0
                ? 'border-red-300/70 bg-red-50 dark:border-red-500/35 dark:bg-red-950/25'
                : 'border-emerald-300/70 bg-emerald-50 dark:border-emerald-500/35 dark:bg-emerald-950/25',
            )}
          >
            <p
              className={cn(
                'text-[10px] font-bold uppercase tracking-wider',
                totalBalance < 0
                  ? 'text-red-800/80 dark:text-red-300/80'
                  : 'text-emerald-800/80 dark:text-emerald-300/80',
              )}
            >
              {t('detail.warehouseBalances.totalLabel')}
            </p>
            <p
              className={cn(
                'mt-0.5 text-2xl font-bold tabular-nums',
                totalBalance < 0 ? 'text-red-800 dark:text-red-200' : 'text-emerald-800 dark:text-emerald-200',
              )}
            >
              {formatWarehouseBalanceWithUnit(totalBalance, unit)}
            </p>
            <p
              className={cn(
                'mt-1 text-[11px]',
                totalBalance < 0
                  ? 'text-red-700/90 dark:text-red-300/70'
                  : 'text-emerald-700/90 dark:text-emerald-300/70',
              )}
            >
              {t('detail.warehouseBalances.warehouseCount', { count: rows.length })}
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/40 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-200 dark:border-white/10 hover:bg-transparent">
                  <TableHead className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    {t('detail.warehouseBalances.colWarehouse')}
                  </TableHead>
                  <TableHead className="w-20 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    {t('detail.warehouseBalances.colBranch')}
                  </TableHead>
                  <TableHead className="w-28 text-right text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    {t('detail.warehouseBalances.colBalance')}
                  </TableHead>
                  <TableHead className="hidden w-36 text-right text-[10px] font-bold uppercase tracking-wide text-zinc-500 sm:table-cell">
                    {t('detail.warehouseBalances.colLastSync')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <WarehouseBalanceRow key={row.id} row={row} unit={unit} locale={i18n.language} />
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : null}
    </div>
  );
}

function WarehouseBalanceRow({
  row,
  unit,
  locale,
}: {
  row: WarehouseStockBalanceDto;
  unit?: string | null;
  locale: string;
}): ReactElement {
  const warehouseLabel = row.warehouseName?.trim() || String(row.warehouseCode);
  const balance = Number(row.balance) || 0;

  return (
    <TableRow className="border-zinc-100 dark:border-white/5">
      <TableCell className="py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{warehouseLabel}</p>
          <p className="truncate font-mono text-[10px] text-zinc-500 dark:text-zinc-400">{row.erpStockCode}</p>
        </div>
      </TableCell>
      <TableCell className="py-2.5 font-mono text-xs text-zinc-600 dark:text-zinc-300">{row.branchCode}</TableCell>
      <TableCell
        className={cn(
          'py-2.5 text-right text-sm font-bold tabular-nums',
          balance > 0
            ? 'text-emerald-700 dark:text-emerald-300'
            : balance < 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-zinc-500 dark:text-zinc-400',
        )}
      >
        {formatWarehouseBalanceWithUnit(balance, unit)}
      </TableCell>
      <TableCell className="hidden py-2.5 text-right text-[10px] text-zinc-500 dark:text-zinc-400 sm:table-cell">
        {formatWarehouseSyncDate(row.lastSyncDate, locale)}
      </TableCell>
    </TableRow>
  );
}
