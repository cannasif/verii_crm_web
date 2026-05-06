import { type ReactElement, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUIStore } from '@/stores/ui-store';

export function OutlookAuthInformationPage(): ReactElement {
  const { t } = useTranslation('outlook-integration');
  const { setPageTitle } = useUIStore();

  useEffect(() => {
    setPageTitle(t('page.authInformationTitle'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  const callbackUrl = `${window.location.origin.replace(':5173', ':5001')}/api/integrations/outlook/callback`;

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('page.authInformationTitle')}</h1>
        <p className="text-muted-foreground mt-1">{t('page.authInformationDescription')}</p>
      </div>

      <Card className="bg-white/70 dark:bg-[#180F22] backdrop-blur-xl border border-slate-300/80 dark:border-white/15 shadow-sm rounded-2xl transition-all duration-300">
        <CardHeader>
          <CardTitle>{t('authInformation.currentStatusTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{t('authInformation.currentStatusDescription')}</p>
          <p>{t('authInformation.currentStatusHint')}</p>
        </CardContent>
      </Card>

      <Card className="bg-white/70 dark:bg-[#180F22] backdrop-blur-xl border border-slate-300/80 dark:border-white/15 shadow-sm rounded-2xl transition-all duration-300">
        <CardHeader>
          <CardTitle>{t('authInformation.setupGuideTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{t('authInformation.setupGuideDescription')}</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>{t('authInformation.setupStep1')}</li>
            <li>{t('authInformation.setupStep2')}</li>
            <li>{t('authInformation.setupStep3')}</li>
            <li>{t('authInformation.setupStep4')}</li>
            <li>{t('authInformation.setupStep5')}</li>
          </ol>
          <div className="rounded-lg border border-slate-300/60 bg-slate-50 dark:border-white/10 dark:bg-[#1e1627] px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">{t('authInformation.callbackLabel')}</p>
            <p className="text-sm font-medium break-all text-foreground">{callbackUrl}</p>
          </div>
          <a
            href="https://entra.microsoft.com"
            target="_blank"
            rel="noreferrer"
            className="inline-block text-xs underline underline-offset-2 text-primary"
          >
            {t('authInformation.consoleLinkLabel')}
          </a>
          <div className="rounded-lg border border-slate-300/60 bg-slate-50 dark:border-white/10 dark:bg-[#1e1627] px-3 py-2 text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">{t('authInformation.permissionTitle')}</p>
            <p>{t('authInformation.permissionHint')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
