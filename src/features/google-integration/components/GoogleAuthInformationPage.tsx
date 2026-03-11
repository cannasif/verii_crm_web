import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
      <div className="w-full max-w-3xl">
        <Card>
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
    <div className="w-full max-w-3xl space-y-6">
      {!canManage && (
        <Card>
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

      <Card>
        <CardHeader>
          <CardTitle>{t('authInformation.cardTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {settingsQuery.isError && (
            <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {t('authInformation.loadError')}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="google-client-id">{t('authInformation.clientIdLabel')}</Label>
            <Input
              id="google-client-id"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder={t('authInformation.clientIdPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="google-client-secret">{t('authInformation.clientSecretLabel')}</Label>
            <Input
              id="google-client-secret"
              type="password"
              value={clientSecretPlain}
              onChange={(e) => setClientSecretPlain(e.target.value)}
              placeholder={t('authInformation.clientSecretPlaceholder')}
            />
            <p className="text-xs text-muted-foreground">
              {t('authInformation.currentSecretLabel')}: {maskedSecret || '-'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="google-redirect-uri">{t('authInformation.redirectUriLabel')}</Label>
            <Input
              id="google-redirect-uri"
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
              readOnly
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="google-scopes">{t('authInformation.scopesLabel')}</Label>
            <Input
              id="google-scopes"
              value={scopes}
              onChange={(e) => setScopes(e.target.value)}
              readOnly
              className="bg-muted"
            />
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

          <Button onClick={onSave} disabled={saveMutation.isPending || !canSave}>
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t('authInformation.saveButton')}
          </Button>
        </CardContent>
      </Card>

      <Card>
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
          <div className="rounded-md border bg-muted/40 px-3 py-2">
            <p className="text-xs font-medium text-foreground">{t('authInformation.callbackLabel')}</p>
            <p className="text-xs break-all">{callbackUrl}</p>
          </div>
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noreferrer"
            className="inline-block text-xs underline underline-offset-2 text-primary"
          >
            {t('authInformation.consoleLinkLabel')}
          </a>
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-1">
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
