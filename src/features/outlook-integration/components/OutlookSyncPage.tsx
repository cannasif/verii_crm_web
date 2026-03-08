import { type ReactElement, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    <div className="w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('page.syncTitle')}</h1>
        <p className="text-muted-foreground mt-1">{t('page.syncDescription')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('sync.scopeCardTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('sync.loading')}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="font-medium">{t('sync.statusLabel')}</span>
                <Badge variant={status?.isConnected ? 'default' : 'secondary'}>
                  {status?.isConnected ? t('sync.connected') : t('sync.notConnected')}
                </Badge>
              </div>

              <div>
                <p className="text-muted-foreground">{t('sync.scopeLabel')}</p>
                <p className="font-medium break-words">{status?.scopes || '-'}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
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
