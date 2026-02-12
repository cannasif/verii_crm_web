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
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";

export interface NoteLine {
  id: number;
  text: string;
  isSelected: boolean;
}

interface NotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialNotes: NoteLine[];
  onSave: (notes: NoteLine[]) => void;
  title?: string;
  description?: string;
}

export function NotesDialog({
  open,
  onOpenChange,
  initialNotes,
  onSave,
  title,
  description,
}: NotesDialogProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState<NoteLine[]>(initialNotes);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes, open]);

  const handleNoteChange = (id: number, text: string) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, text } : note))
    );
  };

  const handleSelectionChange = (id: number, isSelected: boolean) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, isSelected } : note))
    );
  };

  const handleSave = () => {
    onSave(notes);
    onOpenChange(false);
  };

  const dialogTitle = title ?? t('quotation.notes.title');
  const dialogDescription = description ?? t('quotation.notes.description');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[800px] p-0 overflow-hidden bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white shadow-2xl">
        <DialogHeader className="px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 flex flex-row items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
          <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-linear-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20">
              <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[10px] flex items-center justify-center">
                <FileText className="h-5 w-5 text-pink-600 dark:text-pink-500" />
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <span>{dialogTitle}</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                {dialogDescription}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 max-h-[600px] overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-[#0f0a18]/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 group hover:shadow-sm",
                  note.isSelected
                    ? "bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-500/20"
                    : "bg-white dark:bg-[#1a1025] border-slate-100 dark:border-white/5"
                )}
              >
                <div className="shrink-0 w-12 flex justify-center">
                  <span className={cn(
                    "text-xs font-semibold px-2 py-1 rounded-md transition-colors",
                    note.isSelected
                      ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                      : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400"
                  )}>
                    #{note.id}
                  </span>
                </div>

                <div className="flex-1">
                  <Input
                    value={note.text}
                    onChange={(e) => handleNoteChange(note.id, e.target.value)}
                    className={cn(
                      "h-9 text-sm border-slate-200 dark:border-white/10 focus-visible:ring-purple-500 transition-all",
                      note.isSelected
                        ? "bg-white dark:bg-[#130822]"
                        : "bg-transparent"
                    )}
                    placeholder={t('quotation.notes.placeholder')}
                  />
                </div>

                <Switch
                  checked={note.isSelected}
                  onCheckedChange={(checked) => handleSelectionChange(note.id, checked)}
                  className="data-[state=checked]:bg-purple-600"
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 flex justify-between sm:justify-end gap-3 sticky bottom-0 z-10 backdrop-blur-sm">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-6 rounded-xl border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            className="h-10 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
