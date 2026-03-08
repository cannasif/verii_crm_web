import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { outlookIntegrationApi } from '../api/outlook-integration.api';
import { OUTLOOK_STATUS_QUERY_KEY } from './useOutlookStatusQuery';

export function useOutlookAuthorizeMutation() {
  const { t } = useTranslation('outlook-integration');

  return useMutation({
    mutationFn: () => outlookIntegrationApi.getAuthorizeUrl(),
    onSuccess: (data) => {
      if (!data.url?.trim()) {
        toast.error(t('connection.connectError'));
        return;
      }

      window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast.error(error.message || t('connection.connectError'));
    },
  });
}

export function useOutlookDisconnectMutation() {
  const { t } = useTranslation('outlook-integration');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => outlookIntegrationApi.disconnect(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: OUTLOOK_STATUS_QUERY_KEY });
      toast.success(t('connection.disconnectSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('connection.disconnectError'));
    },
  });
}
