import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { FileText, Loader2 } from "lucide-react";
import type { QuotationNotesDto } from "../types/quotation-types";

const NOTE_KEYS = ['note1', 'note2', 'note3', 'note4', 'note5', 'note6', 'note7', 'note8', 'note9', 'note10', 'note11', 'note12', 'note13', 'note14', 'note15'] as const;
const MAX_NOTE_LENGTH = 100;

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
}

export function QuotationNotesDialog({
  open,
  onOpenChange,
  value,
  onChange,
  errors = {},
  onSaveAsync,
  isSaving = false,
}: QuotationNotesDialogProps): React.ReactElement {
  const { t } = useTranslation(['quotation', 'common']);
  const [localValue, setLocalValue] = useState<QuotationNotesDto>(value);

  useEffect(() => {
    if (open) {
      setLocalValue(value);
    }
  }, [value, open]);

  const handleNoteChange = (key: keyof QuotationNotesDto, text: string): void => {
    setLocalValue(prev => ({ ...prev, [key]: text }));
  };

  const handleSave = async (): Promise<void> => {
    onChange(localValue);
    if (onSaveAsync) {
      await onSaveAsync(localValue);
    }
    onOpenChange(false);
  };

  const hasErrors = Object.keys(errors).length > 0;
  const hasLengthErrors = NOTE_KEYS.some(
    (k) => (localValue[k]?.length ?? 0) > MAX_NOTE_LENGTH
  );
  const canSubmit = !hasErrors && !hasLengthErrors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[calc(100vw-2rem)] max-w-[700px] p-0 overflow-hidden bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white shadow-2xl flex flex-col max-h-[90vh]">
        <DialogHeader className="px-4 sm:px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 flex flex-row items-center justify-between sticky top-0 z-10 backdrop-blur-sm shrink-0">
          <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-linear-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20 shrink-0">
              <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[10px] flex items-center justify-center">
                <FileText className="h-5 w-5 text-pink-600 dark:text-pink-500" />
              </div>
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="truncate">{t('quotation.notes.title')}</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 truncate">
                {t('quotation.notes.description')}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-[#0f0a18]/30 flex-1">
          <div className="flex flex-col gap-4">
            {NOTE_KEYS.map((key, index) => {
              const noteValue = localValue[key] ?? '';
              const charCount = noteValue.length;
              const isOverLimit = charCount > MAX_NOTE_LENGTH;
              const fieldError = errors[key];
              return (
                <div
                  key={key}
                  className={cn(
                    "flex flex-col gap-2 p-3 rounded-xl border transition-all duration-200 w-full",
                    isOverLimit || fieldError
                      ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-500/20"
                      : "bg-white dark:bg-[#1a1025] border-slate-100 dark:border-white/5 shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-[10px] sm:text-xs font-semibold px-2 py-1 rounded-md shrink-0",
                      noteValue.trim()
                        ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                        : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400"
                    )}>
                      #{index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <Input
                        value={noteValue}
                        onChange={(e) => handleNoteChange(key, e.target.value)}
                        className={cn(
                          "h-9 text-sm border-slate-200 dark:border-white/10 focus-visible:ring-purple-500 transition-all bg-transparent",
                          isOverLimit || fieldError ? "border-red-500 dark:border-red-500" : ""
                        )}
                        placeholder={t('quotation.notes.placeholder')}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-[10px] sm:text-xs tabular-nums shrink-0 min-w-12 text-right",
                        isOverLimit ? "text-red-600 dark:text-red-400 font-semibold" : "text-slate-500 dark:text-slate-400"
                      )}
                    >
                      {charCount}/{MAX_NOTE_LENGTH}
                    </span>
                  </div>
                  {(fieldError || isOverLimit) && (
                    <p className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 pl-1">
                      {fieldError ?? t('quotation.notes.maxLengthError')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="px-4 sm:px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 flex flex-row items-center justify-end gap-3 sticky bottom-0 z-10 backdrop-blur-sm shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-4 sm:px-6 rounded-xl border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-xs sm:text-sm"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSubmit || isSaving}
            className="h-10 px-4 sm:px-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-xs sm:text-sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('quotation.notes.saving')}
              </>
            ) : (
              t('common.save')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
