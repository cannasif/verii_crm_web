import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Archive,
  Ban,
  CheckCircle2,
  CircleDashed,
  Clock3,
  FilePenLine,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { ApprovalStatus } from '@/features/approval/types/approval-types';
import { ApprovalStatus as ApprovalStatusEnum } from '@/features/approval/types/approval-types';
import { getApprovalStatusTranslationKey } from '@/features/approval/utils/approval-status-key';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface StatusIconConfig {
  Icon: LucideIcon;
  buttonClass: string;
  iconClass: string;
}

const STATUS_ICON_CONFIG: Record<ApprovalStatus, StatusIconConfig> = {
  [ApprovalStatusEnum.NotRequired]: {
    Icon: FilePenLine,
    buttonClass: 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
    iconClass: 'text-slate-500 dark:text-slate-400',
  },
  [ApprovalStatusEnum.Waiting]: {
    Icon: Clock3,
    buttonClass: 'hover:bg-amber-50 dark:hover:bg-amber-500/10 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  [ApprovalStatusEnum.Approved]: {
    Icon: CheckCircle2,
    buttonClass: 'hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },
  [ApprovalStatusEnum.Rejected]: {
    Icon: XCircle,
    buttonClass: 'hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300',
    iconClass: 'text-red-600 dark:text-red-400',
  },
  [ApprovalStatusEnum.Closed]: {
    Icon: Archive,
    buttonClass: 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
    iconClass: 'text-slate-500 dark:text-slate-400',
  },
  [ApprovalStatusEnum.CustomerCancelled]: {
    Icon: Ban,
    buttonClass: 'hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300',
    iconClass: 'text-red-600 dark:text-red-400',
  },
  [ApprovalStatusEnum.SalespersonClosedForRevision]: {
    Icon: Archive,
    buttonClass: 'hover:bg-orange-50 dark:hover:bg-orange-500/10 text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300',
    iconClass: 'text-orange-600 dark:text-orange-400',
  },
  [ApprovalStatusEnum.SupersededByApprovedRevision]: {
    Icon: Archive,
    buttonClass: 'hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300',
    iconClass: 'text-indigo-600 dark:text-indigo-400',
  },
};

interface DocumentListIdCellProps {
  id: number;
  status: ApprovalStatus | null;
  cancellationReason?: string | null;
}

export function DocumentListIdCell({
  id,
  status,
  cancellationReason,
}: DocumentListIdCellProps): ReactElement {
  const { t } = useTranslation(['approval', 'common']);

  const resolvedStatus = status != null && status in STATUS_ICON_CONFIG ? status : null;
  const config =
    resolvedStatus != null
      ? STATUS_ICON_CONFIG[resolvedStatus]
      : {
          Icon: CircleDashed,
          buttonClass: 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:text-slate-500',
          iconClass: 'text-slate-400 dark:text-slate-500',
        };

  const statusKey = resolvedStatus != null ? getApprovalStatusTranslationKey(resolvedStatus) : null;
  const statusLabel =
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
      : t('documentList.statusUnknown', { ns: 'common', defaultValue: 'Durum bilinmiyor' });

  const trimmedReason = cancellationReason?.trim();
  const tooltipText =
    resolvedStatus === ApprovalStatusEnum.CustomerCancelled && trimmedReason
      ? `${statusLabel} — ${trimmedReason}`
      : statusLabel;

  const { Icon } = config;

  return (
    <div className="flex w-full items-center justify-center gap-1.5">
      <span className="tabular-nums leading-none font-medium">{id}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            data-skip-row-double-click
            data-no-drag-scroll="true"
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors sm:h-7 sm:w-7',
              config.buttonClass
            )}
            aria-label={statusLabel}
          >
            <Icon className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4', config.iconClass)} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" align="start" className="max-w-xs">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
