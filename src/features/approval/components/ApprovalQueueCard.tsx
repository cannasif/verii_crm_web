import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ApprovalStatusBadge } from './ApprovalStatusBadge';
import { CheckCircle2, XCircle, Eye, Clock } from 'lucide-react';
import type { ApprovalQueueCardProps } from '../types/approval-types';
import { ApprovalStatus, ApprovalLevel } from '../types/approval-types';

export function ApprovalQueueCard({
  queue,
  onViewDetail,
  onApprove,
  onReject,
}: ApprovalQueueCardProps): ReactElement {
  const { t, i18n } = useTranslation(['approval', 'common']);

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

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">
                {queue.quotationOfferNo || `#${queue.quotationId}`}
              </h3>
              <ApprovalStatusBadge status={queue.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {queue.assignedToUserFullName || t('approval.assignedTo')}
            </p>
          </div>
          <Badge variant="outline">
            {getApprovalLevelLabel(queue.approvalLevel)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatDate(queue.assignedAt)}</span>
          </div>

          {queue.note && (
            <div className="text-sm">
              <p className="font-medium">{t('approval.note.label')}:</p>
              <p className="text-muted-foreground">{queue.note}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onViewDetail(queue)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {t('approval.actions.view')}
            </Button>
            {queue.status === ApprovalStatus.Waiting && queue.isCurrent && (
              <>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => onApprove(queue)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {t('approval.actions.approve')}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => onReject(queue)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {t('approval.actions.reject')}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
