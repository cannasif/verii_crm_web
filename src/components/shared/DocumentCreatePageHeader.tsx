import { type ReactElement } from 'react';
import { ArrowLeft, CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
              'hover:border-pink-400/60 hover:bg-pink-50/80 hover:text-pink-700',
              'dark:hover:border-pink-500/35 dark:hover:bg-pink-950/30 dark:hover:text-pink-200',
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
          <Tooltip delayDuration={180}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/90',
                  'text-slate-500 shadow-sm outline-none ring-pink-500/20 transition-all',
                  'hover:border-pink-300 hover:bg-pink-50 hover:text-pink-600',
                  'focus-visible:border-pink-400 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                  'dark:border-white/12 dark:bg-[#1a1025]/80 dark:text-slate-300',
                  'dark:hover:border-pink-500/40 dark:hover:bg-pink-950/40 dark:hover:text-pink-200',
                  'dark:focus-visible:ring-offset-[#0c0612]',
                )}
                aria-label={helpTriggerLabel}
              >
                <CircleHelp className="h-5 w-5" strokeWidth={2} />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="end"
              sideOffset={10}
              collisionPadding={12}
              className={cn(
                'max-w-[min(22rem,calc(100vw-2rem))] border-0 bg-transparent p-0 shadow-none',
                'data-[state=delayed-open]:animate-in data-[state=closed]:animate-out',
                'data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0',
                'data-[state=closed]:zoom-out-95 data-[state=delayed-open]:zoom-in-95',
                'data-[side=bottom]:slide-in-from-top-2',
              )}
            >
              <div
                className={cn(
                  'rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 text-left shadow-xl',
                  'ring-1 ring-slate-900/5 dark:border-white/10 dark:bg-[#1a1025] dark:ring-white/10',
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-pink-600 dark:text-pink-400">
                  {helpTitle}
                </p>
                <ul className="mt-3 space-y-2.5 text-sm leading-snug text-slate-700 dark:text-slate-200">
                  {helpSteps.map((step, index) => (
                    <li key={index} className="flex gap-2.5">
                      <span
                        className={cn(
                          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md',
                          'bg-pink-100 text-[11px] font-bold text-pink-700',
                          'dark:bg-pink-500/15 dark:text-pink-300',
                        )}
                        aria-hidden
                      >
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
