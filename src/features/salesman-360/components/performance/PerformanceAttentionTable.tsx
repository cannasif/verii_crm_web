import { type ReactElement } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Salesmen360AttentionItemDto } from '../../types/salesmen360.types';

interface PerformanceAttentionTableProps {
  items: Salesmen360AttentionItemDto[];
  locale: string;
}

function formatDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function PerformanceAttentionTable({
  items,
  locale,
}: PerformanceAttentionTableProps): ReactElement {
  const { t } = useTranslation();

  if (items.length === 0) {
    return (
      <div className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 text-emerald-600 dark:border-emerald-400/20 dark:bg-emerald-500/5">
        <CheckCircle2 className="size-8" />
        <p className="text-sm font-bold">{t('salesman360.performance.detail.attention.none')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/8">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80 dark:bg-white/3">
            <TableHead>{t('salesman360.performance.detail.attention.issue')}</TableHead>
            <TableHead>{t('salesman360.performance.salesman')}</TableHead>
            <TableHead>{t('salesman360.performance.detail.work.customer')}</TableHead>
            <TableHead>{t('salesman360.performance.detail.work.date')}</TableHead>
            <TableHead className="text-right">
              {t('salesman360.performance.detail.attention.age')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={`${item.kind}-${item.entityId}`}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                    <AlertTriangle className="size-4" />
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{item.title}</p>
                    <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-300">
                      {t(`salesman360.performance.detail.attention.kind.${item.kind}`)}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-semibold">{item.salesmanName}</TableCell>
              <TableCell>{item.customerName || '-'}</TableCell>
              <TableCell className="whitespace-nowrap text-xs">
                {formatDate(item.date, locale)}
              </TableCell>
              <TableCell className="text-right font-black tabular-nums text-amber-600">
                {t('salesman360.performance.detail.attention.days', { count: item.ageDays })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
