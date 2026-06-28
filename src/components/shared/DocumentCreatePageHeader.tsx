import { type ReactElement } from 'react';
import { ArrowLeft, CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DocumentCreatePageHeaderProps {
  title: string;
  description: string;
  onBack: () => void;
  /** Screen reader + native tooltip for the back control */
  backLabel: string;
  helpTitle: string;
  helpSteps: string[];
  helpTriggerLabel: string;
}

/**
 * Compact page header for document create flows (demand / quotation / order).
 * Back action stays explicit; help is a rich tooltip on the ? control.
 */
export function DocumentCreatePageHeader({
  title,
  description,
  onBack,
  backLabel,
  helpTitle,
  helpSteps,
  helpTriggerLabel,
}: DocumentCreatePageHeaderProps): ReactElement {
  return (
    <header className="relative pb-4 pt-0 sm:pt-0.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onBack}
            title={backLabel}
            aria-label={backLabel}
            className={cn(
              'h-10 w-10 shrink-0 rounded-xl border-slate-200 bg-white/90 shadow-sm',
              'dark:border-white/12 dark:bg-[#1a1025]/80',
              'hover:border-rose-400/60 hover:bg-rose-50/80 hover:text-rose-700',
              'dark:hover:border-rose-500/35 dark:hover:bg-rose-950/30 dark:hover:text-rose-200',
              'transition-colors duration-200',
            )}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1 pt-0.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {title}
            </h1>
            <p className="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 justify-end sm:pt-1">
          <button
            type="button"
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/90',
              'text-slate-500 shadow-sm outline-none ring-rose-500/20 transition-all',
              'hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600',
              'focus-visible:border-rose-400 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
              'dark:border-white/12 dark:bg-[#1a1025]/80 dark:text-slate-300',
              'dark:hover:border-rose-500/40 dark:hover:bg-rose-950/40 dark:hover:text-rose-200',
              'dark:focus-visible:ring-offset-[#0c0612]',
            )}
            aria-label={helpTriggerLabel}
            title={[helpTitle, ...helpSteps.map((step, index) => `${index + 1}. ${step}`)].join('\n')}
          >
            <CircleHelp className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </header>
  );
}
