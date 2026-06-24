import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type ErpFieldHintProps = {
  label: string;
  className?: string;
};

export function ErpFieldHint({ label, className }: ErpFieldHintProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label={label}
        className={cn(
          'inline-flex shrink-0 items-center text-slate-400 transition-colors',
          'hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-pink-500/40 dark:hover:text-slate-300',
          className
        )}
      >
        <HelpCircle size={14} className="stroke-[2.5]" />
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-80 text-sm font-medium leading-relaxed p-3"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
