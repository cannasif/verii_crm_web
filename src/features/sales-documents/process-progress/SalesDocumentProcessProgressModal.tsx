import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { DatabaseZap, FileCheck2 } from 'lucide-react';
import {
  ProcessProgressModal,
  useProcessStepPacer,
  type ProcessProgressStatus,
  type ProcessProgressStep,
} from '@/components/shared';

export type SalesDocumentKind = 'demand' | 'quotation' | 'order';
export type SalesDocumentProcessKind = 'start-approval' | 'approve-and-sync';
export type SalesDocumentProcessOutcome =
  | 'approval-started'
  | 'approval-continued'
  | 'approved'
  | 'erp-completed';

export interface SalesDocumentProcessProgressModalProps {
  open: boolean;
  status: ProcessProgressStatus;
  documentKind: SalesDocumentKind;
  processKind: SalesDocumentProcessKind;
  processKey: string;
  documentId: number;
  documentNo?: string | null;
  erpNumber?: string | null;
  outcome?: SalesDocumentProcessOutcome | null;
  errorMessage?: string | null;
  technicalDetails?: string | null;
  stepIntervalMs?: number;
  onOpenChange: (open: boolean) => void;
  onRetry?: () => void;
  onViewDocument?: () => void;
}

export interface SalesDocumentProcessErrorDescription {
  message: string;
  technicalDetails: string | null;
}

export interface SalesDocumentSnapshot {
  status?: number | null;
  isERPIntegrated?: boolean;
  erpIntegrationNumber?: string | null;
}

export interface ApprovalDecisionSnapshot {
  stepOrder: number;
  approvedByUserId: number;
}

export interface ApprovalFlowReportSnapshot {
  steps: Array<{
    stepOrder: number;
    actions: Array<{ userId: number; status: number }>;
  }>;
}

const START_APPROVAL_STEP_KEYS = [
  'validateRecord',
  'validateRequiredFields',
  'resolveNextAction',
  'prepareApprovalSteps',
  'resolveApprovers',
  'createApprovalRequest',
  'prepareNotifications',
  'checkCompletionAction',
] as const;

const APPROVE_STEP_KEYS = [
  'validateAuthority',
  'validateApprovalRequest',
  'recordDecision',
  'evaluateRemainingApprovals',
  'prepareFinalStatus',
  'checkErpAction',
  'verifyErpResult',
  'updateIntegrationStatus',
] as const;

