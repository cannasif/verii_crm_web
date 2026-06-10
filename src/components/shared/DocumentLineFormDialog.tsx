import { type ReactElement, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DOCUMENT_LINE_DIALOG_BODY_CLASS,
  DOCUMENT_LINE_DIALOG_CLOSE_BUTTON_CLASS,
  DOCUMENT_LINE_DIALOG_CONTENT_CLASS,
  DOCUMENT_LINE_DIALOG_GRADIENT_OVERLAY_CLASS,
  DOCUMENT_LINE_DIALOG_HEADER_CLASS,
  DOCUMENT_LINE_DIALOG_ICON_WRAP_CLASS,
  DOCUMENT_LINE_DIALOG_ICON_WRAP_EDIT_CLASS,
} from '@/lib/document-line-dialog-styles';
import { cn } from '@/lib/utils';

interface DocumentLineFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  icon: ReactNode;
  variant?: 'add' | 'edit';
  onClose: () => void;
  children: ReactNode;
}

export function DocumentLineFormDialog({
  open,
  onOpenChange,
  title,
  icon,
  variant = 'add',
  onClose,
  children,
}: DocumentLineFormDialogProps): ReactElement {
  const { t } = useTranslation('common');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className={DOCUMENT_LINE_DIALOG_CONTENT_CLASS}>
        <div className={DOCUMENT_LINE_DIALOG_GRADIENT_OVERLAY_CLASS} aria-hidden />
        <button
          type="button"
          onClick={onClose}
          aria-label={t('cancel', { defaultValue: 'İptal' })}
          className={DOCUMENT_LINE_DIALOG_CLOSE_BUTTON_CLASS}
        >
          <X className="h-4 w-4" />
        </button>
        <DialogHeader className={DOCUMENT_LINE_DIALOG_HEADER_CLASS}>
          <DialogTitle className="flex items-center gap-2.5 text-left text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100 sm:text-base">
            <div className={cn(variant === 'edit' ? DOCUMENT_LINE_DIALOG_ICON_WRAP_EDIT_CLASS : DOCUMENT_LINE_DIALOG_ICON_WRAP_CLASS)}>
              {icon}
            </div>
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className={DOCUMENT_LINE_DIALOG_BODY_CLASS}>{children}</div>
      </DialogContent>
    </Dialog>
  );
}
