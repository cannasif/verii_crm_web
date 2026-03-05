import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { googleIntegrationApi } from '../api/google-integration.api';
import { GOOGLE_STATUS_QUERY_KEY } from './useGoogleStatusQuery';
import type { SendGoogleCustomerMailDto } from '../types/google-integration.types';

export function useGoogleAuthorizeMutation() {
  const { t } = useTranslation('google-integration');

  return useMutation({
    mutationFn: () => googleIntegrationApi.getAuthorizeUrl(),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast.error(error.message || t('connection.connectError'));
    },
  });
}

export function useGoogleDisconnectMutation() {
  const { t } = useTranslation('google-integration');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => googleIntegrationApi.disconnect(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: GOOGLE_STATUS_QUERY_KEY });
      toast.success(t('connection.disconnectSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('connection.disconnectError'));
    },
  });
}

export function useGoogleTestEventMutation() {
  const { t } = useTranslation('google-integration');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => googleIntegrationApi.createTestEvent(),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: GOOGLE_STATUS_QUERY_KEY });
      toast.success(t('connection.testEventSuccess', { eventId: data.eventId }));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('connection.testEventError'));
    },
  });
}

export function useSendGoogleCustomerMailMutation() {
  const { t } = useTranslation('google-integration');

  return useMutation({
    mutationFn: (payload: SendGoogleCustomerMailDto) => googleIntegrationApi.sendCustomerMail(payload),
    onSuccess: () => {
      toast.success(t('mailDialog.sendSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('mailDialog.sendError'));
    },
  });
}
