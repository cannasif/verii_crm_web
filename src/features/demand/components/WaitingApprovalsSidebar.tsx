import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useWaitingApprovals } from '../hooks/useWaitingApprovals';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, CheckCircle2, User, CalendarDays, ListOrdered, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WaitingApprovalsSidebar(): ReactElement {
  const { t, i18n } = useTranslation(['demand', 'common']);
  const navigate = useNavigate();
  const { data: approvals, isLoading } = useWaitingApprovals();

  const handleApprovalClick = (approvalRequestId: number): void => {
    navigate(`/demands/${approvalRequestId}`);
  };

  // Tasarım bütünlüğü için ortak kapsayıcı bileşeni
  const SidebarContainer = ({ children }: { children: React.ReactNode }) => (
    <div className="relative flex flex-col h-full min-h-[500px] overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl shadow-sm transition-all duration-300">
      {children}
    </div>
  );

  // Ortak Header
  const SidebarHeader = ({ count }: { count?: number }) => (
    <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
          <Clock className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          {t('waitingApprovals.title')}
        </h3>
      </div>
      {count !== undefined && count > 0 && (
        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/30 font-bold px-2 py-0.5">
          {count}
        </Badge>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <SidebarContainer>
        <SidebarHeader />
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[120px] w-full rounded-xl bg-slate-100 dark:bg-white/5" />
          ))}
        </div>
      </SidebarContainer>
    );
  }

  if (!approvals || approvals.length === 0) {
    return (
      <SidebarContainer>
        <SidebarHeader count={0} />
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center border-t border-transparent">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-4 ring-1 ring-emerald-100 dark:ring-emerald-500/20">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            İşlem Yok
          </h4>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('waitingApprovals.noApprovals')}
          </p>
        </div>
      </SidebarContainer>
    );
  }

  return (
    <SidebarContainer>
      <SidebarHeader count={approvals.length} />
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 max-h-[calc(100vh-200px)]">
        {approvals.map((approval) => (
          <button
            key={approval.id}
            onClick={() => handleApprovalClick(approval.approvalRequestId)}
            className="group relative flex flex-col w-full text-left p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-white dark:bg-transparent hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 hover:border-indigo-100 dark:hover:border-indigo-500/20 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {/* Üst Kısım: ID, Başlık ve Durum */}
            <div className="flex items-start justify-between w-full mb-3 gap-2">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1 text-[10px] font-mono font-bold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase mb-1">
                  <Hash size={10} className="opacity-70" />
                  {approval.approvalRequestId}
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                  {approval.approvalRequestDescription || t('untitled', 'İsimsiz Talep')}
                </span>
              </div>
              <Badge 
                variant="outline"
                className={cn(
                  "shrink-0 px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold border-0 shadow-sm",
                  approval.status === 1 
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" 
                    : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300"
                )}
              >
                {approval.statusName || t('waitingApprovals.waiting')}
              </Badge>
            </div>

            {/* Alt Kısım: Detay Bilgileri */}
            <div className="flex flex-col gap-2 pt-3 border-t border-slate-50 dark:border-white/5 w-full">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <ListOrdered className="h-3.5 w-3.5 text-indigo-500/60" />
                <span className="truncate">
                  <span className="font-medium text-slate-500">{t('waitingApprovals.stepOrder')}:</span> {approval.stepOrder}
                </span>
              </div>
              
              {approval.approvedByUserFullName && (
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <User className="h-3.5 w-3.5 text-indigo-500/60" />
                  <span className="truncate">
                    <span className="font-medium text-slate-500">{t('waitingApprovals.approvedBy')}:</span> {approval.approvedByUserFullName}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <CalendarDays className="h-3.5 w-3.5 text-indigo-500/60" />
                <span className="truncate">
                  <span className="font-medium text-slate-500">{t('waitingApprovals.actionDate')}:</span> {new Date(approval.actionDate).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </SidebarContainer>
  );
}