import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouteError, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export function RouteErrorFallback(): ReactElement {
  const { t } = useTranslation('common');
  const error = useRouteError();
  const navigate = useNavigate();
  const isChunkError =
    error instanceof Error &&
    (error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Importing a module script failed'));

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h1 className="text-xl font-semibold">{t('common.routeError.title')}</h1>
      <p className="text-muted-foreground max-w-md">
        {isChunkError
          ? t('common.routeError.chunkError')
          : error instanceof Error
            ? error.message
            : t('common.routeError.unexpected') }
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
        >
          {t('common.routeError.refresh')}
        </Button>
        <Button onClick={() => navigate(-1)} variant="ghost">
          {t('common.routeError.goBack')}
        </Button>
      </div>
    </div>
  );
}
