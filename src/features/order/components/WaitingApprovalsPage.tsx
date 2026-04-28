import { type ReactElement, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useWaitingApprovals } from '../hooks/useWaitingApprovals';
import { useApproveAction } from '../hooks/useApproveAction';
import { useRejectAction } from '../hooks/useRejectAction';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Clock, FileText, Check, XCircle, X, ShieldAlert } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { WaitingApprovalsSidebar } from './WaitingApprovalsSidebar';
import type { ApprovalActionGetDto } from '../types/order-types';

export function WaitingApprovalsPage(): ReactElement {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { setPageTitle } = useUIStore();
  const { data: approvals, isLoading } = useWaitingApprovals();
  const approveAction = useApproveAction();
  const rejectAction = useRejectAction();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalActionGetDto | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    setPageTitle(t('order.waitingApprovals.title'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  const handleRowClick = (approvalRequestId: number): void => {
    navigate(`/orders/${approvalRequestId}`);
  };

  const handleApprove = (e: React.MouseEvent, approval: ApprovalActionGetDto): void => {
    e.stopPropagation();
    approveAction.mutate({ approvalActionId: approval.id });
  };

  const handleRejectClick = (e: React.MouseEvent, approval: ApprovalActionGetDto): void => {
    e.stopPropagation();
    setSelectedApproval(approval);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = (): void => {
    if (selectedApproval) {
      rejectAction.mutate({
        approvalActionId: selectedApproval.id,
        rejectReason: rejectReason || null,
      });
      setRejectDialogOpen(false);
      setSelectedApproval(null);
      setRejectReason('');
    }
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate('/orders/create')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('order.back')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <WaitingApprovalsSidebar />
        </div>

        <div className="lg:col-span-3">
          <Card className="overflow-hidden rounded-2x1 border-white/20 bg-white dark:bg-[#180F22] shadow-xl">
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
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                  ))}
                </div>
              ) : !approvals || approvals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <FileText className="h-10 w-10 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {t('order.waitingApprovals.noApprovals')}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5">
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 py-4">
                          {t('order.waitingApprovals.requestId')}
                        </TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {t('order.waitingApprovals.description')}
                        </TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {t('order.waitingApprovals.stepOrder')}
                        </TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {t('order.waitingApprovals.approvedBy')}
                        </TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {t('order.waitingApprovals.actionDate')}
                        </TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {t('order.waitingApprovals.status')}
                        </TableHead>
                        <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {t('order.actions')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvals.map((approval) => (
                        <TableRow
                          key={approval.id}
                          className="border-b border-slate-100 dark:border-white/5 hover:bg-pink-50/30 dark:hover:bg-pink-500/5 transition-colors cursor-pointer"
                        >
                          <TableCell
                            className="font-bold text-pink-600 dark:text-pink-400 py-4"
                            onClick={() => handleRowClick(approval.approvalRequestId)}
                          >
                            #{approval.approvalRequestId}
                          </TableCell>
                          <TableCell
                            className="font-medium text-slate-700 dark:text-slate-300"
                            onClick={() => handleRowClick(approval.approvalRequestId)}
                          >
                            {approval.approvalRequestDescription || '-'}
                          </TableCell>
                          <TableCell
                            onClick={() => handleRowClick(approval.approvalRequestId)}
                          >
                            <Badge className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-bold">
                              {approval.stepOrder}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className="text-slate-600 dark:text-slate-400 font-medium"
                            onClick={() => handleRowClick(approval.approvalRequestId)}
                          >
                            {approval.approvedByUserFullName || '-'}
                          </TableCell>
                          <TableCell
                            className="text-slate-500 dark:text-slate-400 text-sm"
                            onClick={() => handleRowClick(approval.approvalRequestId)}
                          >
                            {formatDate(approval.actionDate)}
                          </TableCell>
                          <TableCell
                            onClick={() => handleRowClick(approval.approvalRequestId)}
                          >
                            <Badge
                              className={approval.status === 1
                                ? 'rounded-lg border border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 font-bold'
                                : 'rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 font-bold'
                              }
                            >
                              {approval.statusName || t('order.waitingApprovals.waiting')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={(e) => handleApprove(e, approval)}
                                disabled={approveAction.isPending || rejectAction.isPending}
                                className="h-9 rounded-xl bg-linear-to-r from-emerald-500 to-green-600 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_4px_12px_-4px_rgba(16,185,129,0.5)] disabled:opacity-50 disabled:hover:scale-100 gap-1.5 px-4"
                              >
                                <Check className="h-4 w-4" />
                                {t('order.approval.approve')}
                              </Button>
                              <Button
                                size="sm"
                                onClick={(e) => handleRejectClick(e, approval)}
                                disabled={approveAction.isPending || rejectAction.isPending}
                                className="h-9 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 font-bold transition-all disabled:opacity-50 gap-1.5 px-4"
                              >
                                <XCircle className="h-4 w-4" />
                                {t('order.approval.reject')}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[520px] p-0 overflow-hidden border-0 shadow-2xl bg-white dark:bg-[#180F22] rounded-3xl ring-1 ring-slate-200 dark:ring-white/10">
          <DialogPrimitive.Close className="absolute right-6 top-6 z-50 rounded-2xl bg-slate-100 p-2.5 text-slate-400 transition-all duration-200 hover:bg-red-600 hover:text-white active:scale-90 dark:bg-white/5 dark:text-white/40 dark:hover:bg-red-600 dark:hover:text-white">
            <X size={20} strokeWidth={2.5} />
          </DialogPrimitive.Close>
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-white/5 text-left">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-500/10 shadow-inner border border-red-200 dark:border-red-500/20">
                <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {t('order.approval.rejectTitle')}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                  {t('order.approval.rejectDescription')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 px-6 py-6">
            <Textarea
              placeholder={t('order.approval.rejectReasonPlaceholder')}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              maxLength={500}
              rows={4}
              className="rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus-visible:ring-red-500/50 focus-visible:border-red-500/50 transition-all font-medium resize-none"
            />
          </div>
          <DialogFooter className="border-t border-slate-100 dark:border-white/5 px-6 py-4 flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setSelectedApproval(null);
                setRejectReason('');
              }}
              disabled={rejectAction.isPending}
              className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 font-bold px-6 h-11"
            >
              {t('order.cancel')}
            </Button>
            <Button
              onClick={handleRejectConfirm}
              disabled={rejectAction.isPending}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_5px_15px_-5px_rgba(220,38,38,0.5)] disabled:opacity-50 disabled:hover:scale-100 px-8 h-11"
            >
              {rejectAction.isPending
                ? t('order.loading')
                : t('order.approval.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
