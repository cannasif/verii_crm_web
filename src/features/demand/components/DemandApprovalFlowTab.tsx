import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useDemandApprovalFlowReport } from '../hooks/useDemandApprovalFlowReport';
import type { DemandApprovalFlowReportDto, ApprovalFlowStepReportDto, ApprovalActionDetailDto } from '../types/demand-types';
import { 
  TickDouble02Icon, 
  Time02Icon, 
  CancelCircleIcon, 
  CircleIcon, 
  Alert02Icon, 
  UserIcon, 
  Mail01Icon, 
  Calendar01Icon,
  Shield01Icon,
  CheckmarkBadge01Icon
} from 'hugeicons-react';
import { cn } from '@/lib/utils';

interface DemandApprovalFlowTabProps {
  demandId: number;
}

function formatActionDate(value: string | null | undefined, locale: string): string {
  if (!value) return '—';
  try {
    const d = new Date(value);
    return d.toLocaleString(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return value;
  }
}

// İsimden baş harfleri çıkaran yardımcı fonksiyon (Avatar için)
function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StepStatusIcon({ stepStatus }: { stepStatus: ApprovalFlowStepReportDto['stepStatus'] }): ReactElement {
  switch (stepStatus) {
    case 'Completed':
      return (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30 border border-emerald-300 dark:border-emerald-500/50">
          <TickDouble02Icon size={24} className="text-white" />
        </div>
      );
    case 'InProgress':
      return (
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30 border border-amber-300 dark:border-amber-500/50">
          <div className="absolute inset-0 rounded-2xl border-2 border-amber-400 animate-ping opacity-20"></div>
          <Time02Icon size={24} className="text-white animate-pulse"  />
        </div>
      );
    case 'Rejected':
      return (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-rose-500 to-red-600 shadow-lg shadow-rose-500/30 border border-rose-300 dark:border-rose-500/50">
          <CancelCircleIcon size={24} className="text-white" />
        </div>
      );
    default:
      return (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
          <CircleIcon size={24} className="text-slate-400 dark:text-slate-500"  />
        </div>
      );
  }
}

function ActionStatusBadge({ status, statusName }: { status: number; statusName: string }): ReactElement {
  let styles = "";
  let Icon = CircleIcon;

  switch (status) {
    case 1: // Bekliyor
      styles = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30";
      Icon = Time02Icon;
      break;
    case 2: // Onaylandı
      styles = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30";
      Icon = CheckmarkBadge01Icon;
      break;
    case 3: // Reddedildi
      styles = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30";
      Icon = CancelCircleIcon;
      break;
    case 4: // İptal
      styles = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/20";
      Icon = Shield01Icon;
      break;
    default:
      styles = "bg-slate-50 text-slate-700 border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10";
  }

  return (
    <Badge variant="outline" className={cn("px-2.5 py-1 gap-1.5 font-bold text-[10px] sm:text-[11px] tracking-wider uppercase shadow-sm", styles)}>
      <Icon size={14} />
      {statusName}
    </Badge>
  );
}

function StepCard({ step, locale }: { step: ApprovalFlowStepReportDto; locale: string }): ReactElement {
  const { t } = useTranslation();
  
  const stepStatusLabel =
    step.stepStatus === 'Completed'
      ? t('demand.approvalFlow.stepCompleted')
      : step.stepStatus === 'InProgress'
        ? t('demand.approvalFlow.stepInProgress')
        : step.stepStatus === 'Rejected'
          ? t('demand.approvalFlow.stepRejected')
          : t('demand.approvalFlow.stepNotStarted');

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl shadow-sm transition-all duration-300 group ml-6 sm:ml-12">
      {/* Timeline connector dot */}
      <div className="absolute -left-[29px] sm:-left-[53px] top-6 h-4 w-4 rounded-full border-4 border-white dark:border-[#130822] bg-slate-300 dark:bg-slate-600 z-10 shadow-sm group-hover:bg-indigo-400 transition-colors"></div>

      <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
        <StepStatusIcon stepStatus={step.stepStatus} />
        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            {step.stepName}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn(
              "text-sm font-semibold",
              step.stepStatus === 'Completed' ? "text-emerald-600 dark:text-emerald-400" :
              step.stepStatus === 'InProgress' ? "text-amber-600 dark:text-amber-500" :
              step.stepStatus === 'Rejected' ? "text-rose-600 dark:text-rose-400" :
              "text-slate-500 dark:text-slate-400"
            )}>
              {stepStatusLabel}
            </span>
          </div>
        </div>
      </div>

      {step.actions.length > 0 && (
        <div className="p-4 sm:p-5 bg-transparent">
          <div className="grid grid-cols-1 gap-3">
            {step.actions.map((action: ApprovalActionDetailDto, index) => (
              <div
                key={`${action.userId}-${action.actionDate ?? index}`}
                className="relative flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-slate-100 dark:border-white/5 bg-white dark:bg-white/5 p-4 transition-all duration-200 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:shadow-md"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Premium Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-100 to-purple-100 dark:from-indigo-500/20 dark:to-purple-500/20 text-indigo-700 dark:text-indigo-300 font-bold text-sm border border-indigo-200/50 dark:border-indigo-500/30 shadow-inner">
                    {getInitials(action.userFullName || `U${action.userId}`)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5 text-sm">
                      <UserIcon size={14} className="text-slate-400" />
                      {action.userFullName || `Kullanıcı #${action.userId}`}
                    </span>
                    {action.userEmail && (
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                        <Mail01Icon size={12} />
                        {action.userEmail}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-1.5 border-t sm:border-t-0 border-slate-100 dark:border-white/5 pt-3 sm:pt-0">
                  <ActionStatusBadge status={action.status} statusName={action.statusName} />
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 px-2 py-1 rounded-md">
                    <Calendar01Icon size={12} />
                    {formatActionDate(action.actionDate, locale)}
                  </span>
                </div>

                {/* Ret Nedeni Kutusu */}
                {action.rejectedReason && (
                  <div className="w-full sm:col-span-2 mt-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 sm:p-4 border border-rose-100 dark:border-rose-500/20">
                    <div className="flex items-start gap-2.5">
                      <Alert02Icon size={18} className="text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="block text-[11px] font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider mb-1">
                          Ret Gerekçesi
                        </span>
                        <p className="text-sm font-medium text-rose-700 dark:text-rose-200 leading-relaxed">
                          {action.rejectedReason}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DemandApprovalFlowTab({ demandId }: DemandApprovalFlowTabProps): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: report, isLoading, error } = useDemandApprovalFlowReport(demandId);

  // Skeleton Loading Durumu
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-4">
        <Skeleton className="h-24 w-full rounded-2xl bg-slate-100 dark:bg-white/5" />
        <div className="relative space-y-6">
          <div className="absolute left-[19px] sm:left-[43px] top-6 bottom-6 w-[2px] bg-slate-200 dark:bg-white/10"></div>
          {[1, 2].map((i) => (
            <div key={i} className="ml-6 sm:ml-12 rounded-2xl border border-slate-200 dark:border-white/10 p-5 space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Şık Hata Durumu
  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <Alert variant="destructive" className="rounded-2xl border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/20 dark:bg-[#1a0a10] dark:text-rose-300 shadow-sm p-5">
          <Alert02Icon size={24} className="mb-1"  />
          <div className="ml-2">
            <h5 className="font-bold text-base mb-1">{t('demand.approvalFlow.errorTitle', { defaultValue: 'Hata Oluştu' })}</h5>
            <AlertDescription className="font-medium text-sm">
              {error.message}
            </AlertDescription>
          </div>
        </Alert>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 p-8 text-center">
        <CircleIcon size={32} className="text-slate-300 dark:text-slate-600 mb-3" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">{t('demand.approvalFlow.noData')}</p>
      </div>
    );
  }

  // Premium Empty State (Başlamadı)
  if (!report.hasApprovalRequest) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] rounded-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl p-8 text-center shadow-sm max-w-4xl mx-auto">
        <div className="h-20 w-20 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center mb-5 ring-1 ring-slate-200 dark:ring-white/10 shadow-inner">
          <Time02Icon size={36} className="text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Onay Süreci Başlamadı
        </h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
          {t('demand.approvalFlow.notStarted')}
        </p>
      </div>
    );
  }

  const dto = report as DemandApprovalFlowReportDto;

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      
      {/* Üst Özet Kartı */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#1a1025]/80 p-5 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Onay Akışı Durumu
          </h2>
          {dto.flowDescription && (
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {dto.flowDescription}
            </p>
          )}
        </div>
        {dto.overallStatusName && (
          <div className={cn(
            "px-4 py-2 rounded-xl text-sm font-bold border shadow-sm inline-flex items-center justify-center text-center",
            dto.overallStatus === 2 ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30" :
            dto.overallStatus === 3 ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30" :
            "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30"
          )}>
            {dto.overallStatusName}
          </div>
        )}
      </div>

      {/* Genel Ret Nedeni Varsa */}
      {dto.rejectedReason && (
        <Alert variant="destructive" className="rounded-2xl border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/5 shadow-sm p-5">
          <Alert02Icon size={24} className="text-rose-600 dark:text-rose-500 mt-1" />
          <div className="ml-3">
            <h5 className="text-xs font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider mb-1.5">
              Süreç İptal Nedeni
            </h5>
            <AlertDescription className="text-rose-700 dark:text-rose-200 font-medium text-sm leading-relaxed">
              {dto.rejectedReason}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Timeline Adımları */}
      <div className={cn('relative space-y-8 pt-4', !dto.steps?.length && 'hidden')}>
        {/* Dikey Çizgi (Timeline) */}
        <div className="absolute left-[19px] sm:left-[43px] top-6 bottom-10 w-[2px] bg-linear-to-b from-slate-200 via-slate-200 to-transparent dark:from-white/10 dark:via-white/10"></div>
        
        {dto.steps?.map((step) => (
          <div key={step.stepOrder} className="relative z-10">
            <StepCard step={step} locale={i18n.language} />
          </div>
        ))}
      </div>
      
    </div>
  );
}