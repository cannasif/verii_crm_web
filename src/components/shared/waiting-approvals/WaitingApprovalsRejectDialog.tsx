import { type ReactElement } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface WaitingApprovalsRejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  cancelLabel: string;
  confirmLabel: string;
  loadingLabel: string;
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

export function WaitingApprovalsRejectDialog({
  open,
  onOpenChange,
  title,
  description,
  reasonLabel,
  reasonPlaceholder,
  cancelLabel,
  confirmLabel,
  loadingLabel,
  rejectReason,
  onRejectReasonChange,
  onConfirm,
  onCancel,
  isPending,
}: WaitingApprovalsRejectDialogProps): ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-[#130822] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white w-[90%] sm:w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-0 gap-0">
        <DialogHeader className="flex flex-col items-center gap-4 text-center pb-6 pt-10 px-6">
          <div className="h-20 w-20 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-2 animate-in zoom-in duration-300 ring-1 ring-red-100 dark:ring-red-500/20">
            <ShieldAlert size={36} className="text-red-600 dark:text-red-500" />
          </div>
          <div className="space-y-2">
            <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
              {title}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto text-sm leading-relaxed">
              {description}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="p-6 pt-2">
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
              {reasonLabel}
            </label>
            <Textarea
              placeholder={reasonPlaceholder}
              value={rejectReason}
              onChange={(event) => onRejectReasonChange(event.target.value)}
              maxLength={500}
              rows={4}
              className="resize-none rounded-xl border-slate-200 dark:border-white/10 bg-stone-50 dark:bg-[#0f0a18] text-sm shadow-sm focus-visible:ring-red-500/50 focus-visible:border-red-500/50"
            />
            <div className="flex justify-end">
              <span className="text-xs text-slate-400">{rejectReason.length}/500</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-row gap-3 justify-center p-6 bg-stone-50/80 dark:bg-[#1a1025]/50 border-t border-slate-200 dark:border-white/5">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 h-12 rounded-xl border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/5 font-semibold"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 h-12 rounded-xl bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] font-bold"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                {loadingLabel}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <X className="h-4 w-4" />
                {confirmLabel}
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
