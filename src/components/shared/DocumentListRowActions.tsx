import { type MouseEvent, type ReactElement } from 'react';
import { Edit2, GitBranchPlus, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface DocumentListRowActionsProps {
  detailLabel: string;
  gmailLabel: string;
  outlookLabel: string;
  reviseLabel: string;
  onDetail: () => void;
  onGmail: (event: MouseEvent<HTMLButtonElement>) => void;
  onOutlook: (event: MouseEvent<HTMLButtonElement>) => void;
  onRevise?: (event: MouseEvent<HTMLButtonElement>) => void;
  isRevisePending?: boolean;
  showRevise?: boolean;
  className?: string;
}

function ActionIconButton({
  label,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className: string;
  children: ReactElement;
}): ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation();
            onClick(event);
          }}
          className={cn('h-8 w-8 shrink-0', className)}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export function DocumentListRowActions({
  detailLabel,
  gmailLabel,
  outlookLabel,
  reviseLabel,
  onDetail,
  onGmail,
  onOutlook,
  onRevise,
  isRevisePending = false,
  showRevise = false,
  className,
}: DocumentListRowActionsProps): ReactElement {
  return (
    <div className={cn('flex items-center justify-center gap-0.5', className)}>
      <ActionIconButton
        label={detailLabel}
        onClick={() => onDetail()}
        className="text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-500/10"
      >
        <Edit2 className="h-4 w-4" />
      </ActionIconButton>
      <ActionIconButton
        label={gmailLabel}
        onClick={onGmail}
        className="text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
      >
        <Mail className="h-4 w-4" />
      </ActionIconButton>
      <ActionIconButton
        label={outlookLabel}
        onClick={onOutlook}
        className="text-sky-600 hover:bg-sky-50 hover:text-sky-700 dark:text-sky-400 dark:hover:bg-sky-500/10"
      >
        <Mail className="h-4 w-4" />
      </ActionIconButton>
      {showRevise && onRevise ? (
        <ActionIconButton
          label={reviseLabel}
          onClick={onRevise}
          disabled={isRevisePending}
          className="text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-500/10"
        >
          <GitBranchPlus className={cn('h-4 w-4', isRevisePending && 'animate-pulse')} />
        </ActionIconButton>
      ) : null}
    </div>
  );
}
