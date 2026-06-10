import { type ReactElement, type ReactNode } from 'react';
import { DocumentBackButton } from './DocumentBackButton';
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
          <DocumentBackButton onBack={onBack} backLabel={backLabel} />
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
