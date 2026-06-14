import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useWaitingApprovals } from '../hooks/useWaitingApprovals';
import { useApproveAction } from '../hooks/useApproveAction';
import { useRejectAction } from '../hooks/useRejectAction';
import { useUIStore } from '@/stores/ui-store';
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
  ManagementDataTableChrome,
  WaitingApprovalsActionButtons,
  WaitingApprovalsPageShell,
  WaitingApprovalsRejectDialog,
  WaitingApprovalsSidebar,
  WaitingApprovalsStatusBadge,
  WaitingApprovalsTableEmptyState,
  WaitingApprovalsTableLoadingState,
  WAITING_APPROVALS_TABLE_CELL_CLASSNAME,
  WAITING_APPROVALS_TABLE_HEAD_CLASSNAME,
  type WaitingApprovalSidebarItem,
} from '@/components/shared';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
} from '@/lib/management-list-layout';
import { cn } from '@/lib/utils';
import {
  CalendarDays,
  ClipboardList,
  Clock,
  Hash,
  ListOrdered,
  User,
} from 'lucide-react';
import type { ApprovalActionGetDto } from '../types/demand-types';
import { getApprovalStatusTranslationKey } from '@/features/approval/utils/approval-status-key';

export function WaitingApprovalsPage(): ReactElement {
  const { t, i18n } = useTranslation(['demand', 'common', 'approval']);
  const navigate = useNavigate();
  const { setPageTitle } = useUIStore();
  const { data: approvals, isLoading } = useWaitingApprovals();
  const approveAction = useApproveAction();
  const rejectAction = useRejectAction();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalActionGetDto | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    setPageTitle(t('waitingApprovals.title'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  const approveLabel = t('approval.actions.approve', { ns: 'approval', defaultValue: 'Onayla' });
  const rejectLabel = t('approval.actions.reject', { ns: 'approval', defaultValue: 'Reddet' });

  const getStatusLabel = (status: number, statusName?: string | null): string => {
    const statusKey = getApprovalStatusTranslationKey(status);
    if (statusKey) return t(`approval.status.${statusKey}`, { ns: 'approval' });
    return statusName || t('waitingApprovals.waiting');
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const sidebarItems = useMemo<WaitingApprovalSidebarItem[]>(
    () =>
      (approvals ?? []).map((approval) => ({
        id: approval.id,
        approvalRequestId: approval.approvalRequestId,
        status: approval.status,
        title: approval.approvalRequestDescription || t('untitled', { defaultValue: 'İsimsiz Talep' }),
        stepOrder: approval.stepOrder,
        approvedByUserFullName: approval.approvedByUserFullName,
        actionDate: approval.actionDate,
      })),
    [approvals, t],
  );

  const handleRowClick = (approvalRequestId: number): void => {
    navigate(`/demands/${approvalRequestId}`);
  };

  const handleApprove = (event: React.MouseEvent, approval: ApprovalActionGetDto): void => {
    event.stopPropagation();
    approveAction.mutate({ approvalActionId: approval.id });
  };

  const handleRejectClick = (event: React.MouseEvent, approval: ApprovalActionGetDto): void => {
    event.stopPropagation();
    setSelectedApproval(approval);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = (): void => {
    if (!selectedApproval) return;
    rejectAction.mutate({
      approvalActionId: selectedApproval.id,
      rejectReason: rejectReason || null,
    });
    setRejectDialogOpen(false);
    setSelectedApproval(null);
    setRejectReason('');
  };

  const handleRejectCancel = (): void => {
    setRejectDialogOpen(false);
    setSelectedApproval(null);
    setRejectReason('');
  };

  const pendingCountLabel = approvals
    ? `${approvals.length} adet bekleyen onay`
    : t('loading');

  return (
    <>
      <WaitingApprovalsPageShell
        title={t('waitingApprovals.title')}
        subtitle={t('waitingApprovals.pageSubtitle', {
          defaultValue: 'İşlem bekleyen onay taleplerinizi buradan görüntüleyebilir ve yönetebilirsiniz.',
        })}
        backLabel={t('back')}
        onBack={() => navigate('/demands')}
        icon={ClipboardList}
        sidebar={
          <WaitingApprovalsSidebar
            title={t('waitingApprovals.title')}
            noApprovalsText={t('waitingApprovals.noApprovals')}
            emptyStateTitle={t('waitingApprovals.emptyStateTitle', { defaultValue: 'İşlem Yok' })}
            isLoading={isLoading}
            items={sidebarItems}
            onItemClick={(item) => handleRowClick(item.approvalRequestId)}
            stepOrderLabel={t('waitingApprovals.stepOrder')}
            approvedByLabel={t('waitingApprovals.approvedBy')}
            actionDateLabel={t('waitingApprovals.actionDate')}
            getStatusLabel={getStatusLabel}
            formatDate={formatDate}
          />
        }
      >
        <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
          <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
            <CardTitle
              className={cn(
                MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
                'flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3',
              )}
            >
              <span className="inline-flex items-center gap-2">
                <Clock className="h-5 w-5 shrink-0" />
                {t('waitingApprovals.list')}
              </span>
              <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                {pendingCountLabel}
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
            {isLoading ? (
              <WaitingApprovalsTableLoadingState />
            ) : !approvals || approvals.length === 0 ? (
              <WaitingApprovalsTableEmptyState
                title={t('waitingApprovals.emptyStateTitle', { defaultValue: 'Harika! Bekleyen onay yok.' })}
                description={t('waitingApprovals.noApprovals')}
              />
            ) : (
              <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
                <ManagementDataTableChrome>
                  <div className="w-full overflow-x-auto custom-scrollbar">
                    <Table className="min-w-[1000px] w-full caption-bottom text-sm whitespace-nowrap">
                      <TableHeader>
                        <TableRow className="border-none hover:bg-transparent">
                          <TableHead className={cn(WAITING_APPROVALS_TABLE_HEAD_CLASSNAME, 'pl-6')}>
                            {t('waitingApprovals.requestId')}
                          </TableHead>
                          <TableHead className={WAITING_APPROVALS_TABLE_HEAD_CLASSNAME}>
                            {t('waitingApprovals.description')}
                          </TableHead>
                          <TableHead className={cn(WAITING_APPROVALS_TABLE_HEAD_CLASSNAME, 'text-center')}>
                            {t('waitingApprovals.stepOrder')}
                          </TableHead>
                          <TableHead className={WAITING_APPROVALS_TABLE_HEAD_CLASSNAME}>
                            {t('waitingApprovals.approvedBy')}
                          </TableHead>
                          <TableHead className={WAITING_APPROVALS_TABLE_HEAD_CLASSNAME}>
                            {t('waitingApprovals.actionDate')}
                          </TableHead>
                          <TableHead className={WAITING_APPROVALS_TABLE_HEAD_CLASSNAME}>
                            {t('waitingApprovals.status')}
                          </TableHead>
                          <TableHead className={cn(WAITING_APPROVALS_TABLE_HEAD_CLASSNAME, 'text-right pr-6')}>
                            {t('actions')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {approvals.map((approval) => (
                          <TableRow
                            key={approval.id}
                            className="group cursor-pointer border-none"
                            onClick={() => handleRowClick(approval.approvalRequestId)}
                          >
                            <TableCell className={cn(WAITING_APPROVALS_TABLE_CELL_CLASSNAME, 'pl-6')}>
                              <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-md text-[11px] font-mono text-slate-700 dark:text-slate-300 w-fit font-bold">
                                <Hash size={12} className="opacity-50" />
                                {approval.approvalRequestId}
                              </div>
                            </TableCell>

                            <TableCell className={cn(WAITING_APPROVALS_TABLE_CELL_CLASSNAME, 'font-bold text-slate-900 dark:text-white')}>
                              {approval.approvalRequestDescription || '-'}
                            </TableCell>

                            <TableCell className={cn(WAITING_APPROVALS_TABLE_CELL_CLASSNAME, 'text-center')}>
                              <div className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2.5 py-1 rounded-full text-xs font-bold text-slate-700 dark:text-slate-300">
                                <ListOrdered size={12} className="text-pink-500" />
                                {approval.stepOrder}
                              </div>
                            </TableCell>

                            <TableCell className={WAITING_APPROVALS_TABLE_CELL_CLASSNAME}>
                              <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-500">
                                  <User className="h-3 w-3" />
                                </div>
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                  {approval.approvedByUserFullName || '-'}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className={WAITING_APPROVALS_TABLE_CELL_CLASSNAME}>
                              <div className="flex items-center gap-2 text-xs">
                                <CalendarDays className="h-3.5 w-3.5 text-pink-500/50 shrink-0" />
                                <span>{formatDate(approval.actionDate)}</span>
                              </div>
                            </TableCell>

                            <TableCell className={WAITING_APPROVALS_TABLE_CELL_CLASSNAME}>
                              <WaitingApprovalsStatusBadge
                                status={approval.status}
                                label={getStatusLabel(approval.status, approval.statusName)}
                              />
                            </TableCell>

                            <TableCell className={cn(WAITING_APPROVALS_TABLE_CELL_CLASSNAME, 'text-right pr-6')}>
                              <WaitingApprovalsActionButtons
                                approveLabel={approveLabel}
                                rejectLabel={rejectLabel}
                                isPending={approveAction.isPending || rejectAction.isPending}
                                onApprove={(event) => handleApprove(event, approval)}
                                onReject={(event) => handleRejectClick(event, approval)}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ManagementDataTableChrome>
              </div>
            )}
          </CardContent>
        </Card>
      </WaitingApprovalsPageShell>

      <WaitingApprovalsRejectDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        title={t('waitingApprovals.rejectTitle', { defaultValue: t('approval.rejectTitle') })}
        description={t('waitingApprovals.rejectDescription', { defaultValue: t('approval.rejectDescription') })}
        reasonLabel={t('waitingApprovals.rejectReasonLabel', { defaultValue: 'Ret Gerekçesi' })}
        reasonPlaceholder={t('waitingApprovals.rejectReasonPlaceholder', {
          defaultValue: t('approval.rejectReasonPlaceholder'),
        })}
        cancelLabel={t('cancel')}
        confirmLabel={rejectLabel}
        loadingLabel={t('loading')}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        onConfirm={handleRejectConfirm}
        onCancel={handleRejectCancel}
        isPending={rejectAction.isPending}
      />
    </>
  );
}
