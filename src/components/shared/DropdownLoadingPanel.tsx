import { type ReactElement } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

type DropdownLoadingPanelProps = {
  className?: string;
  text?: string;
  minHeightClassName?: string;
};

export function DropdownLoadingPanel({
  className,
  text,
  minHeightClassName = 'min-h-24',
}: DropdownLoadingPanelProps): ReactElement {
  const { t } = useTranslation('common');

  return (
    <div
      className={cn(
        'flex items-center justify-center py-6 text-sm text-muted-foreground',
        minHeightClassName,
        className
      )}
    >
      <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin text-[var(--crm-brand-text)]" />
      {text ?? t('loading')}
    </div>
  );
}
