import { type ReactElement, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useWarehouseBalancesByStockId } from '../hooks/useWarehouseBalancesByStockId';
import {
  formatWarehouseBalanceWithUnit,
  formatWarehouseSyncDate,
} from '../utils/format-warehouse-balance';
import type { WarehouseStockBalanceDto } from '../types';

interface StockWarehouseBalanceBadgeProps {
  stockId: number;
  unit?: string | null;
  balance?: number | null;
  balanceText?: string | null;
  className?: string;
}

function resolveBadgeTone(totalBalance: number): 'negative' | 'positive' {
  return totalBalance < 0 ? 'negative' : 'positive';
}

function badgeToneClasses(tone: 'negative' | 'positive'): string {
  if (tone === 'negative') {
    return 'border-red-300/80 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-500/45 dark:bg-red-950/35 dark:text-red-200 dark:hover:bg-red-950/50';
  }
  return 'border-emerald-300/80 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/45 dark:bg-emerald-950/35 dark:text-emerald-200 dark:hover:bg-emerald-950/50';
}

function panelToneClasses(tone: 'negative' | 'positive'): {
  border: string;
  headerBg: string;
  title: string;
  value: string;
  meta: string;
  tooltipBorder: string;
} {
  if (tone === 'positive') {
    return {
      border: 'border-emerald-100 dark:border-emerald-900/40',
      headerBg: 'bg-emerald-50/90 dark:bg-emerald-950/40',
      title: 'text-emerald-800/80 dark:text-emerald-300/80',
      value: 'text-emerald-900 dark:text-emerald-100',
      meta: 'text-emerald-700/90 dark:text-emerald-300/70',
      tooltipBorder: 'border-emerald-200/80 dark:border-emerald-900/50',
    };
  }
  return {
    border: 'border-red-100 dark:border-red-900/40',
    headerBg: 'bg-red-50/90 dark:bg-red-950/40',
    title: 'text-red-800/80 dark:text-red-300/80',
    value: 'text-red-900 dark:text-red-100',
    meta: 'text-red-700/90 dark:text-red-300/70',
    tooltipBorder: 'border-red-200/80 dark:border-red-900/50',
  };
}

export function StockWarehouseBalanceBadge({
  stockId,
  unit,
  balance,
  balanceText,
  className,
}: StockWarehouseBalanceBadgeProps): ReactElement | null {
  const { i18n } = useTranslation('common');
  const hasPrefetchedBalance = balance !== undefined && balance !== null;
  const { data: balances, isLoading, isError } = useWarehouseBalancesByStockId(stockId, !hasPrefetchedBalance);

  const rows = useMemo(() => balances ?? [], [balances]);
  const totalBalance = useMemo(
    () => (hasPrefetchedBalance ? Number(balance) || 0 : rows.reduce((sum, item) => sum + (Number(item.balance) || 0), 0)),
    [balance, hasPrefetchedBalance, rows],
  );
  const prefetchedLines = useMemo(
    () => (balanceText ?? '').split(',').map((line) => line.trim()).filter(Boolean),
    [balanceText],
  );
  const badgeTone = resolveBadgeTone(totalBalance);
  const panelTone = panelToneClasses(badgeTone);

  if (stockId <= 0) {
    return null;
  }

  if (!hasPrefetchedBalance && isLoading) {
    return <Skeleton className={cn('h-6 w-[5.5rem] rounded-full', className)} />;
  }

  if (!hasPrefetchedBalance && (isError || rows.length === 0)) {
    return null;
  }

  if (hasPrefetchedBalance && totalBalance === 0 && prefetchedLines.length === 0) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            'inline-flex w-fit max-w-full shrink-0 self-start whitespace-nowrap',
            'h-6 cursor-default px-2 py-0 text-[10px] font-bold tabular-nums shadow-sm',
            badgeToneClasses(badgeTone),
            className,
          )}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {formatWarehouseBalanceWithUnit(totalBalance, unit)}
        </Badge>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
        className={cn(
          'max-w-[min(92vw,20rem)] border bg-white p-0 text-zinc-900 shadow-lg dark:bg-zinc-950 dark:text-zinc-100',
          panelTone.tooltipBorder,
        )}
      >
        {hasPrefetchedBalance ? (
          <WarehouseBalanceSummaryTooltipPanel
            lines={prefetchedLines}
            totalBalance={totalBalance}
            unit={unit}
          />
        ) : (
          <WarehouseBalanceTooltipPanel
            balances={rows}
            totalBalance={totalBalance}
            unit={unit}
            locale={i18n.language}
          />
        )}
      </TooltipContent>
    </Tooltip>
  );
}

