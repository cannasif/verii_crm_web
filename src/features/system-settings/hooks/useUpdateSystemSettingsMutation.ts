import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { systemSettingsApi } from '../api/systemSettingsApi';
import type { SystemSettingsDto, UpdateSystemSettingsDto } from '../types/systemSettings';
import { normalizeSystemSettings, useSystemSettingsStore } from '@/stores/system-settings-store';
import { DOCUMENT_FIELD_LABELS_QUERY_KEY } from '@/features/document-field-labels/hooks/useDocumentFieldLabels';

const SYSTEM_SETTINGS_QUERY_KEY = ['system-settings'] as const;

export function useUpdateSystemSettingsMutation() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const setSettings = useSystemSettingsStore((state) => state.setSettings);

  return useMutation<SystemSettingsDto, Error, UpdateSystemSettingsDto>({
    mutationFn: (data) => systemSettingsApi.update(data),
    onSuccess: (data) => {
      const normalized = normalizeSystemSettings(data);
      setSettings(normalized);
      queryClient.setQueryData(SYSTEM_SETTINGS_QUERY_KEY, normalized);
      void queryClient.invalidateQueries({ queryKey: DOCUMENT_FIELD_LABELS_QUERY_KEY });
      toast.success(t('systemSettings.SavedSuccessfully'));
    },
    onError: (error) => {
      toast.error(
        t(error.message, {
          defaultValue: error.message || t('common.UnexpectedError'),
        })
      );
    },
  });
}
