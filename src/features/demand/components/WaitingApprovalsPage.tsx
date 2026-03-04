import { type ReactElement, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useWaitingApprovals } from '../hooks/useWaitingApprovals';
import { useApproveAction } from '../hooks/useApproveAction';
import { useRejectAction } from '../hooks/useRejectAction';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
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
import { 
  ArrowLeft, 
  Clock, 
  Check, 
  X, 
  ClipboardList, 
  User, 
  CalendarDays, 
  ShieldAlert, 
  Hash, 
  ListOrdered 
} from 'lucide-react';
import { WaitingApprovalsSidebar } from './WaitingApprovalsSidebar';
import type { ApprovalActionGetDto } from '../types/demand-types';
import { cn } from '@/lib/utils';

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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Ortak tablo stili sınıfları
  const headStyle = "text-slate-500 dark:text-slate-400 py-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap bg-slate-50 dark:bg-[#151025] sticky top-0 z-10 shadow-sm border-b border-slate-200 dark:border-white/10";
  const cellStyle = "text-slate-600 dark:text-slate-400 text-sm py-4 border-b border-slate-100 dark:border-white/5 align-middle";

  return (
    <div className="w-full max-w-[1600px] mx-auto pb-10 px-4 md:px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Şık Sayfa Başlığı */}
      <div className="relative mb-8 pt-6">
        <div className="absolute left-0 top-6 hidden lg:block">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => navigate('/demands/create')}
            className="group h-11 w-11 rounded-xl bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-white/10 hover:border-indigo-500/50 hover:shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)] transition-all duration-300"
          >
            <ArrowLeft className="h-5 w-5 text-zinc-500 group-hover:text-indigo-600 transition-colors" />
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center text-center px-4">
          <div className="lg:hidden self-start mb-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/demands/create')}
              className="rounded-lg border-zinc-200 dark:border-zinc-800"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('demand.back')}
            </Button>
          </div>

          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20 mb-4">
            <ClipboardList className="h-6 w-6 text-white" />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            {t('demand.waitingApprovals.title')}
          </h1>
          <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-2 max-w-2xl mx-auto">
            İşlem bekleyen onay taleplerinizi buradan görüntüleyebilir ve yönetebilirsiniz.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className="lg:col-span-1 xl:sticky xl:top-6">
          <WaitingApprovalsSidebar />
        </div>

        <div className="lg:col-span-3">
          {/* Glassmorphism Tablo Kapsayıcı */}
          <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-0 overflow-hidden transition-all duration-300 flex flex-col">
            
            <div className="px-6 py-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {t('demand.waitingApprovals.list')}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {approvals ? `${approvals.length} adet bekleyen onay` : t('demand.loading')}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-0">
              {isLoading ? (
                /* Şık Skeleton Yükleme Durumu */
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
                     <Skeleton className="h-6 w-12 bg-slate-200 dark:bg-white/10" />
                     <Skeleton className="h-6 w-48 bg-slate-200 dark:bg-white/10" />
                     <Skeleton className="h-6 w-24 bg-slate-200 dark:bg-white/10" />
                  </div>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-4 py-3">
                      <Skeleton className="h-5 w-16 bg-slate-100 dark:bg-white/5" />
                      <Skeleton className="h-5 w-full max-w-[200px] bg-slate-100 dark:bg-white/5" />
                      <Skeleton className="h-5 w-32 bg-slate-100 dark:bg-white/5" />
                      <Skeleton className="h-5 w-24 bg-slate-100 dark:bg-white/5" />
                    </div>
                  ))}
                </div>
              ) : !approvals || approvals.length === 0 ? (
                /* Premium Empty State */
                <div className="flex flex-col items-center justify-center py-24 px-4 m-6 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-white/5 text-center">
                  <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-6 ring-1 ring-emerald-100 dark:ring-emerald-500/20">
                    <Check className="h-10 w-10 text-emerald-500" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    Harika! Bekleyen onay yok.
                  </h4>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto">
                    {t('demand.waitingApprovals.noApprovals')}
                  </p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto custom-scrollbar">
                  <Table className="min-w-[1000px] w-full caption-bottom text-sm whitespace-nowrap">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-none">
                        <TableHead className={cn(headStyle, "pl-6")}>{t('demand.waitingApprovals.requestId')}</TableHead>
                        <TableHead className={headStyle}>{t('demand.waitingApprovals.description')}</TableHead>
                        <TableHead className={cn(headStyle, "text-center")}>{t('demand.waitingApprovals.stepOrder')}</TableHead>
                        <TableHead className={headStyle}>{t('demand.waitingApprovals.approvedBy')}</TableHead>
                        <TableHead className={headStyle}>{t('demand.waitingApprovals.actionDate')}</TableHead>
                        <TableHead className={headStyle}>{t('demand.waitingApprovals.status')}</TableHead>
                        <TableHead className={cn(headStyle, "text-right pr-6")}>{t('demand.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvals.map((approval) => (
                        <TableRow
                          key={approval.id}
                          className="group transition-colors duration-200 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 border-b border-slate-100 dark:border-white/5 cursor-pointer last:border-0"
                          onClick={() => handleRowClick(approval.approvalRequestId)}
                        >
                          {/* ID Badge */}
                          <TableCell className={cn(cellStyle, "pl-6")}>
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-md text-[11px] font-mono text-slate-700 dark:text-slate-300 w-fit font-bold">
                              <Hash size={12} className="opacity-50" />
                              {approval.approvalRequestId}
                            </div>
                          </TableCell>
                          
                          <TableCell className={cn(cellStyle, "font-bold text-slate-900 dark:text-white")}>
                            {approval.approvalRequestDescription || '-'}
                          </TableCell>
                          
                          <TableCell className={cn(cellStyle, "text-center")}>
                            <div className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2.5 py-1 rounded-full text-xs font-bold text-slate-700 dark:text-slate-300">
                              <ListOrdered size={12} className="text-indigo-500" />
                              {approval.stepOrder}
                            </div>
                          </TableCell>
                          
                          <TableCell className={cellStyle}>
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-500">
                                <User className="h-3 w-3" />
                              </div>
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {approval.approvedByUserFullName || '-'}
                              </span>
                            </div>
                          </TableCell>
                          
                          <TableCell className={cellStyle}>
                            <div className="flex items-center gap-2 text-xs">
                              <CalendarDays className="h-3.5 w-3.5 text-indigo-500/50 shrink-0" />
                              <span>{formatDate(approval.actionDate)}</span>
                            </div>
                          </TableCell>
                          
                          <TableCell className={cellStyle}>
                            <Badge
                              variant="outline"
                              className={cn(
                                "px-2.5 py-1 font-semibold text-[11px] uppercase tracking-wider shadow-sm border-0",
                                approval.status === 1 
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" 
                                  : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300"
                              )}
                            >
                              {approval.statusName || t('demand.waitingApprovals.waiting')}
                            </Badge>
                          </TableCell>
                          
                          <TableCell className={cn(cellStyle, "text-right pr-6")}>
                            {/* Hover Reveal Buttons */}
                            <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleApprove(e, approval)}
                                disabled={approveAction.isPending || rejectAction.isPending}
                                className="h-8 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                                title={t('demand.approval.approve')}
                              >
                                <Check className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline font-bold">{t('demand.approval.approve')}</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleRejectClick(e, approval)}
                                disabled={approveAction.isPending || rejectAction.isPending}
                                className="h-8 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
                                title={t('demand.approval.reject')}
                              >
                                <X className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline font-bold">{t('demand.approval.reject')}</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Premium Modal (Dialog) Tasarımı */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white w-[90%] sm:w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-0 gap-0">
          <DialogHeader className="flex flex-col items-center gap-4 text-center pb-6 pt-10 px-6">
            <div className="h-20 w-20 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center mb-2 animate-in zoom-in duration-300">
              <ShieldAlert size={36} className="text-rose-600 dark:text-rose-500" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('demand.approval.rejectTitle')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto text-sm leading-relaxed">
                {t('demand.approval.rejectDescription')}
              </DialogDescription>
            </div>
          </DialogHeader>
          
          <div className="p-6 pt-2">
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                Ret Gerekçesi
              </label>
              <Textarea
                placeholder={t('demand.approval.rejectReasonPlaceholder')}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                maxLength={500}
                rows={4}
                className="resize-none rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0f0a18] text-sm shadow-sm focus-visible:ring-rose-500"
              />
              <div className="flex justify-end">
                <span className="text-xs text-slate-400">
                  {rejectReason.length}/500
                </span>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex flex-row gap-3 justify-center p-6 bg-slate-50/50 dark:bg-[#1a1025]/50 border-t border-slate-100 dark:border-white/5">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setSelectedApproval(null);
                setRejectReason('');
              }}
              disabled={rejectAction.isPending}
              className="flex-1 h-12 rounded-xl border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/5 font-semibold"
            >
              {t('demand.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectAction.isPending}
              className="flex-1 h-12 rounded-xl bg-linear-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white border-0 shadow-lg shadow-rose-500/20 transition-all hover:scale-[1.02] font-bold"
            >
              {rejectAction.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  {t('demand.loading')}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <X className="h-4 w-4" />
                  {t('demand.approval.reject')}
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}