import { type ReactElement, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface CustomerCancellationDialogProps {
  open: boolean;
  title: string;
  description: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  cancelLabel: string;
  confirmLabel: string;
  isPending?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void | Promise<void>;
}

export function CustomerCancellationDialog({
  open,
  title,
  description,
  reasonLabel,
  reasonPlaceholder,
  cancelLabel,
  confirmLabel,
  isPending = false,
  onOpenChange,
  onConfirm,
}: CustomerCancellationDialogProps): ReactElement {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
    }
  }, [open]);

  const handleConfirm = async (): Promise<void> => {
    await onConfirm(reason.trim());
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isPending && onOpenChange(nextOpen)}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="customer-cancellation-reason">
            {reasonLabel}
          </label>
          <Textarea
            id="customer-cancellation-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={reasonPlaceholder}
            maxLength={500}
            rows={5}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">{reason.length}/500</p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button type="button" variant="destructive" onClick={() => void handleConfirm()} disabled={isPending}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
