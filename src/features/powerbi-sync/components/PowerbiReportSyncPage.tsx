import { type ReactElement, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { PowerbiReportSyncCard } from './PowerbiReportSyncCard';
import { RefreshCw } from 'lucide-react';

export function PowerbiReportSyncPage(): ReactElement {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();

  useEffect(() => {
    setPageTitle(t('powerbiSync.title'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-accent text-primary ring-1 ring-inset ring-primary/15 dark:border-primary/25 dark:bg-primary/10">
            <RefreshCw className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
              {t('powerbiSync.title')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
              {t('powerbiSync.description')}
            </p>
          </div>
        </div>
      </div>
      <PowerbiReportSyncCard />
    </div>
  );
}
