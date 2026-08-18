import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Loader2,
  TriangleAlert,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import './process-progress-modal.css';

export type ProcessProgressStatus = 'running' | 'success' | 'error';
export type ProcessProgressStepStatus = 'pending' | 'active' | 'completed' | 'error';

export interface ProcessProgressStep {
  id: string;
  label: string;
  status: ProcessProgressStepStatus;
}

export interface ProcessProgressModalLabels {
  runStatus: string;
  successStatus: string;
  errorStatus: string;
  technicalDetails: string;
  retry: string;
  saveDraft: string;
  viewRecord: string;
  close: string;
  continueInBackground: string;
  progressLabel: string;
}

export interface ProcessProgressModalProps {
  open: boolean;
  status: ProcessProgressStatus;
  route: string;
  eyebrow: string;
  title: string;
  description: string;
  operationLabel?: string;
  operationId?: string;
  steps: ProcessProgressStep[];
  icon?: ReactNode;
  progress?: number | null;
  resultLabel?: string;
  resultValue?: string | null;
  errorMessage?: string | null;
  technicalDetails?: string | null;
  labels: ProcessProgressModalLabels;
  minimumDelayMs?: number;
  allowCloseWhileRunning?: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry?: () => void;
  onSaveDraft?: () => void;
  onViewRecord?: () => void;
}

export interface ProcessStepPacerOptions {
  running: boolean;
  stepCount: number;
  resetKey?: string | number;
  intervalMs?: number;
}

/**
 * Advances only the terminal presentation when an API exposes a single running state.
 * Completion and failure must still come from the real operation response.
 */
export function useProcessStepPacer({
  running,
  stepCount,
  resetKey,
  intervalMs = 700,
}: ProcessStepPacerOptions): number {
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  useEffect(() => {
    setActiveStepIndex(0);
    if (!running || stepCount <= 1) return;

    const timer = window.setInterval(() => {
      setActiveStepIndex((current) => {
        const next = Math.min(current + 1, stepCount - 1);
        if (next === stepCount - 1) window.clearInterval(timer);
        return next;
      });
    }, Math.max(100, intervalMs));

    return () => window.clearInterval(timer);
  }, [intervalMs, resetKey, running, stepCount]);

  return activeStepIndex;
}

function StepStatusIcon({ status }: { status: ProcessProgressStepStatus }): ReactElement {
  if (status === 'completed') {
    return <Check className="size-3.5" strokeWidth={2.5} aria-hidden />;
  }
  if (status === 'active') {
    return <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />;
  }
  if (status === 'error') {
    return <X className="size-3.5" strokeWidth={2.5} aria-hidden />;
  }
  return <Circle className="size-2.5" fill="currentColor" strokeWidth={0} aria-hidden />;
}

