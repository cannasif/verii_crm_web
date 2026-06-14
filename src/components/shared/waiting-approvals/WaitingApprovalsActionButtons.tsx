import { type ReactElement } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WaitingApprovalsActionButtonsProps {
  approveLabel: string;
  rejectLabel: string;
  isPending: boolean;
  onApprove: (event: React.MouseEvent) => void;
  onReject: (event: React.MouseEvent) => void;
  className?: string;
}

export function WaitingApprovalsActionButtons({
  approveLabel,
  rejectLabel,
  isPending,
  onApprove,
  onReject,
  className,
}: WaitingApprovalsActionButtonsProps): ReactElement {
  return (
    <div className={className ?? 'flex justify-end gap-2'}>
      <Button
        variant="ghost"
        size="sm"
        onClick={onApprove}
        disabled={isPending}
        className="h-8 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
        title={approveLabel}
      >
        <Check className="h-4 w-4 sm:mr-1.5" />
        <span className="hidden sm:inline font-bold">{approveLabel}</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onReject}
        disabled={isPending}
        className="h-8 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
        title={rejectLabel}
      >
        <X className="h-4 w-4 sm:mr-1.5" />
        <span className="hidden sm:inline font-bold">{rejectLabel}</span>
      </Button>
    </div>
  );
}
