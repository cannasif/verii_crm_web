import { type ReactElement } from 'react';
import { FileText, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

type AiAssistantReportDraftToastProps = {
  toastId: string | number;
  title: string;
  description: string;
  actionLabel: string;
  isPdf: boolean;
  onOpen: () => void;
};

export function AiAssistantReportDraftToast({
  toastId,
  title,
  description,
  actionLabel,
  isPdf,
  onOpen,
}: AiAssistantReportDraftToastProps): ReactElement {
  return (
    <div className="relative w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-[1.35rem] border border-primary/15 bg-background/98 shadow-2xl shadow-[0_24px_60px_-24px_var(--crm-brand-shadow)] backdrop-blur-xl dark:border-primary/20 dark:bg-slate-950/98">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[image:var(--crm-brand-gradient)]" />
      <div className="pointer-events-none absolute inset-0 bg-[image:var(--crm-brand-gradient-soft)] opacity-35 dark:opacity-20" />

      <div className="relative flex items-start gap-3 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[image:var(--crm-brand-gradient)] text-white shadow-[0_10px_20px_-10px_var(--crm-brand-shadow)]">
          {isPdf ? <FileText size={20} /> : <Sparkles size={20} />}
        </div>

        <div className="min-w-0 flex-1 pe-6">
          <p className="text-sm font-black text-slate-950 dark:text-white">{title}</p>
          <p className="mt-1 text-xs font-medium leading-5 text-slate-500 dark:text-slate-300">
            {description}
          </p>

          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-xl bg-[image:var(--crm-brand-gradient)] px-3 text-xs font-black text-white shadow-[0_8px_18px_-10px_var(--crm-brand-shadow)] hover:opacity-90"
              onClick={() => {
                onOpen();
                toast.dismiss(toastId);
              }}
            >
              {actionLabel}
            </Button>
          </div>
        </div>

        <button
          type="button"
          className="absolute end-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="Bildirimi kapat"
          onClick={() => toast.dismiss(toastId)}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
