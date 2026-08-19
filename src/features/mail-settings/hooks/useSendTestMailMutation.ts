import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { smtpSettingsApi } from '../api/smtpSettingsApi';
import { resolveMailSettingsErrorMessage } from '../utils/resolveMailSettingsErrorMessage';

interface SendTestMailVars {
  to?: string;
}

export function useSendTestMailMutation() {
  const { t } = useTranslation();

  return useMutation<boolean, Error, SendTestMailVars>({
    mutationFn: (vars: SendTestMailVars) => smtpSettingsApi.sendTest(vars.to),
    onSuccess: () => {
      toast.success(t('mailSettings.TestMail.Success'));
    },
    onError: (error: Error) => {
      toast.error(resolveMailSettingsErrorMessage(error, t, 'common.UnexpectedError'));
    },
  });
}

