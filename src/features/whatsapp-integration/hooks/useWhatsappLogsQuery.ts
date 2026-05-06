import { useQuery } from '@tanstack/react-query';
import type { PagedParams } from '@/types/api';
import { whatsappIntegrationApi } from '../api/whatsapp-integration.api';

export const WHATSAPP_LOGS_QUERY_KEY = ['whatsapp-integration', 'logs'] as const;

type WhatsappLogsParams = Omit<PagedParams, 'filters'> & {
  filters?: PagedParams['filters'] | Record<string, unknown>;
  errorsOnly?: boolean;
  direction?: string;
};

export function useWhatsappLogsQuery(params: WhatsappLogsParams) {
  return useQuery({
    queryKey: [...WHATSAPP_LOGS_QUERY_KEY, params],
    queryFn: () => whatsappIntegrationApi.getLogs(params),
    staleTime: 15 * 1000,
  });
}
