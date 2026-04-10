import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, Clock, CircleDot } from 'lucide-react';
import { ApprovalStatusBadge } from './ApprovalStatusBadge';
import type { ApprovalTransactionDto } from '../types/approval-types';
import { ApprovalStatus, ApprovalLevel } from '../types/approval-types';

interface ApprovalHistoryTimelineProps {
  history: ApprovalTransactionDto[];
}

export function ApprovalHistoryTimeline({ history }: ApprovalHistoryTimelineProps): ReactElement {
  const { t, i18n } = useTranslation(['approval', 'common']);

  const getStatusIcon = (status: ApprovalStatus): ReactElement => {
    switch (status) {
      case ApprovalStatus.Approved:
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case ApprovalStatus.Rejected:
        return <XCircle className="h-4 w-4 text-red-600" />;
      case ApprovalStatus.Closed:
        return <CircleDot className="h-4 w-4 text-zinc-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getApprovalLevelLabel = (level: ApprovalLevel): string => {
    const labels: Record<ApprovalLevel, string> = {
      [ApprovalLevel.SalesManager]: t('approval.level.salesManager'),
      [ApprovalLevel.RegionalManager]: t('approval.level.regionalManager'),
      [ApprovalLevel.Finance]: t('approval.level.finance'),
      [ApprovalLevel.GeneralManager]: t('approval.level.generalManager'),
    };
    return labels[level] || t('approval.level.unknown');
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (history.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        {t('approval.history.empty')}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((item, index) => (
        <div key={item.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="mt-1">{getStatusIcon(item.status)}</div>
            {index < history.length - 1 && (
              <div className="w-0.5 h-full bg-border mt-2" />
            )}
          </div>
          <div className="flex-1 space-y-1 pb-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {getApprovalLevelLabel(item.approvalLevel)}
              </span>
              <ApprovalStatusBadge status={item.status} />
            </div>
            {item.approvedByUserFullName && (
              <p className="text-sm text-muted-foreground">
                {t('approval.history.approvedBy')}: {item.approvedByUserFullName}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {formatDate(item.actionDate || item.requestedAt)}
            </p>
            {item.note && (
              <p className="text-sm mt-2 p-2 bg-muted rounded">{item.note}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
