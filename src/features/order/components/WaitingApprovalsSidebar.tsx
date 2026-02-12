import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useWaitingApprovals } from '../hooks/useWaitingApprovals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, FileText } from 'lucide-react';

export function WaitingApprovalsSidebar(): ReactElement {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: approvals, isLoading } = useWaitingApprovals();

  const handleApprovalClick = (approvalRequestId: number): void => {
    navigate(`/orders/${approvalRequestId}`);
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('order.waitingApprovals.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!approvals || approvals.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('order.waitingApprovals.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">
              {t('order.waitingApprovals.noApprovals')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t('order.waitingApprovals.title')}
          <Badge variant="secondary" className="ml-auto">
            {approvals.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
        {approvals.map((approval) => (
          <Button
            key={approval.id}
            variant="outline"
            className="w-full justify-start h-auto p-3 flex flex-col items-start gap-1 hover:bg-accent"
            onClick={() => handleApprovalClick(approval.approvalRequestId)}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-medium truncate">
                {approval.approvalRequestDescription || `#${approval.approvalRequestId}`}
              </span>
              <Badge 
                variant={approval.status === 1 ? 'default' : 'secondary'}
                className="ml-2 shrink-0"
              >
                {approval.statusName || t('order.waitingApprovals.waiting')}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground w-full">
              <div>
                {t('order.waitingApprovals.stepOrder')}: {approval.stepOrder}
              </div>
              {approval.approvedByUserFullName && (
                <div>
                  {t('order.waitingApprovals.approvedBy')}: {approval.approvedByUserFullName}
                </div>
              )}
              <div>
                {t('order.waitingApprovals.actionDate')}: {new Date(approval.actionDate).toLocaleDateString(i18n.language)}
              </div>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
