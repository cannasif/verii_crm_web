import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { whatsappIntegrationApi } from '../api/whatsapp-integration.api';
import { WHATSAPP_LOGS_QUERY_KEY } from './useWhatsappLogsQuery';
import { WHATSAPP_STATUS_QUERY_KEY } from './useWhatsappStatusQuery';
import type {
  UpdateWhatsappIntegrationSettingsDto,
  WhatsappTestMessageDto,
} from '../types/whatsapp-integration.types';

export function useUpdateWhatsappSettingsMutation() {
  const { t } = useTranslation('whatsapp-integration');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateWhatsappIntegrationSettingsDto) => whatsappIntegrationApi.updateSettings(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: WHATSAPP_STATUS_QUERY_KEY });
      toast.success(t('settings.saveSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('settings.saveError'));
    },
  });
}

export function useWhatsappTestMessageMutation() {
  const { t } = useTranslation('whatsapp-integration');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: WhatsappTestMessageDto) => whatsappIntegrationApi.sendTestMessage(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: WHATSAPP_STATUS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: WHATSAPP_LOGS_QUERY_KEY });
      toast.success(t('test.sendSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('test.sendError'));
    },
  });
}
