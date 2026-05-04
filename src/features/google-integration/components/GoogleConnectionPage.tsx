import { type ReactElement, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useUIStore } from '@/stores/ui-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('page.connectionTitle')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('page.connectionDescription')}
        </p>
      </div>

      <Card className="bg-white/70 dark:bg-[#180F22] backdrop-blur-xl border-white/60 dark:border-white/5 shadow-sm rounded-2xl transition-all duration-300">
        <CardHeader className="flex flex-row items-center space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            {t('connection.statusCardTitle')}:
            {isLoading ? (
              <span className="flex items-center gap-2 text-sm text-muted-foreground ml-2 font-normal">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('common:loading')}
              </span>
            ) : (
              <>
                <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-[#3b3142] dark:bg-[#26122b] px-2 py-1 text-sm font-medium ml-1 text-foreground">
                  {isConnected ? t('connection.connected') : t('connection.notConnected')}
                </div>
                {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isLoading && (
            <>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1.5">{t('connection.googleEmailLabel')}</p>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-[#3b3142] dark:bg-[#1e1627] px-3 py-2">
                    <p className="font-medium break-words">{status?.googleEmail || '-'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1.5">{t('connection.expiresAtLabel')}</p>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-[#3b3142] dark:bg-[#1e1627] px-3 py-2">
                    <p className="font-medium">{formatDate(status?.expiresAt)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1.5">{t('connection.scopeLabel')}</p>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-[#3b3142] dark:bg-[#1e1627] px-3 py-2">
                    <p className="font-medium break-words">{scopesText}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                {!isOAuthConfigured && (
                  <div className="inline-flex self-start rounded-lg border border-pink-200 bg-pink-50 dark:border-[#4C3D68] dark:bg-[#2D1B4E] px-3 py-2 text-sm text-pink-600 dark:text-[#FB64B6] ">
                    {t('connection.oauthNotConfiguredWarning')}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {!isConnected ? (
                    <Button
                      onClick={() => authorizeMutation.mutate()}

                      className="bg-linear-to-r from-pink-600 to-orange-600 text-white font-black hover:scale-[1.05] active:scale-[0.95] transition-all shadow-[0_10px_20px_-10px_rgba(219,39,119,0.5)] rounded-xl opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
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
                        className="bg-linear-to-r from-pink-600 to-orange-600 text-white font-black hover:scale-[1.05] active:scale-[0.95] transition-all shadow-[0_10px_20px_-10px_rgba(219,39,119,0.5)] rounded-xl opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
                      >
                        {testEventMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        {t('connection.testEventButton')}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => disconnectMutation.mutate()}
                        disabled={disconnectMutation.isPending}
                        className="bg-linear-to-r from-pink-600 to-orange-600 text-white font-black hover:scale-[1.05] active:scale-[0.95] transition-all shadow-[0_10px_20px_-10px_rgba(219,39,119,0.5)] rounded-xl opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
                      >
                        {disconnectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        {t('connection.disconnectButton')}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
