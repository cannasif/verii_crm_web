import { type ReactElement, type ReactNode } from 'react';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WAITING_APPROVALS_PAGE_CLASSNAME } from './waiting-approvals-styles';

interface WaitingApprovalsPageShellProps {
  title: string;
  subtitle: string;
  backLabel: string;
  onBack: () => void;
  icon: LucideIcon;
  sidebar: ReactNode;
  children: ReactNode;
}

export function WaitingApprovalsPageShell({
  title,
  subtitle,
  backLabel,
  onBack,
  icon: Icon,
  sidebar,
  children,
}: WaitingApprovalsPageShellProps): ReactElement {
  return (
    <div className={WAITING_APPROVALS_PAGE_CLASSNAME}>
      <header className="mb-5 pb-1">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onBack}
            title={backLabel}
            aria-label={backLabel}
            className={cn(
              'h-9 w-9 shrink-0 rounded-lg border-slate-200 bg-white/90 shadow-sm',
              'dark:border-white/12 dark:bg-[#1a1025]/80',
              'hover:border-primary/40 hover:bg-accent/80 hover:text-primary',
              'dark:hover:border-primary/30 dark:hover:bg-primary/10 dark:hover:text-primary',
              'transition-colors duration-200',
            )}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary ring-1 ring-primary/20 dark:bg-primary/10 dark:text-primary dark:ring-primary/25"
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white sm:text-xl">
                {title}
              </h1>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm line-clamp-2">
                {subtitle}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-start">
        <div className="lg:col-span-1 xl:sticky xl:top-6">{sidebar}</div>
        <div className="lg:col-span-3">{children}</div>
      </div>
    </div>
  );
}
