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
import { ArrowLeft, Clock, FileText, Check, X } from 'lucide-react';
import { WaitingApprovalsSidebar } from './WaitingApprovalsSidebar';
import type { ApprovalActionGetDto } from '../types/demand-types';

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
    setPageTitle(t('demand.waitingApprovals.title'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  const handleRowClick = (approvalRequestId: number): void => {
    navigate(`/demands/${approvalRequestId}`);
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
        <Button variant="outline" onClick={() => navigate('/demands/create')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('demand.back')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <WaitingApprovalsSidebar />
        </div>

        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t('demand.waitingApprovals.list')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : !approvals || approvals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <FileText className="h-12 w-12 mb-2 opacity-50" />
                  <p className="text-sm">
                    {t('demand.waitingApprovals.noApprovals')}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          {t('demand.waitingApprovals.requestId')}
                        </TableHead>
                        <TableHead>
                          {t('demand.waitingApprovals.description')}
                        </TableHead>
                        <TableHead>
                          {t('demand.waitingApprovals.stepOrder')}
                        </TableHead>
                        <TableHead>
                          {t('demand.waitingApprovals.approvedBy')}
                        </TableHead>
                        <TableHead>
                          {t('demand.waitingApprovals.actionDate')}
                        </TableHead>
                        <TableHead>
                          {t('demand.waitingApprovals.status')}
                        </TableHead>
                        <TableHead className="text-right">
                          {t('demand.actions')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvals.map((approval) => (
                        <TableRow
                          key={approval.id}
                          className="hover:bg-muted/50"
                        >
                          <TableCell 
                            className="font-medium cursor-pointer"
                            onClick={() => handleRowClick(approval.approvalRequestId)}
                          >
                            #{approval.approvalRequestId}
                          </TableCell>
                          <TableCell 
                            className="cursor-pointer"
                            onClick={() => handleRowClick(approval.approvalRequestId)}
                          >
                            {approval.approvalRequestDescription || '-'}
                          </TableCell>
                          <TableCell 
                            className="cursor-pointer"
                            onClick={() => handleRowClick(approval.approvalRequestId)}
                          >
                            <Badge variant="outline">
                              {approval.stepOrder}
                            </Badge>
                          </TableCell>
                          <TableCell 
                            className="cursor-pointer"
                            onClick={() => handleRowClick(approval.approvalRequestId)}
                          >
                            {approval.approvedByUserFullName || '-'}
                          </TableCell>
                          <TableCell 
                            className="cursor-pointer"
                            onClick={() => handleRowClick(approval.approvalRequestId)}
                          >
                            {formatDate(approval.actionDate)}
                          </TableCell>
                          <TableCell 
                            className="cursor-pointer"
                            onClick={() => handleRowClick(approval.approvalRequestId)}
                          >
                            <Badge
                              variant={approval.status === 1 ? 'default' : 'secondary'}
                            >
                              {approval.statusName || t('demand.waitingApprovals.waiting')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={(e) => handleApprove(e, approval)}
                                disabled={approveAction.isPending || rejectAction.isPending}
                                className="gap-1"
                              >
                                <Check className="h-4 w-4" />
                                {t('demand.approval.approve')}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={(e) => handleRejectClick(e, approval)}
                                disabled={approveAction.isPending || rejectAction.isPending}
                                className="gap-1"
                              >
                                <X className="h-4 w-4" />
                                {t('demand.approval.reject')}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('demand.approval.rejectTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('demand.approval.rejectDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder={t('demand.approval.rejectReasonPlaceholder')}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              maxLength={500}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setSelectedApproval(null);
                setRejectReason('');
              }}
              disabled={rejectAction.isPending}
            >
              {t('demand.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectAction.isPending}
            >
              {rejectAction.isPending
                ? t('demand.loading')
                : t('demand.approval.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
