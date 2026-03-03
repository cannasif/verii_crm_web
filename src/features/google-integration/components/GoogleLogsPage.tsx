import { type ReactElement, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function GoogleLogsPage(): ReactElement {
  const { t } = useTranslation('google-integration');
  const { setPageTitle } = useUIStore();

  useEffect(() => {
    setPageTitle(t('page.logsTitle'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  return (
    <div className="w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('page.logsTitle')}</h1>
        <p className="text-muted-foreground mt-1">{t('page.logsDescription')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('logs.placeholderTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t('logs.placeholderText')}
        </CardContent>
      </Card>
    </div>
  );
}
