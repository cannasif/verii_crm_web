import { cloneElement, isValidElement, type ReactElement } from 'react';
import { CircleHelp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useHasFinePointer } from '@/hooks/useHasFinePointer';
import {
  getApprovalCompletionHintKey,
  useApprovalCompletionActionValue,
  type ApprovalCompletionDocumentType,
} from '@/lib/approval-completion-hint';
import { cn } from '@/lib/utils';

interface SendForApprovalHintWrapProps {
  documentType: ApprovalCompletionDocumentType;
  children: ReactElement<{ disabled?: boolean; className?: string }>;
}

function HintContent({ text }: { text: string }): ReactElement {
  return <p className="text-sm leading-relaxed">{text}</p>;
}

export function SendForApprovalHintWrap({
  documentType,
  children,
}: SendForApprovalHintWrapProps): ReactElement {
  const { t } = useTranslation('common');
  const hasFinePointer = useHasFinePointer();
  const actionValue = useApprovalCompletionActionValue(documentType);
  const hintText = t(getApprovalCompletionHintKey(documentType, actionValue));
  const helpTriggerLabel = t('systemSettings.ApprovalCompletionHintTriggerLabel');

  const wrappedChild = isValidElement(children)
    ? cloneElement(children, {
        disabled: children.props.disabled,
        className: children.props.className,
      })
    : children;

  if (hasFinePointer) {
    const isDisabled = Boolean(children.props?.disabled);
    const trigger = isDisabled ? (
      <span className="inline-flex rounded-md" tabIndex={0}>
        {wrappedChild}
      </span>
    ) : (
      wrappedChild
    );

    return (
      <Tooltip delayDuration={250}>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent
          side="top"
          align="end"
          className="max-w-sm border bg-popover px-3 py-2.5 text-left text-popover-foreground shadow-md"
        >
          <HintContent text={hintText} />
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      {wrappedChild}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={helpTriggerLabel}
            className={cn(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200/80',
              'bg-white/90 text-slate-500 shadow-sm outline-none transition-colors',
              'hover:border-primary/40 hover:bg-accent hover:text-primary',
              'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2',
              'dark:border-white/12 dark:bg-zinc-900/80 dark:text-slate-300',
              'dark:hover:border-primary/30 dark:hover:bg-primary/10 dark:hover:text-primary',
            )}
          >
            <CircleHelp className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          sideOffset={8}
          className="max-w-sm px-3 py-2.5 text-left"
        >
          <HintContent text={hintText} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
