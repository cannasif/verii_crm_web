import { type ReactElement, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { usePowerbiConfiguration, useCreatePowerbiConfiguration, useUpdatePowerbiConfiguration, useDeletePowerbiConfiguration } from '../hooks/usePowerbiConfiguration';
import { PowerbiConfigurationForm } from './PowerbiConfigurationForm';
import type { PowerBIConfigurationFormSchema } from '../types/powerbiConfiguration.types';
import { Loader2, BarChart2 } from 'lucide-react';

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
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-pink-100 dark:bg-white/5 border border-slate-300 dark:border-white/20">
            <Loader2 className="h-8 w-8 animate-spin text-pink-600 dark:text-pink-400" />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-pink-100 dark:bg-white/5 shadow-inner border border-slate-300 dark:border-white/20 relative overflow-hidden group">
            <div className="absolute inset-0 bg-linear-to-br from-pink-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <BarChart2 className="h-7 w-7 text-pink-600 dark:text-pink-400 relative z-10" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
              {t('powerbiConfiguration.pageTitle')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
              {t('powerbiConfiguration.pageDescription')}
            </p>
          </div>
        </div>
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
