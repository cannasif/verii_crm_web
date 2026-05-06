import { type ReactElement, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useOutlookStatusQuery } from '../hooks/useOutlookStatusQuery';

export function OutlookSyncPage(): ReactElement {
  const { t } = useTranslation('outlook-integration');
  const { setPageTitle } = useUIStore();
  const { data: status, isLoading } = useOutlookStatusQuery();

  useEffect(() => {
    setPageTitle(t('page.syncTitle'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('page.syncTitle')}</h1>
        <p className="text-muted-foreground mt-1">{t('page.syncDescription')}</p>
      </div>

      <Card className="bg-white/70 dark:bg-[#180F22] backdrop-blur-xl border border-slate-300/80 dark:border-white/15 shadow-sm rounded-2xl transition-all duration-300">
        <CardHeader className="flex flex-row items-center space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            {t('sync.scopeCardTitle')}:
            {isLoading ? (
              <span className="flex items-center gap-2 text-sm text-muted-foreground ml-2 font-normal">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('sync.loading')}
              </span>
            ) : (
              <div className="rounded-lg border border-slate-300/60 bg-slate-50 dark:border-white/10 dark:bg-[#26122b] px-2 py-1 text-sm font-medium ml-1 text-foreground">
                {status?.isConnected ? t('sync.connected') : t('sync.notConnected')}
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isLoading && (
            <div>
              <p className="text-muted-foreground mb-1.5">{t('sync.scopeLabel')}</p>
              <div className="rounded-lg border border-slate-300/60 bg-slate-50 dark:border-white/10 dark:bg-[#1e1627] px-3 py-2">
                <p className="font-medium break-words">{status?.scopes || '-'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white/70 dark:bg-[#180F22] backdrop-blur-xl border border-slate-300/80 dark:border-white/15 shadow-sm rounded-2xl transition-all duration-300">
        <CardHeader>
          <CardTitle>{t('sync.flowCardTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            <li>{t('sync.flowMeeting')}</li>
            <li>{t('sync.flowCall')}</li>
            <li>{t('sync.flowPlaceholder')}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