function readErrorPayload(error: unknown): Record<string, unknown> | null {
  if (!(error instanceof Error) || !error.message) return null;
  try {
    const parsed = JSON.parse(error.message) as unknown;
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function describeSalesDocumentProcessError(
  error: unknown,
  fallbackMessage: string,
): SalesDocumentProcessErrorDescription {
  const payload = readErrorPayload(error);
  const errors = Array.isArray(payload?.errors)
    ? payload.errors.filter((item): item is string => typeof item === 'string')
    : [];
  const payloadMessage = typeof payload?.message === 'string'
    ? payload.message
    : typeof payload?.exceptionMessage === 'string'
      ? payload.exceptionMessage
      : null;
  const message = errors[0]
    || payloadMessage
    || (error instanceof Error && error.message ? error.message : fallbackMessage);
  const technicalDetails = payload
    ? JSON.stringify(payload, null, 2).slice(0, 5000)
    : error instanceof Error && error.message !== message
      ? error.message.slice(0, 5000)
      : null;

  return { message, technicalDetails };
}

export function resolveStartApprovalOutcome(
  document: SalesDocumentSnapshot,
): SalesDocumentProcessOutcome | null {
  if (document.isERPIntegrated) return 'erp-completed';
  const status = Number(document.status ?? 0);
  if (status === 1) return 'approval-started';
  if (status === 2) return 'approved';
  return null;
}

export function resolveApprovalDecisionOutcome(
  document: SalesDocumentSnapshot,
): SalesDocumentProcessOutcome | null {
  if (document.isERPIntegrated) return 'erp-completed';
  const status = Number(document.status ?? 0);
  if (status === 1) return 'approval-continued';
  if (status === 2) return 'approved';
  return null;
}

export function wasApprovalDecisionRecorded(
  report: ApprovalFlowReportSnapshot,
  decision: ApprovalDecisionSnapshot,
): boolean {
  return report.steps.some((step) =>
    step.stepOrder === decision.stepOrder
    && step.actions.some((action) =>
      action.userId === decision.approvedByUserId && Number(action.status) === 2));
}

export function SalesDocumentProcessProgressModal({
  open,
  status,
  documentKind,
  processKind,
  processKey,
  documentId,
  documentNo,
  erpNumber,
  outcome,
  errorMessage,
  technicalDetails,
  stepIntervalMs = 700,
  onOpenChange,
  onRetry,
  onViewDocument,
}: SalesDocumentProcessProgressModalProps): ReactElement {
  const { t, i18n } = useTranslation('common');
  const documentName = t(`salesDocumentProcess.documentTypes.${documentKind}`);
  const documentNameUpper = documentName.toLocaleUpperCase(i18n.language);
  const stepScope = processKind === 'start-approval' ? 'start' : 'approve';
  const stepKeys = processKind === 'start-approval' ? START_APPROVAL_STEP_KEYS : APPROVE_STEP_KEYS;
  const stepLabels = stepKeys.map((key) => t(
    `salesDocumentProcess.${stepScope}.steps.${key}`,
    { document: documentName },
  ));
  const activeStepIndex = useProcessStepPacer({
    running: open && status === 'running',
    stepCount: stepLabels.length,
    resetKey: processKey,
    intervalMs: stepIntervalMs,
  });
  const isErpResult = outcome === 'erp-completed' || Boolean(erpNumber);
  const isErpFailure = status === 'error'
    && /\b(?:netsis|erp)\b/i.test(`${errorMessage ?? ''} ${technicalDetails ?? ''}`);
  const steps: ProcessProgressStep[] = stepLabels.map((label, index) => ({
    id: `${documentKind}-${processKind}-${index}`,
    label,
    status: status === 'success'
      ? 'completed'
      : status === 'error' && index === activeStepIndex
        ? 'error'
        : index < activeStepIndex
          ? 'completed'
          : status === 'running' && index === activeStepIndex
            ? 'active'
            : 'pending',
  }));

  const runningTitle = t(`salesDocumentProcess.${stepScope}.runningTitle`, { document: documentNameUpper });
  const successTitle = isErpResult
    ? t('salesDocumentProcess.erpSuccessTitle')
    : outcome === 'approval-started'
      ? t('salesDocumentProcess.approvalStartedTitle')
      : outcome === 'approval-continued'
        ? t('salesDocumentProcess.approvalContinuedTitle')
        : t(`salesDocumentProcess.${stepScope}.successTitle`, { document: documentNameUpper });
  const title = status === 'running'
    ? runningTitle
    : status === 'success'
      ? successTitle
      : isErpFailure
        ? t('salesDocumentProcess.erpErrorTitle')
        : t('salesDocumentProcess.approvalErrorTitle');
  const description = status === 'running'
    ? t('salesDocumentProcess.runningDescription', { document: documentName })
    : status === 'success'
      ? isErpResult
        ? t('salesDocumentProcess.erpSuccessDescription', { document: documentName })
        : outcome === 'approval-continued'
          ? t('salesDocumentProcess.approvalContinuedDescription', { document: documentName })
          : t('salesDocumentProcess.successDescription', { document: documentName })
      : t('salesDocumentProcess.errorDescription');

  return (
    <ProcessProgressModal
      open={open}
      status={status}
      route={`CRM://APPROVAL/ERP/${documentKind.toUpperCase()}${processKind === 'approve-and-sync' ? '/DECISION' : ''}`}
      eyebrow={t(`salesDocumentProcess.${stepScope}.eyebrow`, { document: documentNameUpper })}
      title={title}
      description={description}
      operationLabel={t('salesDocumentProcess.documentNo', { document: documentNameUpper })}
      operationId={documentNo?.trim() || `#${documentId}`}
      icon={processKind === 'start-approval' ? <FileCheck2 /> : <DatabaseZap />}
      progress={status === 'success' ? 100 : null}
      steps={steps}
      resultLabel={isErpResult
        ? t('salesDocumentProcess.erpDocumentNo')
        : t('salesDocumentProcess.operationResult')}
      resultValue={status === 'success'
        ? erpNumber || (outcome === 'approval-started'
          ? t('salesDocumentProcess.approvalStarted')
          : outcome === 'approval-continued'
            ? t('salesDocumentProcess.approvalContinued')
            : outcome === 'approved'
              ? t('salesDocumentProcess.approved')
              : t('salesDocumentProcess.approvalCompleted'))
        : null}
      errorMessage={errorMessage}
      technicalDetails={technicalDetails}
      labels={{
        runStatus: t('salesDocumentProcess.running'),
        successStatus: t('salesDocumentProcess.completed'),
        errorStatus: t('salesDocumentProcess.failed'),
        technicalDetails: t('salesDocumentProcess.technicalDetail'),
        retry: t('salesDocumentProcess.retry'),
        saveDraft: t('salesDocumentProcess.keepRecord'),
        viewRecord: t('salesDocumentProcess.viewDocument', { document: documentName }),
        close: t('close'),
        continueInBackground: t('salesDocumentProcess.continueInBackground'),
        progressLabel: t('salesDocumentProcess.progressLabel', { document: documentName }),
      }}
      onOpenChange={onOpenChange}
      onRetry={onRetry}
      onSaveDraft={() => onOpenChange(false)}
      onViewRecord={onViewDocument}
    />
  );
}