export function ProcessProgressModal({
  open,
  status,
  route,
  eyebrow,
  title,
  description,
  operationLabel,
  operationId,
  steps,
  icon,
  progress,
  resultLabel,
  resultValue,
  errorMessage,
  technicalDetails,
  labels,
  minimumDelayMs = 0,
  allowCloseWhileRunning = false,
  onOpenChange,
  onRetry,
  onSaveDraft,
  onViewRecord,
}: ProcessProgressModalProps): ReactElement {
  const [visible, setVisible] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const isRunning = status === 'running';
  const isSuccess = status === 'success';
  const canDismiss = !isRunning || allowCloseWhileRunning;
  const normalizedProgress = typeof progress === 'number'
    ? Math.min(100, Math.max(0, progress))
    : null;

  useEffect(() => {
    if (!open) {
      startedAtRef.current = null;
      setVisible(false);
      return;
    }

    if (startedAtRef.current === null) {
      startedAtRef.current = performance.now();
    }

    if (status === 'error') {
      setVisible(true);
      return;
    }

    if (status === 'success') {
      if (visible) return;
      const elapsed = performance.now() - startedAtRef.current;
      if (elapsed >= minimumDelayMs) setVisible(true);
      return;
    }

    const elapsed = performance.now() - startedAtRef.current;
    const remainingDelay = Math.max(0, minimumDelayMs - elapsed);
    const timer = window.setTimeout(() => setVisible(true), remainingDelay);
    return () => window.clearTimeout(timer);
  }, [minimumDelayMs, open, status, visible]);

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen && !canDismiss) return;
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open && visible} onOpenChange={handleOpenChange}>
      <DialogContent
        data-process-progress-modal
        data-process-status={status}
        showCloseButton={canDismiss && !isRunning}
        overlayClassName="crm-process-progress__overlay"
        aria-describedby="crm-process-progress-description"
        onEscapeKeyDown={(event) => {
          if (!canDismiss) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (!canDismiss) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (!canDismiss) event.preventDefault();
        }}
        className="crm-process-progress"
      >
        <div className="crm-process-progress__grid" aria-hidden />
        <div className="crm-process-progress__glow" aria-hidden />

        <header className="crm-process-progress__chrome">
          <span className="crm-process-progress__traffic" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className="crm-process-progress__route">{route}</span>
          <span className="crm-process-progress__run-state">
            {isRunning ? (
              <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden />
            ) : isSuccess ? (
              <CheckCircle2 className="size-3" aria-hidden />
            ) : (
              <TriangleAlert className="size-3" aria-hidden />
            )}
            {isRunning ? labels.runStatus : isSuccess ? labels.successStatus : labels.errorStatus}
          </span>
        </header>

        <div className="crm-process-progress__body">
          <div className="crm-process-progress__hero-icon" aria-hidden>
            {isSuccess ? <CheckCircle2 /> : status === 'error' ? <TriangleAlert /> : (icon ?? <Loader2 />)}
            {isRunning ? <span className="crm-process-progress__hero-orbit" /> : null}
          </div>

          <p className="crm-process-progress__eyebrow">&gt; {eyebrow}</p>
          <DialogTitle className="crm-process-progress__title">{title}</DialogTitle>
          <DialogDescription id="crm-process-progress-description" className="crm-process-progress__description">
            {description}
          </DialogDescription>

          {operationId ? (
            <div className="crm-process-progress__operation-badge" data-testid="process-operation-id">
              <span>{operationLabel}</span>
              <strong>{operationId}</strong>
            </div>
          ) : null}

          {isSuccess && resultValue ? (
            <div className="crm-process-progress__result" role="status">
              <span>{resultLabel}</span>
              <strong>{resultValue}</strong>
            </div>
          ) : null}

          {status === 'error' && errorMessage ? (
            <div className="crm-process-progress__error" role="alert">
              <span className="crm-process-progress__error-tag">ERR</span>
              <span>{errorMessage}</span>
            </div>
          ) : null}

          <div
            className={cn(
              'crm-process-progress__progress',
              normalizedProgress === null && 'crm-process-progress__progress--indeterminate',
            )}
            role="progressbar"
            aria-label={labels.progressLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={normalizedProgress ?? undefined}
          >
            <span
              className="crm-process-progress__progress-value"
              style={normalizedProgress === null ? undefined : { width: `${normalizedProgress}%` }}
            />
          </div>

          <ol className="crm-process-progress__steps" aria-live="polite">
            {steps.map((step, index) => (
              <li key={step.id} data-step-status={step.status}>
                <span className="crm-process-progress__step-index" aria-hidden>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="crm-process-progress__step-icon">
                  <StepStatusIcon status={step.status} />
                </span>
                <span className="crm-process-progress__step-label">{step.label}</span>
              </li>
            ))}
          </ol>

          {status === 'error' && technicalDetails ? (
            <details className="crm-process-progress__technical">
              <summary>
                <ChevronDown className="size-3.5" aria-hidden />
                {labels.technicalDetails}
              </summary>
              <pre>{technicalDetails}</pre>
            </details>
          ) : null}
        </div>

        <DialogFooter className="crm-process-progress__actions">
          {isRunning && allowCloseWhileRunning ? (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {labels.continueInBackground}
            </Button>
          ) : null}
          {status === 'error' && onSaveDraft ? (
            <Button type="button" variant="outline" onClick={onSaveDraft}>
              {labels.saveDraft}
            </Button>
          ) : null}
          {status === 'error' && onRetry ? (
            <Button type="button" onClick={onRetry}>
              {labels.retry}
            </Button>
          ) : null}
          {isSuccess && onViewRecord ? (
            <Button type="button" onClick={onViewRecord}>
              {labels.viewRecord}
            </Button>
          ) : null}
          {!isRunning ? (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {labels.close}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
