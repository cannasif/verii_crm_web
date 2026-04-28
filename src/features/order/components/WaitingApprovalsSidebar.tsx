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
      <Card className="h-full overflow-hidden rounded-[2rem] border-none bg-white dark:bg-[#180F22] shadow-xl">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-100 dark:bg-white/5 border border-pink-200 dark:border-white/10">
              <Clock className="h-5 w-5 text-pink-600 dark:text-pink-400" />
            </div>
            <CardTitle className="text-base font-bold">{t('order.waitingApprovals.title')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!approvals || approvals.length === 0) {
    return (
      <Card className="h-full overflow-hidden rounded-2x1 border-white/20 bg-white dark:bg-[#180F22] shadow-xl">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-100 dark:bg-white/5 shadow-inner border border-pink-200 dark:border-white/10 relative overflow-hidden group">
              <div className="absolute inset-0 bg-linear-to-br from-pink-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Clock className="h-6 w-6 text-pink-600 dark:text-pink-400 relative z-10" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">{t('order.waitingApprovals.list')}</CardTitle>
            </div>
            {approvals && approvals.length > 0 && (
              <Badge className="ml-auto rounded-xl border border-pink-200 bg-pink-50 text-pink-600 dark:border-pink-500/30 dark:bg-pink-500/10 dark:text-pink-400 font-bold px-3 py-1 shadow-sm">
                {approvals.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <FileText className="h-10 w-10 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {t('order.waitingApprovals.noApprovals')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full overflow-hidden rounded-[2rem] border-none bg-white dark:bg-[#180F22] shadow-xl">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-100 dark:bg-white/5 border border-pink-200 dark:border-white/10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-linear-to-br from-pink-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Clock className="h-5 w-5 text-pink-600 dark:text-pink-400 relative z-10" />
          </div>
          <CardTitle className="text-base font-bold">{t('order.waitingApprovals.title')}</CardTitle>
          <Badge className="ml-auto rounded-xl border border-pink-200 bg-pink-50 text-pink-600 dark:border-pink-500/30 dark:bg-pink-500/10 dark:text-pink-400 font-bold px-2.5 py-0.5 shadow-sm">
            {approvals.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[600px] overflow-y-auto px-4 pb-4">
        {approvals.map((approval) => (
          <Button
            key={approval.id}
            variant="ghost"
            className="w-full justify-start h-auto py-3 px-4 flex flex-col items-start gap-1.5 rounded-2xl border border-slate-100 dark:border-white/5 hover:bg-pink-50/50 dark:hover:bg-pink-500/5 hover:border-pink-200 dark:hover:border-pink-500/20 transition-all"
            onClick={() => handleApprovalClick(approval.approvalRequestId)}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-bold text-slate-700 dark:text-white truncate">
                {approval.approvalRequestDescription || `#${approval.approvalRequestId}`}
              </span>
              <Badge
                className={`ml-2 shrink-0 rounded-lg font-bold ${approval.status === 1
                  ? 'border border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400'
                  : 'border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400'
                  }`}
              >
                {approval.statusName || t('order.waitingApprovals.waiting')}
              </Badge>
            </div>
            <div className="flex flex-col gap-0.5 text-xs font-medium text-slate-400 dark:text-slate-500 w-full">
              <div>
                {t('order.waitingApprovals.stepOrder')}: <span className="text-pink-500 dark:text-pink-400">{approval.stepOrder}</span>
              </div>
              {approval.approvedByUserFullName && (
                <div className="truncate">
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
