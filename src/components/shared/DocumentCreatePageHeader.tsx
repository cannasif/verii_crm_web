import { type ReactElement } from 'react';
import { CircleHelp } from 'lucide-react';
import { DocumentBackButton } from './DocumentBackButton';
import { DOCUMENT_DIALOG_CLOSE_BUTTON_BASE_CLASS } from '@/lib/document-line-dialog-styles';
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
          <DocumentBackButton onBack={onBack} backLabel={backLabel} />          <div className="min-w-0 flex-1 pt-0.5">
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
              'h-10 w-10 shrink-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0c0612]',
              DOCUMENT_DIALOG_CLOSE_BUTTON_BASE_CLASS,
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
