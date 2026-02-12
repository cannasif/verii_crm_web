import { type ReactElement, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { usePowerbiConfiguration, useCreatePowerbiConfiguration, useUpdatePowerbiConfiguration, useDeletePowerbiConfiguration } from '../hooks/usePowerbiConfiguration';
import { PowerbiConfigurationForm } from './PowerbiConfigurationForm';
import type { PowerBIConfigurationFormSchema } from '../types/powerbiConfiguration.types';
import { Loader2 } from 'lucide-react';

export function PowerbiConfigurationPage(): ReactElement {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const { data: configuration, isLoading } = usePowerbiConfiguration();
  const createMutation = useCreatePowerbiConfiguration();
  const updateMutation = useUpdatePowerbiConfiguration();
  const deleteMutation = useDeletePowerbiConfiguration();

  useEffect(() => {
    setPageTitle(t('powerbiConfiguration.pageTitle'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  const handleSubmit = (data: PowerBIConfigurationFormSchema): void => {
    const payload = {
      tenantId: data.tenantId,
      clientId: data.clientId,
      workspaceId: data.workspaceId,
      apiBaseUrl: data.apiBaseUrl || undefined,
      scope: data.scope || undefined,
    };
    if (configuration) {
      updateMutation.mutate({ id: configuration.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: number): void => {
    deleteMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('powerbiConfiguration.pageTitle')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('powerbiConfiguration.pageDescription')}
        </p>
      </div>
      <PowerbiConfigurationForm
        configuration={configuration ?? null}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
