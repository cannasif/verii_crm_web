import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ListPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface QuotationNotesAddLineButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function QuotationNotesAddLineButton({
  onClick,
  disabled = false,
  className,
}: QuotationNotesAddLineButtonProps): ReactElement {
  const { t } = useTranslation('quotation');

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
              'absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 transition-all',
              'hover:border-pink-300/60 hover:bg-pink-50 hover:text-pink-600',
              'dark:hover:border-pink-500/40 dark:hover:bg-pink-500/10 dark:hover:text-pink-400',
              'disabled:pointer-events-none disabled:opacity-40',
              className,
            )}
          >
            <ListPlus className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          {t('notes.addLineTooltip', { defaultValue: 'Açıklama satırı ekle' })}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
