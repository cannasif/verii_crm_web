import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { SalesPlanStatus } from '../types/sales-planning.types';
import { getStatusKey } from '../utils/sales-planning-options';

const STATUS_STYLES: Record<SalesPlanStatus, string> = {
  [SalesPlanStatus.Draft]: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
  [SalesPlanStatus.Submitted]: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
  [SalesPlanStatus.Approved]: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
  [SalesPlanStatus.Locked]: 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200',
};

export function SalesPlanStatusBadge({ status }: { status: SalesPlanStatus }) {
  const { t } = useTranslation('sales-planning');
  return (
    <Badge variant="outline" className={cn('rounded-md px-2 py-1 text-xs font-semibold', STATUS_STYLES[status])}>
      {t(`status.${getStatusKey(status)}`)}
    </Badge>
  );
}
