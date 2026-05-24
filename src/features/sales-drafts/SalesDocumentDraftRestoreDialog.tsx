import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SalesDocumentDraftRestoreDialogProps {
  open: boolean;
  documentName: string;
  updatedAt?: string | null;
  onRestore: () => void;
  onDiscard: () => void | Promise<void>;
}

function formatDraftDate(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function SalesDocumentDraftRestoreDialog({
  open,
  documentName,
  updatedAt,
  onRestore,
  onDiscard,
}: SalesDocumentDraftRestoreDialogProps): ReactElement {
  const { t } = useTranslation('common');
  const formattedDate = formatDraftDate(updatedAt);

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#120b1d]"
      >
        <DialogHeader>
          <DialogTitle>
            {t('salesDraft.title', {
              defaultValue: 'Yarım kalan işiniz var',
            })}
          </DialogTitle>
          <DialogDescription>
            {t('salesDraft.description', {
              defaultValue:
                'Bu kullanıcı ve şube için kaydedilmemiş bir {{documentName}} taslağı bulundu. Devam etmek ister misiniz?',
              documentName,
            })}
          </DialogDescription>
        </DialogHeader>

        {formattedDate ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100">
            {t('salesDraft.updatedAt', {
              defaultValue: 'Son otomatik kayıt: {{date}}',
              date: formattedDate,
            })}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDiscard}>
            <Trash2 className="mr-2 h-4 w-4" />
            {t('salesDraft.discard', {
              defaultValue: 'Sil ve yeni başla',
            })}
          </Button>
          <Button type="button" onClick={onRestore}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {t('salesDraft.restore', {
              defaultValue: 'Taslağı yükle',
            })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

