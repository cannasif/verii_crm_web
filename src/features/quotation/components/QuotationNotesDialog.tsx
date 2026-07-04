import { useState, useEffect, type ReactElement } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, FileText, Loader2, X } from 'lucide-react';
import { ErpFieldHint } from '@/components/shared/ErpFieldHint';
import type { QuotationNotesDto } from '../types/quotation-types';
import { QUOTATION_NOTE_KEYS } from '../utils/quotation-payload-mapper';
import {
  useDocumentNotesLabels,
  type DocumentNotesContext,
} from '../hooks/useDocumentNotesLabels';
import { useDocumentFieldLabelMap } from '@/features/document-field-labels/hooks/useDocumentFieldLabels';
import { DOCUMENT_DIALOG_CLOSE_BUTTON_BASE_CLASS } from '@/lib/document-line-dialog-styles';

const MAX_NOTE_LENGTH = 100;
const NOTES_PER_PAGE = 3;

export const createEmptyQuotationNotes = (): QuotationNotesDto => ({
  note1: '',
  note2: '',
  note3: '',
  note4: '',
  note5: '',
  note6: '',
  note7: '',
  note8: '',
  note9: '',
  note10: '',
  note11: '',
  note12: '',
  note13: '',
  note14: '',
  note15: '',
});

interface QuotationNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: QuotationNotesDto;
  onChange: (next: QuotationNotesDto) => void;
  errors?: Partial<Record<keyof QuotationNotesDto, string>>;
  onSaveAsync?: (notes: QuotationNotesDto) => Promise<void>;
  isSaving?: boolean;
  context?: DocumentNotesContext;
}

