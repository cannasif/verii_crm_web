import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ListPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const tooltipLabel = t('notes.addLineTooltip', { defaultValue: 'Açıklama satırı ekle' });

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={tooltipLabel}
      aria-label={tooltipLabel}
      className={cn(
        'absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 transition-all',
        'hover:border-primary/30 hover:bg-accent hover:text-primary',
        'dark:hover:border-primary/40 dark:hover:bg-primary/10 dark:hover:text-primary',
        'disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
    >
      <ListPlus className="h-4 w-4" />
    </button>
  );
}
