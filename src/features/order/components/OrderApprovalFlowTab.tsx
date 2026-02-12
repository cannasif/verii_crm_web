import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOrderApprovalFlowReport } from '../hooks/useOrderApprovalFlowReport';
import type { OrderApprovalFlowReportDto, ApprovalFlowStepReportDto, ApprovalActionDetailDto } from '../types/order-types';
import { CheckCircle2, Clock, XCircle, Circle, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderApprovalFlowTabProps {
  orderId: number;
}

function formatActionDate(value: string | null | undefined, locale: string): string {
  if (!value) return '—';
  try {
    const d = new Date(value);
    return d.toLocaleString(locale, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return value;
  }
}

function StepStatusIcon({ stepStatus }: { stepStatus: ApprovalFlowStepReportDto['stepStatus'] }): ReactElement {
  switch (stepStatus) {
    case 'Completed':
      return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />;
    case 'InProgress':
      return <Clock className="h-5 w-5 text-amber-600 dark:text-amber-500 animate-pulse" />;
    case 'Rejected':
      return <XCircle className="h-5 w-5 text-red-600 dark:text-red-500" />;
    default:
      return <Circle className="h-5 w-5 text-muted-foreground" />;
  }
}

function ActionStatusBadge({ status, statusName }: { status: number; statusName: string }): ReactElement {
  const variant = status === 2 ? 'default' : status === 3 ? 'destructive' : status === 4 ? 'secondary' : status === 1 ? 'secondary' : 'outline';
  const className = status === 4 ? 'bg-zinc-500/80 hover:bg-zinc-600/80 text-white border-0' : undefined;
  return <Badge variant={variant} className={className}>{statusName}</Badge>;
}

function StepCard({ step, locale }: { step: ApprovalFlowStepReportDto; locale: string }): ReactElement {
  const { t } = useTranslation();
  const stepStatusLabel =
    step.stepStatus === 'Completed'
      ? t('order.approvalFlow.stepCompleted')
      : step.stepStatus === 'InProgress'
        ? t('order.approvalFlow.stepInProgress')
        : step.stepStatus === 'Rejected'
          ? t('order.approvalFlow.stepRejected')
          : t('order.approvalFlow.stepNotStarted');

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <StepStatusIcon stepStatus={step.stepStatus} />
        <div className="flex-1">
          <h4 className="font-semibold">{step.stepName}</h4>
          <p className="text-sm text-muted-foreground">{stepStatusLabel}</p>
        </div>
      </CardHeader>
      {step.actions.length > 0 && (
        <CardContent className="pt-0">
          <ul className="space-y-3">
            {step.actions.map((action: ApprovalActionDetailDto) => (
              <li
                key={`${action.userId}-${action.actionDate ?? 'waiting'}`}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-zinc-900/30 p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{action.userFullName || `User #${action.userId}`}</p>
                  {action.userEmail && (
                    <p className="text-xs text-muted-foreground truncate">{action.userEmail}</p>
                  )}
                </div>
                <ActionStatusBadge status={action.status} statusName={action.statusName} />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatActionDate(action.actionDate, locale)}
                </span>
                {action.rejectedReason && (
                  <p className="w-full text-sm text-red-600 dark:text-red-400 mt-1">{action.rejectedReason}</p>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}

export function OrderApprovalFlowTab({ orderId }: OrderApprovalFlowTabProps): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: report, isLoading, error } = useOrderApprovalFlowReport(orderId);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-pink-500" />
        <p className="text-sm text-muted-foreground">{t('order.approvalFlow.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!report) {
    return (
      <p className="text-muted-foreground py-8 text-center">{t('order.approvalFlow.noData')}</p>
    );
  }

  if (!report.hasApprovalRequest) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-zinc-900/30 p-8 text-center">
        <p className="text-muted-foreground">
          {t('order.approvalFlow.notStarted')}
        </p>
      </div>
    );
  }

  const dto = report as OrderApprovalFlowReportDto;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {dto.overallStatusName && (
          <Badge
            variant={dto.overallStatus === 2 ? 'default' : dto.overallStatus === 3 ? 'destructive' : 'secondary'}
            className="text-sm"
          >
            {dto.overallStatusName}
          </Badge>
        )}
        {dto.flowDescription && (
          <span className="text-sm text-muted-foreground">{dto.flowDescription}</span>
        )}
      </div>

      {dto.rejectedReason && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{dto.rejectedReason}</AlertDescription>
        </Alert>
      )}

      <div className={cn('space-y-4', !dto.steps?.length && 'hidden')}>
        {dto.steps?.map((step) => (
          <StepCard key={step.stepOrder} step={step} locale={i18n.language} />
        ))}
      </div>
    </div>
  );
}