export function QuotationNotesDialog({
  open,
  onOpenChange,
  value,
  onChange,
  errors = {},
  onSaveAsync,
  isSaving = false,
  context = 'quotation',
}: QuotationNotesDialogProps): ReactElement {
  const { t } = useTranslation(['common']);
  const labels = useDocumentNotesLabels(context);
  const headerFieldLabels = useDocumentFieldLabelMap(context, 'HeaderNote');
  const [localValue, setLocalValue] = useState<QuotationNotesDto>(value);
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(QUOTATION_NOTE_KEYS.length / NOTES_PER_PAGE);
  const pageStart = page * NOTES_PER_PAGE;
  const visibleKeys = QUOTATION_NOTE_KEYS.slice(pageStart, pageStart + NOTES_PER_PAGE);

  useEffect(() => {
    if (open) {
      setLocalValue(value);
      setPage(0);
    }
  }, [value, open]);

  const handleNoteChange = (key: keyof QuotationNotesDto, text: string): void => {
    setLocalValue((prev) => ({ ...prev, [key]: text }));
  };

  const handleSave = async (): Promise<void> => {
    onChange(localValue);
    if (onSaveAsync) {
      await onSaveAsync(localValue);
    }
    onOpenChange(false);
  };

  const hasErrors = Object.keys(errors).length > 0;
  const hasLengthErrors = QUOTATION_NOTE_KEYS.some(
    (k) => (localValue[k]?.length ?? 0) > MAX_NOTE_LENGTH,
  );
  const canSubmit = !hasErrors && !hasLengthErrors;
  const filledCount = QUOTATION_NOTE_KEYS.filter((k) => (localValue[k] ?? '').trim().length > 0).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="!fixed !flex min-h-0 flex-col gap-0 !overflow-hidden border border-slate-300/95 bg-[linear-gradient(180deg,#ffffff,#f8fafc_40%,#f1f5f9)] p-0 text-slate-900 shadow-[0_0_50px_rgba(236,72,153,0.08),0_25px_80px_rgba(15,23,42,0.15)] ring-1 ring-slate-300/40 backdrop-blur-3xl dark:border-white/10 dark:bg-zinc-950/85 dark:bg-none dark:text-slate-100 dark:shadow-[0_0_50px_rgba(236,72,153,0.1),0_25px_80px_rgba(0,0,0,0.45)] dark:ring-0 max-lg:!top-3 max-lg:!left-1/2 max-lg:!h-[calc(100svh-0.75rem)] max-lg:!max-h-[calc(100svh-0.75rem)] max-lg:!-translate-x-1/2 max-lg:!translate-y-0 max-lg:!w-[calc(100vw-0.5rem)] max-lg:!max-w-[calc(100vw-0.5rem)] lg:!top-1/2 lg:!left-1/2 lg:!h-[min(82dvh,680px)] lg:!max-h-[min(82dvh,680px)] lg:!-translate-x-1/2 lg:!-translate-y-1/2 lg:!w-[min(920px,calc(100vw-2rem))] lg:!max-w-[min(920px,calc(100vw-2rem))]"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-40%,rgba(244,63,94,0.06),transparent_50%),radial-gradient(ellipse_70%_50%_at_100%_100%,rgba(59,130,246,0.04),transparent_45%)] dark:bg-[radial-gradient(ellipse_120%_80%_at_50%_-40%,rgba(244,63,94,0.12),transparent_50%),radial-gradient(ellipse_70%_50%_at_100%_100%,rgba(59,130,246,0.08),transparent_45%)]"
          aria-hidden
        />

        <DialogHeader className="relative z-10 flex shrink-0 flex-row items-center justify-between space-y-0 border-b border-slate-300/90 bg-white/90 px-4 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/80 sm:px-6">
          <DialogTitle className="flex min-w-0 items-center gap-3 text-slate-900 dark:text-white">
            <div className="rounded-xl bg-gradient-to-br from-primary to-orange-500 p-2.5 text-white shadow-lg shadow-primary/20">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-base font-semibold">{labels.title}</span>
              <span className="truncate text-xs font-normal text-slate-500 dark:text-slate-400">
                {labels.description}
              </span>
            </div>
          </DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={cn('h-9 w-9 shrink-0', DOCUMENT_DIALOG_CLOSE_BUTTON_BASE_CLASS)}
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        <div className="relative z-10 flex flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {labels.linesHint}
            </span>
            <span className="text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
              {filledCount}/{QUOTATION_NOTE_KEYS.length}
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-3">
            {visibleKeys.map((key) => {
              const index = QUOTATION_NOTE_KEYS.indexOf(key);
              const fieldKey = `Note${index + 1}`;
              const fieldLabel = headerFieldLabels[fieldKey]?.effectiveLabel || `${labels.noteLabel} ${index + 1}`;
              const fieldHelpText = headerFieldLabels[fieldKey]?.helpText || labels.notesTooltipText;
              const fieldPlaceholder = headerFieldLabels[fieldKey]?.placeholder || labels.placeholder;
              const noteValue = localValue[key] ?? '';
              const charCount = noteValue.length;
              const isOverLimit = charCount > MAX_NOTE_LENGTH;
              const fieldError = errors[key];
              const hasContent = noteValue.trim().length > 0;

              return (
                <div
                  key={key}
                  className={cn(
                    'flex flex-1 flex-col rounded-xl border bg-white/90 px-3 py-2.5 shadow-sm backdrop-blur-sm transition-all duration-200 dark:bg-white/[0.03]',
                    isOverLimit || fieldError
                      ? 'border-red-300 dark:border-red-500/40'
                      : hasContent
                        ? 'border-primary/20 dark:border-primary/30'
                        : 'border-slate-200/90 hover:border-primary/30 dark:border-white/10 dark:hover:border-primary/30',
                  )}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[9px] font-bold',
                          hasContent
                            ? 'bg-accent text-primary dark:bg-primary/15 dark:text-primary/80'
                            : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400',
                        )}
                      >
                        {index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {fieldLabel}
                        </span>
                        <ErpFieldHint label={fieldHelpText} />
                      </div>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 text-[9px] tabular-nums',
                        isOverLimit ? 'font-semibold text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500',
                      )}
                    >
                      {charCount}/{MAX_NOTE_LENGTH}
                    </span>
                  </div>

                  <Textarea
                    value={noteValue}
                    onChange={(e) => handleNoteChange(key, e.target.value)}
                    rows={2}
                    placeholder={fieldPlaceholder}
                    className={cn(
                      'min-h-[3rem] w-full flex-1 resize-none overflow-y-auto rounded-lg border-slate-200/90 bg-slate-50/60 text-[11px] leading-snug focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 dark:border-white/10 dark:bg-black/25 dark:focus-visible:border-primary dark:focus-visible:ring-primary/25',
                      isOverLimit || fieldError ? 'border-red-400 dark:border-red-500' : '',
                    )}
                  />

                  {(fieldError || isOverLimit) && (
                    <p className="mt-1 text-[9px] text-red-600 dark:text-red-400">
                      {fieldError ?? labels.maxLengthError}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200/80 pt-3 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 0}
              onClick={() => setPage((current) => Math.max(current - 1, 0))}
              className="h-9 rounded-xl border-slate-200 px-3 text-xs dark:border-white/10"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t('common:previous', { defaultValue: 'Önceki' })}
            </Button>
            <span className="text-[11px] font-medium tabular-nums text-slate-500 dark:text-slate-400">
              {labels.pageLabel
                .replace('{{current}}', String(page + 1))
                .replace('{{total}}', String(totalPages))}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((current) => Math.min(current + 1, totalPages - 1))}
              className="h-9 rounded-xl border-slate-200 px-3 text-xs dark:border-white/10"
            >
              {t('common:next', { defaultValue: 'Sonraki' })}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>

        <DialogFooter className="relative z-10 flex shrink-0 flex-row items-center justify-end gap-3 border-t border-slate-300/90 bg-white/90 px-4 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/80 sm:px-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-xl border-slate-200 px-5 text-sm transition-colors hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
          >
            {t('common:cancel', { defaultValue: 'İptal' })}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSubmit || isSaving}
            className="h-10 rounded-xl bg-gradient-to-r from-primary to-orange-500 px-5 text-sm text-white shadow-lg shadow-primary/25 transition-all hover:opacity-95 disabled:pointer-events-none disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {labels.saving}
              </>
            ) : (
              t('common:save', { defaultValue: 'Kaydet' })
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
