import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import type { ApprovalStatus } from '../types/approval-types';
import { ApprovalStatus as ApprovalStatusEnum } from '../types/approval-types';

interface ApprovalStatusBadgeProps {
  status: ApprovalStatus;
}

export function ApprovalStatusBadge({ status }: ApprovalStatusBadgeProps): ReactElement {
  const { t } = useTranslation();

  const statusConfig: Record<ApprovalStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
    [ApprovalStatusEnum.NotRequired]: {
      label: t('approval.status.notRequired'),
      variant: 'secondary',
      className: undefined,
    },
    [ApprovalStatusEnum.Waiting]: {
      label: t('approval.status.waiting'),
      variant: 'default',
      className: undefined,
    },
    [ApprovalStatusEnum.Approved]: {
      label: t('approval.status.approved'),
      variant: 'default',
      className: 'bg-green-600 hover:bg-green-700',
    },
    [ApprovalStatusEnum.Rejected]: {
      label: t('approval.status.rejected'),
      variant: 'destructive',
      className: undefined,
    },
    [ApprovalStatusEnum.Closed]: {
      label: t('approval.status.closed'),
      variant: 'secondary',
      className: 'bg-zinc-500/80 hover:bg-zinc-600/80 text-white border-0',
    },
  };

  const config = statusConfig[status as ApprovalStatus] ?? statusConfig[ApprovalStatusEnum.Waiting];

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
