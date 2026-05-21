import { type ReactElement, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DocumentDetailPageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  onBack: () => void;
  backLabel: string;
  trailing?: ReactNode;
  className?: string;
}

export function DocumentDetailPageHeader({
  title,
  subtitle,
  onBack,
  backLabel,
  trailing,
  className,
}: DocumentDetailPageHeaderProps): ReactElement {
  return (
    <header className={cn('relative pb-2', className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
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
            {subtitle ? (
              <div className="mt-1 max-w-3xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>
        {trailing ? <div className="flex shrink-0 items-center gap-2">{trailing}</div> : null}
      </div>
    </header>
  );
}
