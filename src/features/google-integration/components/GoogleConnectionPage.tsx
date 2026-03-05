import { type ReactElement, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useUIStore } from '@/stores/ui-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useGoogleStatusQuery } from '../hooks/useGoogleStatusQuery';
import {
  useGoogleAuthorizeMutation,
  useGoogleDisconnectMutation,
  useGoogleTestEventMutation,
} from '../hooks/useGoogleIntegrationMutations';

function formatDate(value?: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
}

export function GoogleConnectionPage(): ReactElement {
  const { t } = useTranslation(['google-integration', 'common']);
  const { setPageTitle } = useUIStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { data: status, isLoading, isFetching } = useGoogleStatusQuery();
  const authorizeMutation = useGoogleAuthorizeMutation();
  const disconnectMutation = useGoogleDisconnectMutation();
  const testEventMutation = useGoogleTestEventMutation();

  useEffect(() => {
    setPageTitle(t('page.connectionTitle'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  useEffect(() => {
    const connectedParam = searchParams.get('connected');
    if (!connectedParam) {
      return;
    }

    if (connectedParam === '1') {
      toast.success(t('connection.connectedSuccess'));
    } else {
      const errorMessage = searchParams.get('error');
      toast.error(errorMessage || t('connection.connectedError'));
    }

    navigate('/settings/integrations/google', { replace: true });
  }, [navigate, searchParams, t]);

  const isConnected = status?.isConnected === true;
  const isOAuthConfigured = status?.isOAuthConfigured === true;

  const scopesText = useMemo(() => {
    if (!status?.scopes) return '-';
    return status.scopes;
  }, [status?.scopes]);

  return (
    <div className="w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('page.connectionTitle')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('page.connectionDescription')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('connection.statusCardTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('common:loading')}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="font-medium">{t('connection.statusLabel')}</span>
                <Badge variant={isConnected ? 'default' : 'secondary'}>
                  {isConnected ? t('connection.connected') : t('connection.notConnected')}
                </Badge>
                {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{t('connection.googleEmailLabel')}</p>
                  <p className="font-medium break-words">{status?.googleEmail || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('connection.expiresAtLabel')}</p>
                  <p className="font-medium">{formatDate(status?.expiresAt)}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-muted-foreground">{t('connection.scopeLabel')}</p>
                  <p className="font-medium break-words">{scopesText}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {!isOAuthConfigured && (
                  <div className="w-full rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {t('connection.oauthNotConfiguredWarning')}
                  </div>
                )}
                {!isConnected ? (
                  <Button
                    onClick={() => authorizeMutation.mutate()}
                    disabled={authorizeMutation.isPending || !isOAuthConfigured}
                  >
                    {authorizeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {t('connection.connectButton')}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => testEventMutation.mutate()}
                      disabled={testEventMutation.isPending}
                    >
                      {testEventMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {t('connection.testEventButton')}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => disconnectMutation.mutate()}
                      disabled={disconnectMutation.isPending}
                    >
                      {disconnectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {t('connection.disconnectButton')}
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
