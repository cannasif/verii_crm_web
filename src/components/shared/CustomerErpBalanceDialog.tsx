import type { ReactElement } from 'react';
import { AlertCircle, Banknote, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useCustomer360ErpBalanceQuery } from '@/features/customer-360/hooks/useCustomer360';
import { formatSystemNumber } from '@/lib/system-settings';
import { cn } from '@/lib/utils';

interface CustomerErpBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: number | null;
  erpCustomerCode?: string | null;
  customerName?: string | null;
}

export function CustomerErpBalanceDialog({ open, onOpenChange, customerId, erpCustomerCode, customerName }: CustomerErpBalanceDialogProps): ReactElement {
  const { t } = useTranslation(['customer360', 'common']);
  const trimmedErpCode = erpCustomerCode?.trim() ?? '';
  const queryCustomerId = open && customerId && customerId > 0 && trimmedErpCode ? customerId : 0;
  const { data, isError, isLoading, isFetching } = useCustomer360ErpBalanceQuery(queryCustomerId);

  const formatNumber = (value?: number | null): string =>
    formatSystemNumber(value ?? 0, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const cards = [
    {
      key: 'debit',
      title: t('erpMovements.summary.totalDebit', { ns: 'customer360', defaultValue: 'Toplam Borç' }),
      value: formatNumber(data?.toplamBorc),
    },
    {
      key: 'credit',
      title: t('erpMovements.summary.totalCredit', { ns: 'customer360', defaultValue: 'Toplam Alacak' }),
      value: formatNumber(data?.toplamAlacak),
    },
    {
      key: 'balance',
      title: `${t('erpMovements.summary.balance', { ns: 'customer360', defaultValue: 'Bakiye' })} · ${data?.bakiyeDurumu ?? t('erpMovements.summary.closed', { ns: 'customer360', defaultValue: 'Kapalı' })}`,
      value: formatNumber(data?.bakiyeTutari),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-4xl rounded-2xl border-zinc-200 bg-white p-0 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 lg:max-w-4xl">
        <DialogHeader className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-zinc-950 dark:text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Banknote className="h-4 w-4" />
            </span>
            {t('balanceDialog.title', {
              ns: 'customer360',
              defaultValue: 'Cari Bakiye Özeti',
            })}
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400">
            {customerName ? `${customerName} · ` : ''}
            {trimmedErpCode}
            {isFetching && !isLoading ? <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin align-[-2px]" /> : null}
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-5">
          {isLoading ? (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-3">
              {cards.map((card) => (
                <div key={card.key} className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                  <Skeleton className="mb-5 h-4 w-32" />
                  <Skeleton className="h-10 w-28" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {t('balanceDialog.error', {
                  ns: 'customer360',
                  defaultValue: 'ERP bakiye özeti yüklenemedi.',
                })}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-3">
              {cards.map((card) => (
                <div
                  key={card.key}
                  className={cn(
                    'min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-[#111827] p-4 shadow-sm dark:border-zinc-800 dark:bg-[#0f172a]',
                    card.key === 'balance' && 'ring-1 ring-emerald-500/20'
                  )}
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{card.title}</div>
                  <div className="mt-4 whitespace-nowrap font-mono text-2xl font-bold leading-none tabular-nums text-white sm:text-[clamp(1.35rem,2.2vw,2.25rem)]">
                    {card.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
