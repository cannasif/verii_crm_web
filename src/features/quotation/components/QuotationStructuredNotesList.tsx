import type { ReactElement } from 'react';
import { X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { QuotationNotesDto } from '../types/quotation-types';
import { QUOTATION_NOTE_KEYS } from '../utils/quotation-payload-mapper';
import {
  useDocumentNotesLabels,
  type DocumentNotesContext,
} from '../hooks/useDocumentNotesLabels';

interface QuotationStructuredNotesListProps {
  notes: QuotationNotesDto;
  readOnly?: boolean;
  onRemove?: (key: keyof QuotationNotesDto) => void;
  context?: DocumentNotesContext;
}

export function QuotationStructuredNotesList({
  notes,
  readOnly = false,
  onRemove,
  context = 'quotation',
}: QuotationStructuredNotesListProps): ReactElement | null {
  const labels = useDocumentNotesLabels(context);

  const filledEntries = QUOTATION_NOTE_KEYS
    .map((key, index) => ({
      key,
      index,
      value: (notes[key] ?? '').trim(),
    }))
    .filter((entry) => entry.value.length > 0);

  if (filledEntries.length === 0) {
    return null;
  }

  return (
    <div className="mt-2.5 max-h-[min(280px,40vh)] overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-0.5">
      {filledEntries.map(({ key, index, value }) => (
        <div
          key={key}
          className={cn(
            'flex gap-2 rounded-xl border border-slate-200/90 bg-white/80 px-2.5 py-2 shadow-sm backdrop-blur-sm transition-colors duration-200',
            'dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none',
            'hover:border-pink-300/70 dark:hover:border-pink-500/35',
          )}
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-pink-50 text-[10px] font-bold text-pink-600 dark:bg-pink-500/10 dark:text-pink-400">
            {index + 1}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {labels.noteLabel}
                {' '}
                {index + 1}
              </p>
              {!readOnly && onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(key)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                  aria-label={labels.removeLine}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <Textarea
              readOnly
              tabIndex={-1}
              value={value}
              rows={2}
              className="min-h-[2.75rem] max-h-[2.75rem] cursor-default resize-none overflow-y-auto border-slate-200/80 bg-slate-50/80 text-[11px] leading-snug text-slate-800 shadow-none focus-visible:ring-0 dark:border-white/10 dark:bg-black/20 dark:text-slate-200"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
