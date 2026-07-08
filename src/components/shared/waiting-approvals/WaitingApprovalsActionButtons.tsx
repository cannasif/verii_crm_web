import { type ReactElement } from 'react';
import { Check, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WaitingApprovalsActionButtonsProps {
  approveLabel: string;
  rejectLabel: string;
  detailLabel: string;
  isPending: boolean;
  onApprove: (event: React.MouseEvent) => void;
  onReject: (event: React.MouseEvent) => void;
  onDetail: (event: React.MouseEvent) => void;
  className?: string;
}

export function WaitingApprovalsActionButtons({
  approveLabel,
  rejectLabel,
  detailLabel,
  isPending,
  onApprove,
  onReject,
  onDetail,
  className,
}: WaitingApprovalsActionButtonsProps): ReactElement {
  return (
    <div className={className ?? 'flex justify-end items-center gap-2'}>
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
        className="h-8 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
        title={rejectLabel}
      >
        <X className="h-4 w-4 sm:mr-1.5" />
        <span className="hidden sm:inline font-bold">{rejectLabel}</span>
      </Button>
      <span className="mx-1 h-8 w-px shrink-0 bg-border" aria-hidden="true" />
      <Button
        variant="ghost"
        size="sm"
        onClick={onDetail}
        className="h-8 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-800 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
        title={detailLabel}
      >
        <Eye className="h-4 w-4 sm:mr-1.5" />
        <span className="hidden sm:inline font-bold">{detailLabel}</span>
      </Button>
    </div>
  );
}
