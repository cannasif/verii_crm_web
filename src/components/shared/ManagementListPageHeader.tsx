import { type ReactElement, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentBackButton } from './DocumentBackButton';

export interface ManagementListPageHeaderProps {
  title: string;
  description: string;
  backLabel: string;
  actions?: ReactNode;
  showStats?: boolean;
  onToggleStats?: () => void;
  showStatsLabel?: string;
  hideStatsLabel?: string;
}

export function ManagementListPageHeader({
  title,
  description,
  backLabel,
  actions,
  showStats,
  onToggleStats,
  showStatsLabel = 'İstatistikleri Göster',
  hideStatsLabel = 'İstatistikleri Gizle',
}: ManagementListPageHeaderProps): ReactElement {
  const navigate = useNavigate();

  const handleBack = (): void => {
    navigate(-1);
  };

  const statsVisible = showStats ?? true;

  return (
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <DocumentBackButton onBack={handleBack} backLabel={backLabel} />
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 transition-colors sm:text-3xl dark:text-white">
            {title}
          </h1>
          <p className="text-zinc-500 dark:text-muted-foreground text-sm flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--crm-brand-shadow)]" />
            {description}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {onToggleStats != null ? (
          <Button
            variant="outline"
            onClick={onToggleStats}
            className="h-10 rounded-xl border-slate-200 px-4 text-zinc-700 transition-all duration-300 hover:bg-slate-50 active:scale-[0.98] dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {statsVisible ? <EyeOff size={18} className="mr-2" /> : <Eye size={18} className="mr-2" />}
            {statsVisible ? hideStatsLabel : showStatsLabel}
          </Button>
        ) : null}
        {actions}
      </div>
    </div>
  );
}
