import { type ReactElement, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { MailSettingsForm } from '../components/MailSettingsForm';
import { useSmtpSettingsQuery } from '../hooks/useSmtpSettingsQuery';
import { useUpdateSmtpSettingsMutation } from '../hooks/useUpdateSmtpSettingsMutation';
import type { SmtpSettingsFormSchema } from '../types/smtpSettings';

export function MailSettingsPage(): ReactElement {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const { data, isLoading } = useSmtpSettingsQuery();
  const updateMutation = useUpdateSmtpSettingsMutation();

  useEffect(() => {
    setPageTitle(t('mailSettings.PageTitle'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  const handleSubmit = async (values: SmtpSettingsFormSchema): Promise<void> => {
    await updateMutation.mutateAsync({
      host: values.host,
      port: values.port,
      enableSsl: values.enableSsl,
      username: values.username,
      ...(values.password ? { password: values.password } : {}),
      fromEmail: values.fromEmail,
      fromName: values.fromName,
      timeout: values.timeout,
    });
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
          {t('mailSettings.PageTitle')}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm font-medium transition-colors">
          {t('mailSettings.PageDescription')}
        </p>
      </div>
      <MailSettingsForm
        data={data}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
}
