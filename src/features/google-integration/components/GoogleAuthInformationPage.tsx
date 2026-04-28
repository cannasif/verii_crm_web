import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useUIStore } from '@/stores/ui-store';
import { googleIntegrationApi } from '../api/google-integration.api';
import type { UpdateTenantGoogleOAuthSettingsDto } from '../types/google-integration.types';
import { useMyPermissionsQuery } from '@/features/access-control/hooks/useMyPermissionsQuery';

const GOOGLE_TENANT_SETTINGS_QUERY_KEY = ['google-integration', 'tenant-oauth-settings'] as const;

export function GoogleAuthInformationPage(): ReactElement {
  const { t } = useTranslation(['google-integration', 'common']);
  const { setPageTitle } = useUIStore();
  const queryClient = useQueryClient();
  const { data: permissions } = useMyPermissionsQuery();

  const [clientId, setClientId] = useState('');
  const [clientSecretPlain, setClientSecretPlain] = useState('');
  const [redirectUri, setRedirectUri] = useState('');
  const [scopes, setScopes] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    setPageTitle(t('page.authInformationTitle'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  const settingsQuery = useQuery({
    queryKey: GOOGLE_TENANT_SETTINGS_QUERY_KEY,
    queryFn: () => googleIntegrationApi.getTenantOAuthSettings(),
  });

  useEffect(() => {
    const data = settingsQuery.data;
    if (!data) return;

    setClientId(data.clientId ?? '');
    setRedirectUri(data.redirectUri ?? '');
    setScopes(data.scopes ?? '');
    setIsEnabled(Boolean(data.isEnabled));
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (payload: UpdateTenantGoogleOAuthSettingsDto) =>
      googleIntegrationApi.updateTenantOAuthSettings(payload),
    onSuccess: async () => {
      setClientSecretPlain('');
      await queryClient.invalidateQueries({ queryKey: GOOGLE_TENANT_SETTINGS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ['google-integration', 'status'] });
      toast.success(t('authInformation.saveSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('authInformation.saveError'));
    },
  });

  const onSave = () => {
    saveMutation.mutate({
      clientId: clientId.trim(),
      clientSecretPlain: clientSecretPlain.trim() || undefined,
      redirectUri: redirectUri.trim(),
      scopes: scopes.trim(),
      isEnabled,
    });
  };

  const maskedSecret = settingsQuery.data?.clientSecretMasked ?? '';
  const isConfigured = settingsQuery.data?.isConfigured ?? false;

  const canSave = useMemo(() => {
    return clientId.trim().length > 0 && redirectUri.trim().length > 0 && scopes.trim().length > 0;
  }, [clientId, redirectUri, scopes]);
  const callbackUrl = redirectUri || `${window.location.origin.replace(':5173', ':5001')}/api/integrations/google/callback`;

  const canManage =
    permissions?.isSystemAdmin === true ||
    ['tenantadmin', 'systemadmin'].includes((permissions?.roleTitle ?? '').trim().toLowerCase());

  if (settingsQuery.isLoading) {
    return (
      <div className="w-full">
        <Card className="bg-white/70 dark:bg-[#190b20]/60 backdrop-blur-xl border-white/60 dark:border-white/5 shadow-sm rounded-2xl transition-all duration-300">
          <CardContent className="py-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('common:loading')}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {!canManage && (
        <Card className="bg-white/70 dark:bg-[#180F22] backdrop-blur-xl border-white/60 dark:border-white/5 shadow-sm rounded-2xl transition-all duration-300">
          <CardContent className="py-6 text-sm text-muted-foreground">
            {t('common:forbiddenDescription')}
          </CardContent>
        </Card>
      )}

      {canManage && (
        <>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('page.authInformationTitle')}</h1>
            <p className="text-muted-foreground mt-1">{t('page.authInformationDescription')}</p>
          </div>

          <Card className="bg-white/70 dark:bg-[#180F22] backdrop-blur-xl border-white/60 dark:border-white/5 shadow-sm rounded-2xl transition-all duration-300">
            <CardHeader>
              <CardTitle>{t('authInformation.cardTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {settingsQuery.isError && (
                <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {t('authInformation.loadError')}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="google-client-id" className="block text-sm text-muted-foreground mb-1.5">
                    {t('authInformation.clientIdLabel')}
                  </label>
                  <Input
                    id="google-client-id"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder={t('authInformation.clientIdPlaceholder')}
                    className="bg-white border-slate-200 dark:bg-[#0C0516] dark:border-[#3b3142] text-foreground"
                  />
                </div>

                <div>
                  <label htmlFor="google-client-secret" className="block text-sm text-muted-foreground mb-1.5">
                    {t('authInformation.clientSecretLabel')}
                  </label>
                  <Input
                    id="google-client-secret"
                    type="password"
                    value={clientSecretPlain}
                    onChange={(e) => setClientSecretPlain(e.target.value)}
                    placeholder={t('authInformation.clientSecretPlaceholder')}
                    className="bg-white border-slate-200 dark:bg-[#0C0516] dark:border-[#3b3142] text-foreground"
                  />
                  <div className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                    {t('authInformation.currentSecretLabel')}:
                    <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-[#3b3142] dark:bg-[#26122b] px-2 py-1 text-foreground">
                      <span className="font-medium">{maskedSecret || '-'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1.5">{t('authInformation.redirectUriLabel')}</p>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-[#3b3142] dark:bg-[#1e1627] px-3 py-1">
                    <p className="font-medium break-all">{redirectUri || '-'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1.5">{t('authInformation.scopesLabel')}</p>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-[#3b3142] dark:bg-[#1e1627] px-3 py-1">
                    <p className="font-medium break-words">{scopes || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium">{t('authInformation.enableLabel')}</p>
                  <p className="text-xs text-muted-foreground">{t('authInformation.enableDescription')}</p>
                </div>
                <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
              </div>

              <div className="text-xs text-muted-foreground">
                {t('authInformation.configStatusLabel')}: {isConfigured ? t('authInformation.configured') : t('authInformation.notConfigured')}
              </div>

              <Button
                onClick={onSave}
                disabled={saveMutation.isPending || !canSave}
                className="bg-linear-to-r from-pink-600 to-orange-600 text-white font-black hover:scale-[1.05] active:scale-[0.95] transition-all shadow-[0_10px_20px_-10px_rgba(219,39,119,0.5)] rounded-xl 
                opacity-50 grayscale-[0] dark:opacity-100 dark:grayscale-0"

              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t('authInformation.saveButton')}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-[#180F22] backdrop-blur-xl border-white/60 dark:border-white/5 shadow-sm rounded-2xl transition-all duration-300">
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
                <li>{t('authInformation.setupStep6')}</li>
              </ol>
              <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-[#3b3142] dark:bg-[#1e1627] px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">{t('authInformation.callbackLabel')}</p>
                <p className="text-sm font-medium break-all text-foreground">{callbackUrl}</p>
              </div>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="inline-block text-xs underline underline-offset-2 text-primary"
              >
                {t('authInformation.consoleLinkLabel')}
              </a>
              <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-[#3b3142] dark:bg-[#1e1627] px-3 py-2 text-sm text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">{t('authInformation.apiEnableTitle')}</p>
                <p>{t('authInformation.apiEnableHint')}</p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com"
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 text-primary"
                  >
                    {t('authInformation.enableCalendarApi')}
                  </a>
                  <a
                    href="https://console.cloud.google.com/apis/library/gmail.googleapis.com"
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 text-primary"
                  >
                    {t('authInformation.enableGmailApi')}
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
