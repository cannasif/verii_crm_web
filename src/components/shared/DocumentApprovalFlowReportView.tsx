import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  BadgeCheck,
  Calendar,
  CheckCheck,
  Circle,
  Clock,
  Mail,
  Shield,
  User,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DocumentApprovalActionDetail {
  userId: number;
  userFullName: string | null;
  userEmail: string | null;
  status: number;
  statusName: string;
  actionDate: string | null;
  rejectedReason: string | null;
}

export interface DocumentApprovalFlowStep {
  stepOrder: number;
  stepName: string;
  stepStatus: 'NotStarted' | 'InProgress' | 'Completed' | 'Rejected';
  actions: DocumentApprovalActionDetail[];
}

export interface DocumentApprovalFlowReport {
  hasApprovalRequest: boolean;
  overallStatus: number | null;
  overallStatusName: string | null;
  flowDescription: string | null;
  rejectedReason: string | null;
  steps: DocumentApprovalFlowStep[];
}

interface DocumentApprovalFlowReportViewProps {
  translationNamespace: 'quotation' | 'demand' | 'order';
  report: DocumentApprovalFlowReport | null | undefined;
  isLoading: boolean;
  error: Error | null;
  locale: string;
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

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StepStatusIcon({ stepStatus }: { stepStatus: DocumentApprovalFlowStep['stepStatus'] }): ReactElement {
  switch (stepStatus) {
    case 'Completed':
      return (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30 border border-emerald-300 dark:border-emerald-500/50">
          <CheckCheck className="h-6 w-6 text-white" />
        </div>
      );
    case 'InProgress':
      return (
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30 border border-amber-300 dark:border-amber-500/50">
          <div className="absolute inset-0 rounded-2xl border-2 border-amber-400 animate-ping opacity-20" />
          <Clock className="h-6 w-6 text-white animate-pulse" />
        </div>
      );
    case 'Rejected':
      return (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-rose-500 to-red-600 shadow-lg shadow-rose-500/30 border border-rose-300 dark:border-rose-500/50">
          <XCircle className="h-6 w-6 text-white" />
        </div>
      );
    default:
      return (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
          <Circle className="h-6 w-6 text-slate-400 dark:text-slate-500" />
        </div>
      );
  }
}

function ActionStatusBadge({ status, statusName }: { status: number; statusName: string }): ReactElement {
  let styles = '';
  let Icon = Circle;

  switch (status) {
    case 1:
      styles = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30';
      Icon = Clock;
      break;
    case 2:
      styles = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30';
      Icon = BadgeCheck;
      break;
    case 3:
      styles = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30';
      Icon = XCircle;
      break;
    case 4:
      styles = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/20';
      Icon = Shield;
      break;
    default:
      styles = 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10';
  }

  return (
    <Badge variant="outline" className={cn('px-2.5 py-1 gap-1.5 font-bold text-[10px] sm:text-[11px] tracking-wider uppercase shadow-sm', styles)}>
      <Icon className="h-3.5 w-3.5" />
      {statusName}
    </Badge>
  );
}

function StepCard({
  step,
  locale,
  translationNamespace,
}: {
  step: DocumentApprovalFlowStep;
  locale: string;
  translationNamespace: DocumentApprovalFlowReportViewProps['translationNamespace'];
}): ReactElement {
  const { t } = useTranslation([translationNamespace, 'common']);

  const stepStatusLabel =
    step.stepStatus === 'Completed'
      ? t('approvalFlow.stepCompleted')
      : step.stepStatus === 'InProgress'
        ? t('approvalFlow.stepInProgress')
        : step.stepStatus === 'Rejected'
          ? t('approvalFlow.stepRejected')
          : t('approvalFlow.stepNotStarted');

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-600/90 bg-white/70 dark:bg-zinc-950/40 backdrop-blur-xl shadow-sm transition-all duration-300 group ml-6 sm:ml-12">
      <div className="absolute -left-[29px] sm:-left-[53px] top-6 h-4 w-4 rounded-full border-4 border-white dark:border-zinc-950 bg-zinc-300 dark:bg-zinc-600 z-10 shadow-sm group-hover:bg-pink-400 transition-colors" />

      <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 border-b border-zinc-100 dark:border-zinc-700/80 bg-zinc-50/50 dark:bg-zinc-900/40">
        <StepStatusIcon stepStatus={step.stepStatus} />
        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
            {step.stepName}
          </h4>
          <span
            className={cn(
              'text-sm font-semibold mt-1 inline-block',
              step.stepStatus === 'Completed'
                ? 'text-emerald-600 dark:text-emerald-400'
                : step.stepStatus === 'InProgress'
                  ? 'text-amber-600 dark:text-amber-500'
                  : step.stepStatus === 'Rejected'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-zinc-500 dark:text-zinc-400',
            )}
          >
            {stepStatusLabel}
          </span>
        </div>
      </div>

      {step.actions.length > 0 && (
        <div className="p-4 sm:p-5 bg-transparent">
          <div className="grid grid-cols-1 gap-3">
            {step.actions.map((action, index) => (
              <div
                key={`${action.userId}-${action.actionDate ?? index}`}
                className="relative flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-zinc-100 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-4 transition-all duration-200 hover:border-pink-200 dark:hover:border-pink-500/30 hover:shadow-md"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-pink-100 to-purple-100 dark:from-pink-500/20 dark:to-purple-500/20 text-pink-700 dark:text-pink-300 font-bold text-sm border border-pink-200/50 dark:border-pink-500/30 shadow-inner">
                    {getInitials(action.userFullName || `U${action.userId}`)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5 text-sm">
                      <User className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                      {action.userFullName || `Kullanıcı #${action.userId}`}
                    </span>
                    {action.userEmail && (
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1.5 mt-0.5">
                        <Mail className="h-3 w-3 shrink-0" />
                        {action.userEmail}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-1.5 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-700/80 pt-3 sm:pt-0">
                  <ActionStatusBadge status={action.status} statusName={action.statusName} />
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700/80 px-2 py-1 rounded-md">
                    <Calendar className="h-3 w-3 shrink-0" />
                    {formatActionDate(action.actionDate, locale)}
                  </span>
                </div>

                {action.rejectedReason && (
                  <div className="w-full sm:col-span-2 mt-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 sm:p-4 border border-rose-100 dark:border-rose-500/20">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="block text-[11px] font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider mb-1">
                          {t('approvalFlow.rejectedReasonLabel', { defaultValue: 'Ret Gerekçesi' })}
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

export function DocumentApprovalFlowReportView({
  translationNamespace,
  report,
  isLoading,
  error,
  locale,
}: DocumentApprovalFlowReportViewProps): ReactElement {
  const { t } = useTranslation([translationNamespace, 'common']);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-4">
        <Skeleton className="h-24 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900/50" />
        <div className="relative space-y-6">
          <div className="absolute left-[19px] sm:left-[43px] top-6 bottom-6 w-[2px] bg-zinc-200 dark:bg-zinc-700" />
          {[1, 2].map((i) => (
            <div key={i} className="ml-6 sm:ml-12 rounded-2xl border border-zinc-200 dark:border-zinc-600/90 p-5 space-y-4">
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

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <Alert variant="destructive" className="rounded-2xl border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/20 dark:bg-rose-950/30 dark:text-rose-300 shadow-sm p-5">
          <AlertTriangle className="h-6 w-6 mb-1" />
          <div className="ml-2">
            <h5 className="font-bold text-base mb-1">
              {t('approvalFlow.errorTitle', { defaultValue: 'Hata Oluştu' })}
            </h5>
            <AlertDescription className="font-medium text-sm">{error.message}</AlertDescription>
          </div>
        </Alert>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-600/90 bg-zinc-50/50 dark:bg-zinc-900/30 p-8 text-center">
        <Circle className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-3" />
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">
          {t('approvalFlow.noData')}
        </p>
      </div>
    );
  }

  if (!report.hasApprovalRequest) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] rounded-2xl border border-zinc-200 dark:border-zinc-600/90 bg-white/70 dark:bg-zinc-950/40 backdrop-blur-xl p-8 text-center shadow-sm max-w-4xl mx-auto">
        <div className="h-20 w-20 rounded-full bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-center mb-5 ring-1 ring-zinc-200 dark:ring-zinc-700 shadow-inner">
          <Clock className="h-9 w-9 text-zinc-400 dark:text-zinc-500" />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
          {t('approvalFlow.notStartedTitle', { defaultValue: 'Onay Süreci Başlamadı' })}
        </h3>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto font-medium">
          {t('approvalFlow.notStarted')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-600/90 bg-white/90 dark:bg-zinc-950/50 p-5 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
            {t('approvalFlow.statusTitle', { defaultValue: 'Onay Akışı Durumu' })}
          </h2>
          {report.flowDescription && (
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{report.flowDescription}</p>
          )}
        </div>
        {report.overallStatusName && (
          <div
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-bold border shadow-sm inline-flex items-center justify-center text-center',
              report.overallStatus === 2
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                : report.overallStatus === 3
                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30'
                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
            )}
          >
            {report.overallStatusName}
          </div>
        )}
      </div>

      {report.rejectedReason && (
        <Alert variant="destructive" className="rounded-2xl border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/5 shadow-sm p-5">
          <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-500 mt-1" />
          <div className="ml-3">
            <h5 className="text-xs font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider mb-1.5">
              {t('approvalFlow.processRejectedReasonLabel', { defaultValue: 'Süreç İptal Nedeni' })}
            </h5>
            <AlertDescription className="text-rose-700 dark:text-rose-200 font-medium text-sm leading-relaxed">
              {report.rejectedReason}
            </AlertDescription>
          </div>
        </Alert>
      )}

      <div className={cn('relative space-y-8 pt-4', !report.steps?.length && 'hidden')}>
        <div className="absolute left-[19px] sm:left-[43px] top-6 bottom-10 w-[2px] bg-linear-to-b from-zinc-200 via-zinc-200 to-transparent dark:from-zinc-700 dark:via-zinc-700" />

        {report.steps?.map((step) => (
          <div key={step.stepOrder} className="relative z-10">
            <StepCard step={step} locale={locale} translationNamespace={translationNamespace} />
          </div>
        ))}
      </div>
    </div>
  );
}
