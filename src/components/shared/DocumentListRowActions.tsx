import { type MouseEvent, type ReactElement } from 'react';
import { Edit2, GitBranchPlus, Mail, RotateCcw, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface DocumentListRowActionsProps {
  detailLabel: string;
  mailMenuLabel: string;
  gmailLabel: string;
  outlookLabel: string;
  reviseLabel: string;
  convertToOrderLabel?: string;
  erpCleanupLabel?: string;
  onDetail: () => void;
  onGmail: (event: MouseEvent<HTMLButtonElement>) => void;
  onOutlook: (event: MouseEvent<HTMLButtonElement>) => void;
  onRevise?: (event: MouseEvent<HTMLButtonElement>) => void;
  onConvertToOrder?: (event: MouseEvent<HTMLButtonElement>) => void;
  onErpCleanup?: (event: MouseEvent<HTMLButtonElement>) => void;
  isRevisePending?: boolean;
  isConvertToOrderPending?: boolean;
  isErpCleanupPending?: boolean;
  showRevise?: boolean;
  showConvertToOrder?: boolean;
  showErpCleanup?: boolean;
  convertToOrderDisabled?: boolean;
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
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
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
            onClick?.(event);
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
  mailMenuLabel,
  gmailLabel,
  outlookLabel,
  reviseLabel,
  convertToOrderLabel,
  erpCleanupLabel,
  onDetail,
  onGmail,
  onOutlook,
  onRevise,
  onConvertToOrder,
  onErpCleanup,
  isRevisePending = false,
  isConvertToOrderPending = false,
  isErpCleanupPending = false,
  showRevise = false,
  showConvertToOrder = false,
  showErpCleanup = false,
  convertToOrderDisabled = false,
  className,
}: DocumentListRowActionsProps): ReactElement {
  const convertDisabled = convertToOrderDisabled || isConvertToOrderPending;

  return (
    <div className={cn('flex items-center justify-center gap-0.5', className)}>
      <ActionIconButton
        label={detailLabel}
        onClick={() => onDetail()}
        className="text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-500/10"
      >
        <Edit2 className="h-4 w-4" />
      </ActionIconButton>

      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                aria-label={mailMenuLabel}
                onClick={(event) => event.stopPropagation()}
              >
                <Mail className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">{mailMenuLabel}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
          <DropdownMenuItem
            onClick={(event) => {
              event.stopPropagation();
              onGmail(event as unknown as MouseEvent<HTMLButtonElement>);
            }}
          >
            {gmailLabel}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(event) => {
              event.stopPropagation();
              onOutlook(event as unknown as MouseEvent<HTMLButtonElement>);
            }}
          >
            {outlookLabel}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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

      {showConvertToOrder && onConvertToOrder && convertToOrderLabel ? (
        <ActionIconButton
          label={convertToOrderLabel}
          onClick={convertDisabled ? undefined : onConvertToOrder}
          disabled={convertDisabled}
          className={
            convertToOrderDisabled
              ? 'cursor-not-allowed text-muted-foreground/45 opacity-50 hover:bg-transparent hover:text-muted-foreground/45 dark:text-muted-foreground/45 dark:hover:bg-transparent'
              : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-500/10'
          }
        >
          <ShoppingCart className={cn('h-4 w-4', isConvertToOrderPending && !convertToOrderDisabled && 'animate-pulse')} />
        </ActionIconButton>
      ) : null}

      {showErpCleanup && onErpCleanup && erpCleanupLabel ? (
        <ActionIconButton
          label={erpCleanupLabel}
          onClick={onErpCleanup}
          disabled={isErpCleanupPending}
          className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          <RotateCcw className={cn('h-4 w-4', isErpCleanupPending && 'animate-spin')} />
        </ActionIconButton>
      ) : null}
    </div>
  );
}
