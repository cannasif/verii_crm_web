import { useQuery } from '@tanstack/react-query';
import { whatsappIntegrationApi } from '../api/whatsapp-integration.api';

export const WHATSAPP_STATUS_QUERY_KEY = ['whatsapp-integration', 'status'] as const;

export function useWhatsappStatusQuery() {
  return useQuery({
    queryKey: WHATSAPP_STATUS_QUERY_KEY,
    queryFn: () => whatsappIntegrationApi.getStatus(),
    staleTime: 30 * 1000,
  });
}
