import { type ReactElement } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DocumentBackButtonProps {
  onBack: () => void;
  backLabel: string;
  className?: string;
}

export function DocumentBackButton({
  onBack,
  backLabel,
  className,
}: DocumentBackButtonProps): ReactElement {
  return (
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
        className
      )}
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
}
