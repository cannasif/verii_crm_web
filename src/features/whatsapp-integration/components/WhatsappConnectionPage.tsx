import { type ReactElement, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useUIStore } from '@/stores/ui-store';
import { Loader2, MessageCircle, ShieldCheck } from 'lucide-react';
import { useWhatsappStatusQuery } from '../hooks/useWhatsappStatusQuery';
import {
  useUpdateWhatsappSettingsMutation,
  useWhatsappTestMessageMutation,
} from '../hooks/useWhatsappIntegrationMutations';

function formatDate(value?: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
}

export function WhatsappConnectionPage(): ReactElement {
  const { t } = useTranslation(['whatsapp-integration', 'common']);
  const { setPageTitle } = useUIStore();
  const { data: status, isLoading } = useWhatsappStatusQuery();
  const updateSettingsMutation = useUpdateWhatsappSettingsMutation();
  const testMessageMutation = useWhatsappTestMessageMutation();

  const [isEnabled, setIsEnabled] = useState(false);
  const [displayName, setDisplayName] = useState('WhatsApp');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [businessAccountId, setBusinessAccountId] = useState('');
  const [graphApiVersion, setGraphApiVersion] = useState('v23.0');
  const [verifyToken, setVerifyToken] = useState('');
  const [accessTokenPlain, setAccessTokenPlain] = useState('');
  const [appSecretPlain, setAppSecretPlain] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState(t('test.defaultMessage'));

  useEffect(() => {
    setPageTitle(t('page.connectionTitle'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  useEffect(() => {
    if (!status) return;
    setIsEnabled(status.isEnabled);
    setDisplayName(status.displayName || 'WhatsApp');
    setPhoneNumberId(status.phoneNumberId || '');
    setBusinessAccountId(status.businessAccountId || '');
    setGraphApiVersion(status.graphApiVersion || 'v23.0');
  }, [status]);

  const handleSave = () => {
    updateSettingsMutation.mutate({
      isEnabled,
      displayName,
      phoneNumberId,
      businessAccountId,
      graphApiVersion,
      verifyToken,
      accessTokenPlain: accessTokenPlain || null,
      appSecretPlain: appSecretPlain || null,
    });
  };

  const handleSendTest = () => {
    testMessageMutation.mutate({
      toPhoneNumber: testPhone,
      message: testMessage,
    });
  };

  const configured = status?.isConfigured === true;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{t('page.connectionTitle')}</h1>
        <p className="text-muted-foreground">{t('page.connectionDescription')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-white/60 bg-white/75 shadow-sm backdrop-blur-xl lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-emerald-600" />
                {t('settings.title')}
              </span>
              <Badge variant={configured ? 'default' : 'secondary'}>
                {configured ? t('settings.configured') : t('settings.notConfigured')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('common:loading')}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-4">
                  <div>
                    <p className="font-medium">{t('settings.enabled')}</p>
                    <p className="text-sm text-muted-foreground">{t('settings.enabledDescription')}</p>
                  </div>
                  <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('settings.displayName')}</Label>
                    <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.graphApiVersion')}</Label>
                    <Input value={graphApiVersion} onChange={(event) => setGraphApiVersion(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.phoneNumberId')}</Label>
                    <Input value={phoneNumberId} onChange={(event) => setPhoneNumberId(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.businessAccountId')}</Label>
                    <Input value={businessAccountId} onChange={(event) => setBusinessAccountId(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.verifyToken')}</Label>
                    <Input
                      value={verifyToken}
                      placeholder={status?.verifyTokenMasked || t('settings.keepCurrent')}
                      onChange={(event) => setVerifyToken(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.accessToken')}</Label>
                    <Input
                      type="password"
                      value={accessTokenPlain}
                      placeholder={status?.hasAccessToken ? t('settings.keepCurrent') : ''}
                      onChange={(event) => setAccessTokenPlain(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>{t('settings.appSecret')}</Label>
                    <Input
                      type="password"
                      value={appSecretPlain}
                      placeholder={status?.hasAppSecret ? t('settings.keepCurrent') : ''}
                      onChange={(event) => setAppSecretPlain(event.target.value)}
                    />
                  </div>
                </div>

                <Button onClick={handleSave} disabled={updateSettingsMutation.isPending} className="min-w-40">
                  {updateSettingsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t('settings.save')}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-emerald-100 bg-gradient-to-br from-emerald-50 to-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              {t('webhook.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground">{t('webhook.url')}</p>
              <p className="mt-1 break-all font-mono text-xs">{status?.webhookUrl || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('webhook.lastInbound')}</p>
              <p className="font-medium">{formatDate(status?.lastWebhookReceivedAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('webhook.lastOutbound')}</p>
              <p className="font-medium">{formatDate(status?.lastOutboundMessageAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-white/60 bg-white/75 shadow-sm backdrop-blur-xl">
        <CardHeader>
          <CardTitle>{t('test.title')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-[280px_1fr_auto] gap-4 items-end">
          <div className="space-y-2">
            <Label>{t('test.phone')}</Label>
            <Input value={testPhone} onChange={(event) => setTestPhone(event.target.value)} placeholder="905xxxxxxxxx" />
          </div>
          <div className="space-y-2">
            <Label>{t('test.message')}</Label>
            <Textarea value={testMessage} onChange={(event) => setTestMessage(event.target.value)} rows={2} />
          </div>
          <Button onClick={handleSendTest} disabled={!configured || testMessageMutation.isPending}>
            {testMessageMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('test.send')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