function WarehouseBalanceSummaryTooltipPanel({
  lines,
  totalBalance,
  unit,
}: {
  lines: string[];
  totalBalance: number;
  unit?: string | null;
}): ReactElement {
  const { t } = useTranslation('common');
  const badgeTone = resolveBadgeTone(totalBalance);
  const panelTone = panelToneClasses(badgeTone);

  return (
    <div className="min-w-[12rem]">
      <div className={cn('border-b px-3 py-2', panelTone.border, panelTone.headerBg)}>
        <p className={cn('text-[10px] font-bold uppercase tracking-wide', panelTone.title)}>
          {t('warehouseBalanceTooltip.totalLabel')}
        </p>
        <p className={cn('text-base font-bold tabular-nums', panelTone.value)}>
          {formatWarehouseBalanceWithUnit(totalBalance, unit)}
        </p>
        {lines.length > 0 ? (
          <p className={cn('text-[10px]', panelTone.meta)}>
            {t('warehouseBalanceTooltip.warehouseCount', { count: lines.length })}
          </p>
        ) : null}
      </div>
      {lines.length > 0 ? (
        <ul className="max-h-48 space-y-0 overflow-y-auto px-1 py-1.5">
          {lines.map((line, index) => (
            <li
              key={`${line}-${index}`}
              className="rounded-md px-2 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-white/5"
            >
              {line}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function WarehouseBalanceTooltipPanel({
  balances,
  totalBalance,
  unit,
  locale,
}: {
  balances: WarehouseStockBalanceDto[];
  totalBalance: number;
  unit?: string | null;
  locale: string;
}): ReactElement {
  const { t } = useTranslation('common');
  const latestSync = balances.reduce<string | null>((latest, row) => {
    if (!row.lastSyncDate) {
      return latest;
    }
    if (!latest) {
      return row.lastSyncDate;
    }
    return new Date(row.lastSyncDate).getTime() > new Date(latest).getTime() ? row.lastSyncDate : latest;
  }, null);
  const badgeTone = resolveBadgeTone(totalBalance);
  const panelTone = panelToneClasses(badgeTone);

  return (
    <div className="min-w-[12rem]">
      <div className={cn('border-b px-3 py-2', panelTone.border, panelTone.headerBg)}>
        <p className={cn('text-[10px] font-bold uppercase tracking-wide', panelTone.title)}>
          {t('warehouseBalanceTooltip.totalLabel')}
        </p>
        <p className={cn('text-base font-bold tabular-nums', panelTone.value)}>
          {formatWarehouseBalanceWithUnit(totalBalance, unit)}
        </p>
        <p className={cn('text-[10px]', panelTone.meta)}>
          {t('warehouseBalanceTooltip.warehouseCount', { count: balances.length })}
        </p>
      </div>
      <ul className="max-h-48 space-y-0 overflow-y-auto px-1 py-1.5">
        {balances.map((row) => {
          const warehouseLabel = row.warehouseName?.trim() || String(row.warehouseCode);
          const balance = Number(row.balance) || 0;
          const lineIsNegative = balance < 0;
          return (
            <li
              key={row.id}
              className="flex items-start justify-between gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-zinc-50 dark:hover:bg-white/5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-zinc-800 dark:text-zinc-100">{warehouseLabel}</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {t('warehouseBalanceTooltip.branch', { branch: row.branchCode })}
                </p>
              </div>
              <span
                className={cn(
                  'shrink-0 font-bold tabular-nums',
                  lineIsNegative
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-700 dark:text-emerald-300',
                )}
              >
                {formatWarehouseBalanceWithUnit(balance, unit)}
              </span>
            </li>
          );
        })}
      </ul>
      {latestSync ? (
        <div className="border-t border-zinc-100 px-3 py-1.5 text-[10px] text-zinc-500 dark:border-white/10 dark:text-zinc-400">
          {t('warehouseBalanceTooltip.lastSync', {
            date: formatWarehouseSyncDate(latestSync, locale),
          })}
        </div>
      ) : null}
    </div>
  );
}
