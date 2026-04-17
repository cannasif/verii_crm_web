import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { systemSettingsApi } from '../api/systemSettingsApi';
import type { SystemSettingsDto, UpdateSystemSettingsDto } from '../types/systemSettings';
import { useSystemSettingsStore } from '@/stores/system-settings-store';

const SYSTEM_SETTINGS_QUERY_KEY = ['system-settings'] as const;

export function useUpdateSystemSettingsMutation() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const setSettings = useSystemSettingsStore((state) => state.setSettings);

  return useMutation<SystemSettingsDto, Error, UpdateSystemSettingsDto>({
    mutationFn: (data) => systemSettingsApi.update(data),
    onSuccess: (data) => {
      setSettings(data);
      queryClient.setQueryData(SYSTEM_SETTINGS_QUERY_KEY, data);
      toast.success(t('systemSettings.SavedSuccessfully'));
    },
    onError: (error) => {
      toast.error(t(error.message) || error.message || t('common.UnexpectedError'));
    },
  });
}
