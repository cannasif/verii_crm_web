import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { smtpSettingsApi } from '../api/smtpSettingsApi';
import type { UpdateSmtpSettingsDto } from '../types/smtpSettings';
import type { SmtpSettingsDto } from '../types/smtpSettings';

const SMTP_SETTINGS_QUERY_KEY = ['smtp-settings'] as const;

export function useUpdateSmtpSettingsMutation() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation<SmtpSettingsDto, Error, UpdateSmtpSettingsDto>({
    mutationFn: (data: UpdateSmtpSettingsDto) => smtpSettingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SMTP_SETTINGS_QUERY_KEY });
      toast.success(t('mailSettings.SavedSuccessfully'));
    },
    onError: (error: Error) => {
      toast.error(t(error.message) || error.message || t('common.UnexpectedError'));
    },
  });
}
