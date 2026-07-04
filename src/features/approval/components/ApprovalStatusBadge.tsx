import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { ApprovalStatus } from '../types/approval-types';
import { ApprovalStatus as ApprovalStatusEnum } from '../types/approval-types';
import { getApprovalStatusTranslationKey } from '../utils/approval-status-key';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ApprovalStatusBadgeProps {
  status: ApprovalStatus;
  cancellationReason?: string | null;
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
    'border-primary/30 bg-accent/10 text-primary dark:border-primary/40 dark:bg-accent/15 dark:text-primary',
  [ApprovalStatusEnum.SalespersonClosedForRevision]:
    'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:border-amber-400/35 dark:bg-amber-500/15 dark:text-amber-200',
  [ApprovalStatusEnum.SupersededByApprovedRevision]:
    'border-indigo-500/30 bg-indigo-500/10 text-indigo-800 dark:border-indigo-400/35 dark:bg-indigo-500/15 dark:text-indigo-200',
};

export function ApprovalStatusBadge({
  status,
  cancellationReason,
  className,
}: ApprovalStatusBadgeProps): ReactElement {
  const { t } = useTranslation(['approval', 'common']);

  const resolvedStatus = status in STATUS_PILL_CLASS ? status : ApprovalStatusEnum.Waiting;
  const pillClass = STATUS_PILL_CLASS[resolvedStatus];
  const statusKey = getApprovalStatusTranslationKey(resolvedStatus);
  const label =
    statusKey != null
      ? t(`status.${statusKey}`, {
          defaultValue:
            resolvedStatus === ApprovalStatusEnum.CustomerCancelled
              ? 'Müşteri tarafından iptal edildi'
              : resolvedStatus === ApprovalStatusEnum.SalespersonClosedForRevision
                ? 'ERP kaydı revizyon için plasiyer tarafından kapatıldı'
                : resolvedStatus === ApprovalStatusEnum.SupersededByApprovedRevision
                  ? 'Onaylanan revizyon nedeniyle kapatıldı'
              : undefined,
        })
      : t('status.waiting');

  const badge = (
    <span
      className={cn(
        'inline-flex min-w-[11.5rem] h-7 items-center justify-center rounded-full border px-2 text-[11px] font-medium leading-none text-center',
        pillClass,
        className
      )}
    >
      {label}
    </span>
  );

  const trimmedReason = cancellationReason?.trim();
  if (resolvedStatus === ApprovalStatusEnum.CustomerCancelled && trimmedReason) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-default">{badge}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {trimmedReason}
        </TooltipContent>
      </Tooltip>
    );
  }

  return badge;
}
