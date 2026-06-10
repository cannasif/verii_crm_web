import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { ApprovalStatus } from '../types/approval-types';
import { ApprovalStatus as ApprovalStatusEnum } from '../types/approval-types';
import { cn } from '@/lib/utils';

interface ApprovalStatusBadgeProps {
  status: ApprovalStatus;
  className?: string;
}

const STATUS_PILL_CLASS: Record<ApprovalStatus, string> = {
  [ApprovalStatusEnum.NotRequired]:
    'border-slate-400/30 bg-slate-500/10 text-slate-700 dark:border-slate-400/25 dark:bg-slate-500/15 dark:text-slate-300',
  [ApprovalStatusEnum.Waiting]:
    'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:border-amber-400/35 dark:bg-amber-500/15 dark:text-amber-200',
  [ApprovalStatusEnum.Approved]:
    'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-200',
  [ApprovalStatusEnum.Rejected]:
    'border-red-500/30 bg-red-500/10 text-red-800 dark:border-red-400/35 dark:bg-red-500/15 dark:text-red-200',
  [ApprovalStatusEnum.Closed]:
    'border-slate-400/30 bg-slate-500/10 text-slate-700 dark:border-slate-400/25 dark:bg-slate-500/15 dark:text-slate-300',
  [ApprovalStatusEnum.CustomerCancelled]:
    'border-rose-500/30 bg-rose-500/10 text-rose-800 dark:border-rose-400/35 dark:bg-rose-500/15 dark:text-rose-200',
};

export function ApprovalStatusBadge({ status, className }: ApprovalStatusBadgeProps): ReactElement {
  const { t } = useTranslation(['approval', 'common']);

  const statusLabels: Record<ApprovalStatus, string> = {
    [ApprovalStatusEnum.NotRequired]: t('status.notRequired'),
    [ApprovalStatusEnum.Waiting]: t('status.waiting'),
    [ApprovalStatusEnum.Approved]: t('status.approved'),
    [ApprovalStatusEnum.Rejected]: t('status.rejected'),
    [ApprovalStatusEnum.Closed]: t('status.closed'),
    [ApprovalStatusEnum.CustomerCancelled]: t('status.customerCancelled', { defaultValue: 'Müşteri tarafından iptal edildi' }),
  };

  const resolvedStatus = status in STATUS_PILL_CLASS ? status : ApprovalStatusEnum.Waiting;
  const pillClass = STATUS_PILL_CLASS[resolvedStatus];
  const label = statusLabels[resolvedStatus] ?? statusLabels[ApprovalStatusEnum.Waiting];

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center justify-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-tight',
        pillClass,
        className
      )}
    >
      {label}
    </span>
  );
}
