import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { systemSettingsApi } from '../api/systemSettingsApi';
import type { SystemSettingsDto, UpdateSystemSettingsDto } from '../types/systemSettings';

const SYSTEM_SETTINGS_QUERY_KEY = ['system-settings'] as const;

export function useUpdateSystemSettingsMutation() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation<SystemSettingsDto, Error, UpdateSystemSettingsDto>({
    mutationFn: (data) => systemSettingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SYSTEM_SETTINGS_QUERY_KEY });
      toast.success(t('systemSettings.SavedSuccessfully'));
    },
    onError: (error) => {
      toast.error(t(error.message) || error.message || t('common.UnexpectedError'));
    },
  });
}
