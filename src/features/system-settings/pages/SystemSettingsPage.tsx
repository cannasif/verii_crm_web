import { type ReactElement, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { SystemSettingsForm } from '../components/SystemSettingsForm';
import { useSystemSettingsQuery } from '../hooks/useSystemSettingsQuery';
import { useUpdateSystemSettingsMutation } from '../hooks/useUpdateSystemSettingsMutation';
import type { SystemSettingsFormSchema, UpdateSystemSettingsDto } from '../types/systemSettings';
import { useLineFormUiPreferencesStore } from '@/stores/line-form-ui-preferences-store';

export function SystemSettingsPage(): ReactElement {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const { data, isLoading } = useSystemSettingsQuery();
  const updateMutation = useUpdateSystemSettingsMutation();

  useEffect(() => {
    setPageTitle(t('systemSettings.PageTitle'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  const handleSubmit = async (values: SystemSettingsFormSchema): Promise<void> => {
    const payload: UpdateSystemSettingsDto = {
      numberFormat: values.numberFormat,
      decimalPlaces: values.decimalPlaces,
      restrictCustomersBySalesRepMatch: values.restrictCustomersBySalesRepMatch,
    };

    await updateMutation.mutateAsync(payload);

    const { setShowDescriptionFieldsSection, setCustomDescriptionLabel1, setCustomDescriptionLabel2, setCustomDescriptionLabel3 } =
      useLineFormUiPreferencesStore.getState();
    setShowDescriptionFieldsSection(values.showDescriptionFieldsSection);
    setCustomDescriptionLabel1(values.customDescriptionLabel1);
    setCustomDescriptionLabel2(values.customDescriptionLabel2);
    setCustomDescriptionLabel3(values.customDescriptionLabel3);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('systemSettings.PageTitle')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('systemSettings.PageDescription')}</p>
      </div>
      <SystemSettingsForm
        data={data}
        isLoading={isLoading}
        isSubmitting={updateMutation.isPending}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
